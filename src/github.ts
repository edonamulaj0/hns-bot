export interface GitHubPushEvent {
  type: "PushEvent";
  created_at: string;
  payload: {
    commits?: Array<{ message: string }>;
    size?: number;
  };
}

export interface GitHubPREvent {
  type: "PullRequestEvent";
  created_at: string;
  payload: {
    action: string;
    pull_request?: { merged: boolean; title: string };
  };
}

export type GitHubEvent =
  | GitHubPushEvent
  | GitHubPREvent
  | { type: string; created_at: string; payload: unknown };

export interface PulseResult {
  commits: number;
  prsOpened: number;
  prsMerged: number;
  /** Code reviews in the month (GraphQL viewer path only). */
  prReviews?: number;
  xpEarned: number;
  repoCount: number;
  /** How activity was counted (for embed footers / debugging). */
  source: "search" | "events" | "viewer";
}

/** Raw XP from pulse formula (before cap). Matches viewer vs public weighting. */
export function computePulseRawXp(p: PulseResult): number {
  if (p.source === "viewer") {
    return p.commits + p.prsOpened * 3 + (p.prReviews ?? 0) * 2;
  }
  return p.commits + p.prsOpened * 3 + p.prsMerged * 5;
}

/** Thrown when GitHub REST returns an error (rate limit, auth, etc.). */
export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly bodySnippet?: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

/** Caps monthly pulse XP from GitHub activity. */
export const PULSE_XP_CAP = 100;

const MAX_EVENT_PAGES = 10;

export function extractGithubUsername(githubUrl: string | null | undefined): string | null {
  if (!githubUrl) return null;
  const raw = githubUrl.trim();
  if (!raw) return null;
  const match = raw.match(/github\.com\/([^/?#\s]+)/i);
  if (match?.[1]) return match[1];
  const bare = raw.replace(/^@/, "").replace(/^https?:\/\//i, "").replace(/^\/+/, "");
  if (!bare || bare.includes("/") || bare.includes(" ")) return null;
  return bare;
}

function githubHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "hns-bot/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

/** Inclusive civil date range for challenge month label `YYYY-MM` (UTC+2-aligned keys). */
function monthUtcRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

async function readErrorSnippet(res: Response): Promise<string | undefined> {
  try {
    const t = await res.text();
    return t.slice(0, 200);
  } catch {
    return undefined;
  }
}

async function githubJson<T>(res: Response, label: string): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  const snippet = await readErrorSnippet(res);
  let hint = `${label}: HTTP ${res.status}`;
  if (res.status === 403 || res.status === 429) {
    hint +=
      " (rate limit or forbidden — set a GITHUB_TOKEN secret on the Worker for higher limits)";
  }
  if (res.status === 404) {
    hint += " (user not found or no access)";
  }
  throw new GitHubApiError(hint, res.status, snippet);
}

async function searchTotalCount(
  pathWithQuery: string,
  headers: Record<string, string>,
): Promise<number> {
  const res = await fetch(`https://api.github.com${pathWithQuery}`, { headers });
  const data = await githubJson<{ total_count?: number }>(res, "GitHub Search");
  return typeof data.total_count === "number" ? data.total_count : 0;
}

/**
 * Uses GitHub Search (needs a token for sane rate limits). Counts public commits/PRs
 * in the month — closer to what you expect than scanning only the latest ~N events.
 */
async function fetchMonthlyPulseViaSearch(
  username: string,
  month: string,
  token: string,
): Promise<PulseResult> {
  const { start, end } = monthUtcRange(month);
  const headers = githubHeaders(token);
  const range = `${start}..${end}`;
  const safeUser = username.replace(/"/g, "");

  const commits = await searchTotalCount(
    `/search/commits?q=${encodeURIComponent(`author:${safeUser} committer-date:${range}`)}&per_page=1`,
    headers,
  );

  const prsOpened = await searchTotalCount(
    `/search/issues?q=${encodeURIComponent(`is:pr author:${safeUser} created:${range}`)}&per_page=1`,
    headers,
  );

  const prsMerged = await searchTotalCount(
    `/search/issues?q=${encodeURIComponent(`is:pr is:merged author:${safeUser} merged:${range}`)}&per_page=1`,
    headers,
  );

  const rawXp = commits * 1 + prsOpened * 3 + prsMerged * 5;
  const xpEarned = Math.min(rawXp, PULSE_XP_CAP);

  return {
    commits,
    prsOpened,
    prsMerged,
    xpEarned,
    repoCount: 0,
    source: "search",
  };
}

/**
 * Public events feed (no search). Only includes **public** activity; only the last pages
 * of events are scanned — can under-count vs your profile graph, which may include
 * private contributions you chose to show.
 */
async function fetchMonthlyPulseViaEvents(
  username: string,
  month: string,
  token?: string,
): Promise<PulseResult> {
  const headers = githubHeaders(token);
  const [year, mon] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, mon - 1, 1));
  const endDate = new Date(Date.UTC(year, mon, 1));

  let commits = 0;
  let prsOpened = 0;
  let prsMerged = 0;
  const reposSeen = new Set<string>();

  let page = 1;
  let keepFetching = true;

  while (keepFetching && page <= MAX_EVENT_PAGES) {
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100&page=${page}`;
    let res: Response;
    try {
      res = await fetch(url, { headers });
    } catch (e) {
      throw new GitHubApiError(
        `Network error calling GitHub: ${e instanceof Error ? e.message : String(e)}`,
        0,
      );
    }

    const events = await githubJson<GitHubEvent[]>(res, "GitHub Events");

    if (!Array.isArray(events) || events.length === 0) break;

    for (const event of events) {
      const eventDate = new Date(event.created_at);

      if (eventDate < startDate) {
        keepFetching = false;
        break;
      }

      if (eventDate >= endDate) continue;

      if (event.type === "PushEvent") {
        const push = event as GitHubPushEvent;
        const count = push.payload.commits?.length ?? push.payload.size ?? 0;
        commits += count;
        if ("repo" in event && (event as { repo?: { name?: string } }).repo?.name) {
          reposSeen.add((event as { repo: { name: string } }).repo.name);
        }
      } else if (event.type === "PullRequestEvent") {
        const pr = event as GitHubPREvent;
        if (pr.payload.action === "opened") prsOpened++;
        if (pr.payload.action === "closed" && pr.payload.pull_request?.merged) {
          prsMerged++;
        }
      }
    }

    page++;
  }

  const rawXp = commits * 1 + prsOpened * 3 + prsMerged * 5;
  const xpEarned = Math.min(rawXp, PULSE_XP_CAP);

  return {
    commits,
    prsOpened,
    prsMerged,
    xpEarned,
    repoCount: reposSeen.size,
    source: "events",
  };
}

export async function fetchMonthlyPulse(
  username: string,
  month: string, // "YYYY-MM"
  token?: string,
): Promise<PulseResult> {
  if (token?.trim()) {
    return fetchMonthlyPulseViaSearch(username, month, token.trim());
  }
  return fetchMonthlyPulseViaEvents(username, month, undefined);
}

const PULSE_CONTRIBUTIONS_QUERY = `
query PulseContributions($from: DateTime!, $to: DateTime!) {
  viewer {
    login
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
    }
  }
}
`;

function monthToGraphqlUtcRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = `${month}-01T00:00:00Z`;
  const to = `${month}-${String(lastDay).padStart(2, "0")}T23:59:59Z`;
  return { from, to };
}

/**
 * Uses the authenticated user's contribution calendar (includes private repos
 * when they authorized the `repo` scope). Must call GitHub GraphQL as the user.
 */
export async function fetchMonthlyPulseViaViewerGraphql(
  userAccessToken: string,
  month: string,
): Promise<PulseResult> {
  const { from, to } = monthToGraphqlUtcRange(month);
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userAccessToken}`,
      "User-Agent": "hns-bot/1.0",
    },
    body: JSON.stringify({
      query: PULSE_CONTRIBUTIONS_QUERY,
      variables: { from, to },
    }),
  });

  const json = (await res.json()) as {
    data?: {
      viewer?: {
        login?: string;
        contributionsCollection?: {
          totalCommitContributions?: number;
          totalPullRequestContributions?: number;
          totalPullRequestReviewContributions?: number;
        };
      };
    };
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    throw new GitHubApiError(
      `GitHub GraphQL: ${json.errors.map((e) => e.message).join("; ")}`,
      res.status || 400,
    );
  }

  const c = json.data?.viewer?.contributionsCollection;
  if (!c) {
    throw new GitHubApiError("GitHub GraphQL: missing contributionsCollection", res.status || 502);
  }

  const commits = c.totalCommitContributions ?? 0;
  const prsOpened = c.totalPullRequestContributions ?? 0;
  const prReviews = c.totalPullRequestReviewContributions ?? 0;
  const rawXp = commits * 1 + prsOpened * 3 + prReviews * 2;
  const xpEarned = Math.min(rawXp, PULSE_XP_CAP);

  return {
    commits,
    prsOpened,
    prsMerged: 0,
    prReviews,
    xpEarned,
    repoCount: 0,
    source: "viewer",
  };
}
