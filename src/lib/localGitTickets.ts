import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type LocalGitTicketRecord = {
  ticket_id: string;
  commit_sha: string;
  ticket_url: string;
  commit_message: string;
  files_changed: string[];
  code_diff: string;
  source: "local";
};

function buildCommitUrl(sha: string) {
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (owner && repo && !owner.startsWith("your-") && !repo.startsWith("your-")) {
    return `https://github.com/${owner}/${repo}/commit/${sha}`;
  }

  return `https://example.local/commit/${sha}`;
}

export async function findLocalGitTicketById(
  ticketId: string,
): Promise<LocalGitTicketRecord | null> {
  const tickets = await findLocalGitTicketsById(ticketId);
  return tickets[0] ?? null;
}

async function buildLocalTicketRecord(
  ticketId: string,
  sha: string,
  subject: string,
): Promise<LocalGitTicketRecord> {
  const [{ stdout: filesStdout }, { stdout: diffStdout }] = await Promise.all([
    execFileAsync(
      "git",
      ["show", "--name-only", "--pretty=format:", sha],
      { cwd: process.cwd() },
    ),
    execFileAsync(
      "git",
      ["show", "--no-color", "--pretty=format:", "--unified=3", sha],
      { cwd: process.cwd() },
    ),
  ]);

  const filesChanged = filesStdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    ticket_id: ticketId,
    commit_sha: sha,
    ticket_url: buildCommitUrl(sha),
    commit_message: subject,
    files_changed: filesChanged,
    code_diff: diffStdout.trim(),
    source: "local",
  };
}

export async function findLocalGitTicketsById(
  ticketId: string,
): Promise<LocalGitTicketRecord[]> {
  const ticketPattern = ticketId.toUpperCase();

  try {
    const { stdout } = await execFileAsync(
      "git",
      ["log", "--pretty=format:%H\t%s", "-n", "200"],
      { cwd: process.cwd() },
    );

    const matchLines = stdout
      .split("\n")
      .filter((line) => line.toUpperCase().includes(ticketPattern))
      .slice(0, 8);

    if (matchLines.length === 0) {
      return [];
    }

    const records = await Promise.all(
      matchLines.map((line) => {
        const [sha, ...subjectParts] = line.split("\t");
        const subject = subjectParts.join("\t").trim();
        return buildLocalTicketRecord(ticketId, sha, subject);
      }),
    );

    return records;
  } catch {
    return [];
  }
}
