/**
 * Browser: same-origin `/hns-api/*` (Next rewrites to the bot Worker).
 * Server (RSC / SSR): `HNS_WORKER_URL` / `NEXT_PUBLIC_API_URL` if set; otherwise same-origin
 * `https://{host}/hns-api/...` so Cloudflare Pages can reach the Worker without a public env var.
 */

function getServerWorkerBase(): string {
  const raw =
    process.env.HNS_WORKER_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";
  const base = raw.replace(/\/$/, "");
  if (base.includes("YOUR_SUBDOMAIN")) {
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        "NEXT_PUBLIC_API_URL (or HNS_WORKER_URL) must not contain YOUR_SUBDOMAIN in development — set your real Worker origin.",
      );
    }
    return "";
  }
  if (!base) return "";
  return base;
}

function getBrowserWorkerBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  const base = raw.replace(/\/$/, "");
  if (!base || base.includes("YOUR_SUBDOMAIN")) return "";
  return base;
}

function browserApiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const worker = getBrowserWorkerBase();
  if (worker) return `${worker}/api${normalized}`;
  return `/hns-api${normalized}`;
}

function normalizeApiPath(p: string): string {
  return p.startsWith("/") ? p : `/${p}`;
}

/**
 * Resolves a fetchable URL for `GET /api{pathAndQuery}` (path includes leading `/`, optional `?…`).
 */
async function resolveApiFetchUrl(pathAndQuery: string): Promise<string | null> {
  const apiPath = normalizeApiPath(pathAndQuery);
  if (typeof window !== "undefined") {
    return browserApiPath(apiPath);
  }

  const base = getServerWorkerBase();
  if (base) {
    return `${base}/api${apiPath}`;
  }

  try {
    const mod = await import("next/headers");
    const h = await mod.headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const rawProto = h.get("x-forwarded-proto");
    const proto = rawProto?.split(",")[0]?.trim() || "https";
    if (host) {
      return `${proto}://${host}/hns-api${apiPath}`;
    }
  } catch {
    /* not in a Next.js request (e.g. static analysis) */
  }

  if (process.env.NODE_ENV === "development") {
    return `http://127.0.0.1:8787/api${apiPath}`;
  }
  return null;
}

const PUBLIC_USER_ID_RE = /^\d{17,20}$/;

function discordWidgetUrl(): string | null {
  if (typeof window !== "undefined") return "/api/discord-widget";
  return null;
}

export type Phase =
  | "BUILD"
  | "VOTE"
  | "REVIEW"
  | "PUBLISH"
  | "POST_PUBLISH";

export interface Submission {
  id: string;
  title: string;
  description: string;
  tier: string;
  /** "DEVELOPER" | "HACKER" from API */
  track?: string;
  repoUrl: string;
  demoUrl: string | null;
  attachmentUrl?: string | null;
  votes: number;
  month: string;
  createdAt?: string;
  user: MemberSummary;
}

export interface MemberSummary {
  discordId: string;
  displayName?: string | null;
  avatarHash?: string | null;
  /** "auto" | "github" | "discord"; omit/null = GitHub then Discord */
  profileAvatarSource?: string | null;
  bio: string | null;
  github: string | null;
  linkedin: string | null;
  techStack: string[] | null;
  points: number;
  rank: number;
}

export interface Member extends MemberSummary {
  createdAt: string;
  profileCompletedAt?: string | null;
  /** Distinct challenge tracks from enrollments (e.g. DEVELOPER, HACKER, DESIGNERS). */
  tracks?: string[];
  _count: { submissions: number; blogs: number };
  submissions: Array<{
    id: string;
    title: string;
    month: string;
    tier: string;
    votes: number;
  }>;
}

export interface Blog {
  id: string;
  kind?: "ARTICLE" | "PROJECT";
  title: string;
  url: string;
  viewUrl?: string;
  /** Up to 500 chars excerpt when sourced from uploaded markdown */
  content?: string | null;
  upvotes: number;
  views?: number;
  createdAt: string;
  user: {
    discordId: string;
    displayName?: string | null;
    github: string | null;
  };
}

export interface ChallengeDto {
  id: string;
  month: string;
  track: string;
  tier: string;
  title: string;
  description: string;
  resources: string | null;
  deliverables?: string | null;
  publishedAt: string;
  enrollmentCount: number;
  submissionCount: number;
}

export interface ChallengesResponse {
  challenges: ChallengeDto[];
}

export interface PortfolioResponse {
  phase: Phase;
  month: string;
  published: Record<string, Submission[]>;
}

export interface MembersResponse {
  members: Member[];
}

export interface LeaderboardResponse {
  leaderboard: MemberSummary[];
}

export interface BlogsResponse {
  blogs: Blog[];
}

/** `GET /api/users/:discordId` — public profile, submissions (portfolio rules), blogs */
export interface PublicProfileUser {
  discordId: string;
  displayName: string | null;
  avatarHash: string | null;
  profileAvatarSource?: string | null;
  bio: string | null;
  github: string | null;
  linkedin: string | null;
  techStack: unknown;
  points: number;
  rank: number;
  profileCompletedAt: string | null;
  stats: { submissions: number; blogs: number; votesCast: number };
  xpBreakdown?: {
    total: number;
    github: number;
    submissions: number;
    votesReceived: number;
    articles: number;
    other: number;
    details?: {
      approvedSubmissions: number;
      enrollmentBonusMonths: number;
      firstSubmissionBonus: number;
    };
  };
}

export interface PublicProfileSubmission {
  id: string;
  tier: string;
  track: string;
  title: string;
  description: string;
  repoUrl: string;
  demoUrl: string | null;
  attachmentUrl: string | null;
  votes: number;
  month: string;
  redirectSlug: string | null;
  createdAt: string;
}

export interface PublicMemberProfile {
  phase: Phase;
  month: string;
  user: PublicProfileUser;
  submissions: PublicProfileSubmission[];
  blogs: Blog[];
  projects?: Blog[];
}

export interface DiscordWidgetChannel {
  id: string;
  name: string;
  position: number;
}

export interface DiscordWidgetMember {
  id: string;
  username: string;
  discriminator: string;
  status: string;
  avatar_url?: string | null;
  game?: { name: string } | null;
  /** Present on some widget payloads */
  nick?: string | null;
}

export interface DiscordWidgetResponse {
  id: string;
  name: string;
  instant_invite?: string;
  presence_count?: number;
  approximate_member_count?: number;
  channels?: DiscordWidgetChannel[];
  members?: DiscordWidgetMember[];
}

function fetchInit(): RequestInit {
  // `next.revalidate` on Cloudflare Pages edge crashes in next-on-pages' cache
  // adapter ("Cannot read properties of null (reading 'default')"). Use
  // `no-store` on both sides; dynamic routes already revalidate per request.
  return { cache: "no-store" as RequestCache };
}

export const EMPTY_PORTFOLIO: PortfolioResponse = {
  phase: "BUILD",
  month: "",
  published: {},
};

export const EMPTY_MEMBERS: MembersResponse = { members: [] };
export const EMPTY_LEADERBOARD: LeaderboardResponse = { leaderboard: [] };
export const EMPTY_BLOGS: BlogsResponse = { blogs: [] };
export const EMPTY_CHALLENGES: ChallengesResponse = { challenges: [] };

/**
 * Client-only bundle for /members hub: parallel GETs with a 10s deadline.
 * URLs use `NEXT_PUBLIC_API_URL` when set (see `getBrowserWorkerBase` / `browserApiPath`), else same-origin `/hns-api`.
 */
export async function fetchMembersHubBundle(): Promise<{
  members: MembersResponse;
  leaderboard: LeaderboardResponse;
  portfolio: PortfolioResponse;
  blogs: BlogsResponse;
}> {
  const paths = ["/members", "/leaderboard", "/portfolio", "/blogs"] as const;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const init: RequestInit = {
    ...fetchInit(),
    signal: controller.signal,
  };
  try {
    const urls = await Promise.all(paths.map((p) => resolveApiFetchUrl(p)));
    for (let i = 0; i < urls.length; i++) {
      if (!urls[i]) {
        throw new Error(
          "API base URL is not configured. Set NEXT_PUBLIC_API_URL (or use /hns-api rewrites).",
        );
      }
    }
    const settled = await Promise.allSettled(urls.map((url) => fetch(url!, init)));
    const parse = async (idx: number, fallback: unknown) => {
      const s = settled[idx];
      if (s.status !== "fulfilled" || !s.value.ok) return fallback;
      try {
        return await s.value.json();
      } catch {
        return fallback;
      }
    };
    const members = (await parse(0, EMPTY_MEMBERS)) as MembersResponse;
    const leaderboard = (await parse(1, EMPTY_LEADERBOARD)) as LeaderboardResponse;
    const portfolio = (await parse(2, EMPTY_PORTFOLIO)) as PortfolioResponse;
    const blogs = (await parse(3, EMPTY_BLOGS)) as BlogsResponse;
    const anyOk = settled.some((s) => s.status === "fulfilled" && s.value.ok);
    if (!anyOk) {
      const firstErr = settled.find((s) => s.status === "fulfilled" && !s.value.ok) as
        | PromiseFulfilledResult<Response>
        | undefined;
      const status = firstErr?.value.status ?? "network";
      throw new Error(
        `Could not load members hub (best status: HTTP ${status}). Check NEXT_PUBLIC_API_URL or /hns-api rewrites.`,
      );
    }
    return { members, leaderboard, portfolio, blogs };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        "Timed out after 10 seconds while loading members data. Check NEXT_PUBLIC_API_URL and that the Worker is reachable.",
      );
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getPortfolio(): Promise<PortfolioResponse> {
  const url = await resolveApiFetchUrl("/portfolio");
  if (!url) {
    return EMPTY_PORTFOLIO;
  }
  try {
    const res = await fetch(url, fetchInit());
    if (!res.ok) throw new Error("Failed to fetch portfolio");
    return res.json();
  } catch {
    return EMPTY_PORTFOLIO;
  }
}

export async function getMembers(): Promise<MembersResponse> {
  const url = await resolveApiFetchUrl("/members");
  if (!url) return EMPTY_MEMBERS;
  try {
    const res = await fetch(url, fetchInit());
    if (!res.ok) throw new Error("Failed to fetch members");
    return res.json();
  } catch {
    return EMPTY_MEMBERS;
  }
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const url = await resolveApiFetchUrl("/leaderboard");
  if (!url) return EMPTY_LEADERBOARD;
  try {
    const res = await fetch(url, fetchInit());
    if (!res.ok) throw new Error("Failed to fetch leaderboard");
    return res.json();
  } catch {
    return EMPTY_LEADERBOARD;
  }
}

export async function getBlogs(): Promise<BlogsResponse> {
  const url = await resolveApiFetchUrl("/blogs");
  if (!url) return EMPTY_BLOGS;
  try {
    const res = await fetch(url, fetchInit());
    if (!res.ok) throw new Error("Failed to fetch blogs");
    return res.json();
  } catch {
    return EMPTY_BLOGS;
  }
}

export async function getUserPublicProfile(
  discordId: string,
): Promise<PublicMemberProfile | null> {
  if (!PUBLIC_USER_ID_RE.test(discordId)) return null;
  const url = await resolveApiFetchUrl(`/users/${discordId}`);
  if (!url) return null;
  try {
    const res = await fetch(url, fetchInit());
    if (!res.ok) return null;
    return res.json() as Promise<PublicMemberProfile>;
  } catch {
    return null;
  }
}

export async function getDiscordWidget(): Promise<DiscordWidgetResponse | null> {
  const url = discordWidgetUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch Discord widget");
    return res.json();
  } catch {
    return null;
  }
}

export async function getChallenges(
  track: "DEVELOPER" | "HACKER" | "DESIGNERS",
  month?: string,
): Promise<ChallengesResponse> {
  const qs = new URLSearchParams({ track });
  if (month) qs.set("month", month);
  const url = await resolveApiFetchUrl(`/challenges?${qs.toString()}`);
  if (!url) return EMPTY_CHALLENGES;
  try {
    const res = await fetch(url, fetchInit());
    if (!res.ok) throw new Error("Failed to fetch challenges");
    return res.json();
  } catch {
    return EMPTY_CHALLENGES;
  }
}

export function formatTechStack(
  techStack: string[] | null | undefined,
): string[] {
  if (!techStack) return [];
  if (Array.isArray(techStack)) return techStack as string[];
  if (typeof techStack === "string") return [techStack];
  return [];
}

export function discordAvatarUrl(discordId: string): string {
  const hash = parseInt(discordId.slice(-4), 10) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${hash}.png`;
}

export function githubAvatarUrl(
  githubUrl: string | null,
  size: 64 | 128 | 256 = 128,
): string | null {
  if (!githubUrl) return null;
  const match = githubUrl.match(/github\.com\/([^/?#\s]+)/i);
  return match
    ? `https://avatars.githubusercontent.com/${match[1]}?size=${size}`
    : null;
}

export function discordUserAvatarUrl(
  discordId: string,
  avatarHash: string | null | undefined,
  size: 64 | 128 | 256 = 128,
): string | null {
  const h = avatarHash?.trim();
  if (!h) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${h}.png?size=${size}`;
}

export type ProfileAvatarPreference = "auto" | "github" | "discord";

export function normalizeProfileAvatarSource(
  raw: string | null | undefined,
): ProfileAvatarPreference {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "github") return "github";
  if (v === "discord") return "discord";
  return "auto";
}

/**
 * Chooses avatar from GitHub / Discord / default silhouette based on `profileAvatarSource`
 * (auto = GitHub first when linked, else Discord).
 */
export function userProfileAvatarUrl(
  opts: {
    discordId: string;
    github?: string | null;
    avatarHash?: string | null;
    profileAvatarSource?: string | null;
  },
  size: 64 | 128 | 256 = 128,
): string {
  const pref = normalizeProfileAvatarSource(opts.profileAvatarSource);
  const gh = githubAvatarUrl(opts.github ?? null, size);
  const disc = discordUserAvatarUrl(opts.discordId, opts.avatarHash, size);
  const fallback = discordAvatarUrl(opts.discordId);

  if (pref === "github") {
    return gh ?? disc ?? fallback;
  }
  if (pref === "discord") {
    return disc ?? gh ?? fallback;
  }
  return gh ?? disc ?? fallback;
}

export const PHASE_META: Record<
  Phase,
  { label: string; color: string; description: string }
> = {
  BUILD: {
    label: "BUILD PHASE",
    color: "#7c2feb",
    description: "Days 1–21 · Submissions open",
  },
  VOTE: {
    label: "VOTE PHASE",
    /** Subtle secondary accent (main brand stays volt green in CSS). */
    color: "#7c2feb",
    description: "Days 22–25 · Cast your votes",
  },
  REVIEW: {
    label: "REVIEW PHASE",
    color: "#f59e0b",
    description: "Days 26–28 · Admin review",
  },
  PUBLISH: {
    label: "PUBLISH DAY",
    color: "#10b981",
    description: "Day 29 · Results going live",
  },
  POST_PUBLISH: {
    label: "RESULTS LIVE",
    color: "#10b981",
    description: "Days 30–31 · Buffer before next cycle",
  },
};
