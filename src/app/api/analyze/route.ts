import { NextRequest, NextResponse } from "next/server";
import { findTicketById } from "@/data/mockTickets";
import { findGitHubTicketsById } from "@/lib/githubTickets";
import { findLocalGitTicketsById } from "@/lib/localGitTickets";
import {
  generateFallbackAnalysis,
  type TicketAnalysis,
} from "@/lib/fallbackAnalysis";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const basePrompt = `You are a senior software developer.

Analyze the following commit and code diff.

Return:

* Problem Description
* Root Cause
* Fix Explanation
* Summary
* Fix Highlights (3-6 bullet points with concrete code-level changes)`;

function extractAddedLineHighlights(codeDiff: string) {
  return codeDiff
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.startsWith("+") &&
        !line.startsWith("+++") &&
        line.length > 3 &&
        !line.startsWith("+@@"),
    )
    .map((line) => line.replace(/^\+\s?/, ""))
    .slice(0, 6);
}

function normalizeAnalysis(
  analysis: TicketAnalysis | null,
  codeDiff: string,
): TicketAnalysis | null {
  if (!analysis) {
    return null;
  }

  const fallbackHighlights = extractAddedLineHighlights(codeDiff);
  const fixHighlights =
    analysis.fixHighlights && analysis.fixHighlights.length > 0
      ? analysis.fixHighlights.slice(0, 6)
      : fallbackHighlights;

  return {
    ...analysis,
    fixHighlights,
  };
}

function extractJsonObject(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]) as TicketAnalysis;
  } catch {
    return null;
  }
}

async function analyzeWithAI(commitMessage: string, codeDiff: string) {
  const prompt = `${basePrompt}

Commit Message:
${commitMessage}

Code Diff:
${codeDiff}`;

  const result = await analyzeWithGemini(prompt);
  return normalizeAnalysis(result, codeDiff);
}

async function analyzeWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith("your-")) {
    return null;
  }

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Return valid JSON only with keys: problem, rootCause, fixApplied, summary, issueType, fixHighlights. " +
                "`fixApplied` must clearly state what was changed in code, and `fixHighlights` must be an array of concise concrete changes taken from diff lines.\n\n" +
                prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GeminiResponse;
  const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    return null;
  }

  return extractJsonObject(content);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    ticketId?: string;
    selectedTicketUrl?: string;
  };
  const ticketId = body.ticketId?.trim().toUpperCase();
  const selectedTicketUrl = body.selectedTicketUrl?.trim();

  if (!ticketId) {
    return NextResponse.json(
      { error: "Ticket ID is required." },
      { status: 400 },
    );
  }

  const githubTickets = await findGitHubTicketsById(ticketId);
  const localTickets =
    githubTickets.length > 0 ? [] : await findLocalGitTicketsById(ticketId);
  const mockTicket = findTicketById(ticketId);

  const matches = [
    ...githubTickets,
    ...localTickets,
    ...(mockTicket ? [mockTicket] : []),
  ];

  const ticket =
    matches.find((entry) => entry.ticket_url === selectedTicketUrl) ??
    matches[0];

  if (!ticket) {
    return NextResponse.json(
      {
        error:
          `No ticket found for ID ${ticketId}. ` +
          "Checked GitHub commits, local git commits, and local mock tickets.",
      },
      { status: 404 },
    );
  }

  const aiResult = await analyzeWithAI(ticket.commit_message, ticket.code_diff);
  const analysis =
    aiResult ??
    generateFallbackAnalysis({
      commitMessage: ticket.commit_message,
      codeDiff: ticket.code_diff,
    });

  return NextResponse.json({
    ticket: {
      ticket_id: ticket.ticket_id,
      commit_sha: "commit_sha" in ticket ? ticket.commit_sha : "mock",
      ticket_url: ticket.ticket_url,
      commit_message: ticket.commit_message,
      files_changed: ticket.files_changed,
      source: "source" in ticket ? ticket.source : "mock",
    },
    matches: matches.map((entry) => ({
      ticket_id: entry.ticket_id,
      commit_sha: "commit_sha" in entry ? entry.commit_sha : "mock",
      ticket_url: entry.ticket_url,
      commit_message: entry.commit_message,
      source: "source" in entry ? entry.source : "mock",
    })),
    analysis,
  });
}