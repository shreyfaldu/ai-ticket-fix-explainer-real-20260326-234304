export type GitHubTicketRecord = {
  ticket_id: string;
  commit_sha: string;
  ticket_url: string;
  commit_message: string;
  files_changed: string[];
  code_diff: string;
  source: "github";
};

type GitHubCommitListItem = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
  };
};

type GitHubCommitSearchResponse = {
  items?: GitHubCommitListItem[];
};

type GitHubCommitDetail = {
  html_url: string;
  commit: {
    message: string;
  };
  files?: Array<{
    filename: string;
    patch?: string;
  }>;
};

type GitHubSettings = {
  owner: string;
  repo: string;
  token: string;
};

function getGitHubSettings(): GitHubSettings | null {
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();

  const hasPlaceholders =
    owner?.startsWith("your-") ||
    repo?.startsWith("your-") ||
    token?.startsWith("your_");

  if (!owner || !repo || !token || hasPlaceholders) {
    return null;
  }

  return { owner, repo, token };
}

function makeHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function findGitHubTicketById(
  ticketId: string,
): Promise<GitHubTicketRecord | null> {
  const tickets = await findGitHubTicketsById(ticketId);
  return tickets[0] ?? null;
}

async function buildTicketRecord(
  ticketId: string,
  matchedCommit: GitHubCommitListItem,
  settings: GitHubSettings,
): Promise<GitHubTicketRecord | null> {
  const detailUrl = `https://api.github.com/repos/${settings.owner}/${settings.repo}/commits/${matchedCommit.sha}`;
  const detailResponse = await fetch(detailUrl, {
    headers: makeHeaders(settings.token),
    cache: "no-store",
  });

  if (!detailResponse.ok) {
    return null;
  }

  const detail = (await detailResponse.json()) as GitHubCommitDetail;
  const filesChanged = (detail.files ?? []).map((file) => file.filename);

  const diffSections = (detail.files ?? []).map((file) => {
    const patch = file.patch ?? "(No patch available: binary or large file)";
    return `--- ${file.filename}\n${patch}`;
  });

  const commitMessage =
    detail.commit.message.split("\n")[0] ?? detail.commit.message;

  return {
    ticket_id: ticketId,
    commit_sha: matchedCommit.sha,
    ticket_url: detail.html_url || matchedCommit.html_url,
    commit_message: commitMessage,
    files_changed: filesChanged,
    code_diff: diffSections.join("\n\n"),
    source: "github",
  };
}

export async function findGitHubTicketsById(
  ticketId: string,
): Promise<GitHubTicketRecord[]> {
  const settings = getGitHubSettings();
  if (!settings) {
    return [];
  }

  const ticketPattern = ticketId.toUpperCase();
  const encodedQuery = encodeURIComponent(
    `${ticketPattern} repo:${settings.owner}/${settings.repo}`,
  );
  const searchUrl = `https://api.github.com/search/commits?q=${encodedQuery}&per_page=5`;

  const searchResponse = await fetch(searchUrl, {
    headers: makeHeaders(settings.token),
    cache: "no-store",
  });

  let matchedCommits: GitHubCommitListItem[] = [];
  if (searchResponse.ok) {
    const searchPayload =
      (await searchResponse.json()) as GitHubCommitSearchResponse;
    matchedCommits = searchPayload.items ?? [];
  }

  if (matchedCommits.length === 0) {
    const listUrl = `https://api.github.com/repos/${settings.owner}/${settings.repo}/commits?per_page=100`;

    const listResponse = await fetch(listUrl, {
      headers: makeHeaders(settings.token),
      cache: "no-store",
    });

    if (!listResponse.ok) {
      return [];
    }

    const commitList = (await listResponse.json()) as GitHubCommitListItem[];
    matchedCommits = commitList.filter((item) =>
      item.commit.message.toUpperCase().includes(ticketPattern),
    );
  }

  if (matchedCommits.length === 0) {
    return [];
  }

  const uniqueMatches = Array.from(
    new Map(matchedCommits.map((item) => [item.sha, item])).values(),
  ).slice(0, 8);

  const resolvedTickets = await Promise.all(
    uniqueMatches.map((commit) => buildTicketRecord(ticketId, commit, settings)),
  );

  return resolvedTickets.filter((ticket) => ticket !== null);
}
