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

export type GitHubEvent = GitHubPushEvent | GitHubPREvent | { type: string; created_at: string; payload: unknown };

export interface PulseResult {
  commits: number;
  prsOpened: number;
  prsMerged: number;
  xpEarned: number;
  repoCount: number;
}

/** Caps XP per month to prevent farming */
const MAX_PULSE_XP = 100;

export function extractGithubUsername(githubUrl: string | null | undefined): string | null {
  if (!githubUrl) return null;
  const match = githubUrl.match(/github\.com\/([^/?#\s]+)/);
  return match?.[1] ?? null;
}

export async function fetchMonthlyPulse(
  username: string,
  month: string, // "YYYY-MM"
  token?: string,
): Promise<PulseResult> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "hns-bot/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const [year, mon] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, mon - 1, 1));
  const endDate = new Date(Date.UTC(year, mon, 1));

  let commits = 0;
  let prsOpened = 0;
  let prsMerged = 0;
  const reposSeen = new Set<string>();

  let page = 1;
  let keepFetching = true;

  while (keepFetching && page <= 5) {
    const url = `https://api.github.com/users/${username}/events?per_page=100&page=${page}`;
    let res: Response;

    try {
      res = await fetch(url, { headers });
    } catch {
      break;
    }

    if (!res.ok) break;

    const events = (await res.json()) as GitHubEvent[];
    if (!Array.isArray(events) || events.length === 0) break;

    for (const event of events) {
      const eventDate = new Date(event.created_at);

      // Events are newest-first; if we've gone past our window, stop
      if (eventDate < startDate) {
        keepFetching = false;
        break;
      }

      // Skip events outside our target month
      if (eventDate >= endDate) continue;

      if (event.type === "PushEvent") {
        const push = event as GitHubPushEvent;
        const count = push.payload.commits?.length ?? push.payload.size ?? 0;
        commits += count;
        if ("repo" in event && (event as any).repo?.name) {
          reposSeen.add((event as any).repo.name);
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
  const xpEarned = Math.min(rawXp, MAX_PULSE_XP);

  return {
    commits,
    prsOpened,
    prsMerged,
    xpEarned,
    repoCount: reposSeen.size,
  };
}
