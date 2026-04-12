/**
 * Browser: always same-origin `/hns-api/*` so Next rewrites proxy to the Worker (avoids CORS + bad placeholders).
 * Server: direct Worker URL from env, or localhost:8787 in development.
 */
function getServerWorkerBase(): string {
  const raw =
    process.env.HNS_WORKER_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";
  const base = raw.replace(/\/$/, "");
  if (base && !base.includes("YOUR_SUBDOMAIN")) return base;
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:8787";
  return "";
}

function portfolioUrl(): string {
  if (typeof window !== "undefined") return "/hns-api/portfolio";
  const base = getServerWorkerBase();
  if (!base) {
    throw new Error(
      "Set HNS_WORKER_URL or NEXT_PUBLIC_API_URL to your Worker origin (e.g. https://hns-bot.xxx.workers.dev).",
    );
  }
  return `${base}/api/portfolio`;
}

function membersUrl(): string {
  if (typeof window !== "undefined") return "/hns-api/members";
  const base = getServerWorkerBase();
  if (!base) {
    throw new Error(
      "Set HNS_WORKER_URL or NEXT_PUBLIC_API_URL to your Worker origin.",
    );
  }
  return `${base}/api/members`;
}

function leaderboardUrl(): string {
  if (typeof window !== "undefined") return "/hns-api/leaderboard";
  const base = getServerWorkerBase();
  if (!base) {
    throw new Error(
      "Set HNS_WORKER_URL or NEXT_PUBLIC_API_URL to your Worker origin.",
    );
  }
  return `${base}/api/leaderboard`;
}

function blogsUrl(): string {
  if (typeof window !== "undefined") return "/hns-api/blogs";
  const base = getServerWorkerBase();
  if (!base) {
    throw new Error(
      "Set HNS_WORKER_URL or NEXT_PUBLIC_API_URL to your Worker origin.",
    );
  }
  return `${base}/api/blogs`;
}

export type Phase = "BUILD" | "VOTE" | "PUBLISH" | "POST_PUBLISH";

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
  bio: string | null;
  github: string | null;
  linkedin: string | null;
  techStack: string[] | null;
  points: number;
  rank: number;
}

export interface Member extends MemberSummary {
  createdAt: string;
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
  title: string;
  url: string;
  /** Up to 500 chars excerpt when sourced from uploaded markdown */
  content?: string | null;
  upvotes: number;
  createdAt: string;
  user: { discordId: string; github: string | null };
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

const REVALIDATE = 60; // seconds

function fetchInit(): RequestInit & { next?: { revalidate: number } } {
  if (typeof window !== "undefined") {
    return { cache: "no-store" as RequestCache };
  }
  return { next: { revalidate: REVALIDATE } };
}

export async function getPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch(portfolioUrl(), fetchInit());
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  return res.json();
}

export async function getMembers(): Promise<MembersResponse> {
  const res = await fetch(membersUrl(), fetchInit());
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const res = await fetch(leaderboardUrl(), fetchInit());
  if (!res.ok) throw new Error("Failed to fetch leaderboard");
  return res.json();
}

export async function getBlogs(): Promise<BlogsResponse> {
  const res = await fetch(blogsUrl(), fetchInit());
  if (!res.ok) throw new Error("Failed to fetch blogs");
  return res.json();
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

export function githubAvatarUrl(githubUrl: string | null): string | null {
  if (!githubUrl) return null;
  const match = githubUrl.match(/github\.com\/([^/?#\s]+)/);
  return match
    ? `https://avatars.githubusercontent.com/${match[1]}?size=128`
    : null;
}

export const PHASE_META: Record<
  Phase,
  { label: string; color: string; description: string }
> = {
  BUILD: {
    label: "BUILD PHASE",
    color: "#f97316",
    description: "Days 1–21 · Submissions open",
  },
  VOTE: {
    label: "VOTE PHASE",
    color: "#8b5cf6",
    description: "Days 22–29 · Cast your votes",
  },
  PUBLISH: {
    label: "PUBLISH DAY",
    color: "#10b981",
    description: "Day 30 · Results going live",
  },
  POST_PUBLISH: {
    label: "RESULTS LIVE",
    color: "#10b981",
    description: "Projects published to portfolio",
  },
};
