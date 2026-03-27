"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import styles from "./page.module.css";

type Ticket = {
  ticket_id: string;
  commit_sha: string;
  ticket_url: string;
  commit_message: string;
  files_changed: string[];
  source: "github" | "local" | "mock";
};

type TicketMatch = {
  ticket_id: string;
  commit_sha: string;
  ticket_url: string;
  commit_message: string;
  source: "github" | "local" | "mock";
};

type Analysis = {
  problem: string;
  rootCause: string;
  fixApplied: string;
  summary: string;
  issueType?: string;
  fixHighlights?: string[];
};

type AnalyzeResponse = {
  ticket: Ticket;
  matches: TicketMatch[];
  analysis: Analysis;
};

const demoTicketIds = [
  "OTHK-221",
  "PAY-902",
  "CFG-114",
  "REAL-101",
  "REAL-102",
  "REAL-103",
  "REAL-104",
  "REAL-105",
  "DEMO-777",
];

export default function Home() {
  const [ticketId, setTicketId] = useState("OTHK-221");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [selectedTicketUrl, setSelectedTicketUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedId = useMemo(() => ticketId.trim().toUpperCase(), [ticketId]);

  async function analyzeTicket(selectedUrl?: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId: normalizedId,
          selectedTicketUrl: selectedUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Unable to analyze this ticket.");
        return;
      }

      const nextResult = data as AnalyzeResponse;
      setResult(nextResult);
      setSelectedTicketUrl(nextResult.ticket.ticket_url);
    } catch {
      setError("Network error while analyzing ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedId) {
      setError("Please enter a ticket ID.");
      setResult(null);
      return;
    }

    setResult(null);
    setSelectedTicketUrl(null);
    await analyzeTicket();
  }

  async function onCommitSelectionChange(event: ChangeEvent<HTMLSelectElement>) {
    const selectedUrl = event.target.value;
    setSelectedTicketUrl(selectedUrl);
    await analyzeTicket(selectedUrl);
  }

  return (
    <main className={styles.page}>
      <section className={styles.heroCard}>
        <div className={styles.topline}>
          <p className={styles.kicker}>AI Hackathon Console</p>
          <span className={styles.livePill}>Live Analysis</span>
        </div>
        <h1>AI Ticket Fix Explainer</h1>
        <p className={styles.subtitle}>
          Enter a ticket ID and instantly understand what was fixed, where, and
          why.
        </p>

        <form onSubmit={onSubmit} className={styles.inputRow}>
          <input
            value={ticketId}
            onChange={(event) => setTicketId(event.target.value)}
            placeholder="e.g. OTHK-221"
            className={styles.input}
            aria-label="Ticket ID"
          />
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Ticket"}
          </button>
        </form>

        <div className={styles.chips}>
          {demoTicketIds.map((id) => (
            <button
              key={id}
              type="button"
              className={styles.chip}
              onClick={() => setTicketId(id)}
            >
              {id}
            </button>
          ))}
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        {result && result.matches.length > 1 ? (
          <div className={styles.selectWrap}>
            <label htmlFor="commit-select" className={styles.metaLabel}>
              Matching Commits ({result.matches.length})
            </label>
            <select
              id="commit-select"
              className={styles.select}
              value={selectedTicketUrl ?? result.ticket.ticket_url}
              onChange={onCommitSelectionChange}
              disabled={loading}
            >
              {result.matches.map((match) => (
                <option key={match.ticket_url} value={match.ticket_url}>
                  [{match.source}] {match.commit_sha.slice(0, 7)} - {match.commit_message}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </section>

      {result ? (
        <section className={styles.resultGrid}>
          <article className={`${styles.card} ${styles.detailsCard}`}>
            <h2>Ticket Details</h2>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Ticket ID</span>
              <span className={styles.metaValue}>{result.ticket.ticket_id}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Commit SHA</span>
              <span className={styles.metaValue}>{result.ticket.commit_sha}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Ticket URL</span>
              <a
                href={result.ticket.ticket_url}
                target="_blank"
                rel="noreferrer"
                className={styles.link}
              >
                Open Ticket
              </a>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Data Source</span>
              <span className={styles.sourceTag}>{result.ticket.source}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Commit Message</span>
              <span className={styles.metaValue}>
                {result.ticket.commit_message}
              </span>
            </div>
            {result.analysis.issueType ? (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Issue Type</span>
                <span className={styles.badge}>{result.analysis.issueType}</span>
              </div>
            ) : null}
          </article>

          <article className={styles.card}>
            <h3>Problem</h3>
            <p>{result.analysis.problem}</p>
          </article>

          <article className={styles.card}>
            <h3>Root Cause</h3>
            <p>{result.analysis.rootCause}</p>
          </article>

          <article className={styles.card}>
            <h3>Fix Applied</h3>
            <p>{result.analysis.fixApplied}</p>
            {result.analysis.fixHighlights &&
            result.analysis.fixHighlights.length > 0 ? (
              <div className={styles.fixEvidenceBox}>
                <h4>What We Actually Changed</h4>
                <ul className={styles.fixEvidenceList}>
                  {result.analysis.fixHighlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>

          <article className={styles.card}>
            <h3>Summary</h3>
            <p>{result.analysis.summary}</p>
          </article>

          <article className={styles.card}>
            <h3>Files Changed</h3>
            <ul className={styles.fileList}>
              {result.ticket.files_changed.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          </article>
        </section>
      ) : null}
    </main>
  );
}
