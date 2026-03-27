type FallbackInput = {
  commitMessage: string;
  codeDiff: string;
};

export type TicketAnalysis = {
  problem: string;
  rootCause: string;
  fixApplied: string;
  summary: string;
  issueType?: string;
  confidence?: string;
  fixHighlights?: string[];
};

function detectIssueType(commitMessage: string, codeDiff: string) {
  const combined = `${commitMessage} ${codeDiff}`.toLowerCase();
  if (combined.includes("fix") || combined.includes("bug") || combined.includes("error")) {
    return "bug";
  }
  if (combined.includes("feature") || combined.includes("support")) {
    return "feature";
  }
  if (combined.includes("config") || combined.includes("env") || combined.includes("setting")) {
    return "config";
  }
  return "improvement";
}

export function generateFallbackAnalysis({
  commitMessage,
  codeDiff,
}: FallbackInput): TicketAnalysis {
  const issueType = detectIssueType(commitMessage, codeDiff);
  const addedLines = codeDiff
    .split("\n")
    .filter((line) => line.trim().startsWith("+"))
    .slice(0, 4)
    .map((line) => line.replace(/^\+\s?/, ""));

  const removedLines = codeDiff
    .split("\n")
    .filter((line) => line.trim().startsWith("-"))
    .slice(0, 3)
    .map((line) => line.replace(/^-\s?/, ""));

  const confidence =
    addedLines.length + removedLines.length >= 4 ? "high" : "medium";

  return {
    problem:
      "The ticket addresses a reliability issue observed in production behavior, as described by the commit message.",
    rootCause:
      removedLines.length > 0
        ? `The previous implementation relied on fragile logic such as: ${removedLines.join(" | ")}.`
        : "The previous implementation did not include enough safeguards for edge-case handling.",
    fixApplied:
      addedLines.length > 0
        ? `The fix introduces safer flow and validation steps, including: ${addedLines.join(" | ")}.`
        : "The fix adds defensive checks and improves state handling in the modified code path.",
    summary:
      `In short, this ${issueType} update improves stability by replacing brittle behavior with explicit checks and safer control flow.`,
    issueType,
    confidence,
    fixHighlights: addedLines,
  };
}