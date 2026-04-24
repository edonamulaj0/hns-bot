import type { PrismaClient } from "@prisma/client/edge";
import type { WorkerBindings } from "./worker-env";
import { mergedPublicDisplayName, validatePublicDisplayName } from "./display-name";
import { getMonthlyPhase, monthKey, nextUtcMonthFirstDateString } from "./time";
import { getSessionFromRequest } from "./session-verify";
import { requireGuildMembership } from "./membership";
import { castVote } from "./vote-service";
import { awardPoints, XP } from "./points";
import {
  TRACK_DESIGNERS,
  TRACK_HACKER,
  DELIVERABLE_IMAGE_EXPORT,
  normalizeTrackParam,
} from "./tracks";
import {
  syncLegacyApprovalFields,
  effectiveSubmissionStatus,
  isPublishedArchive,
} from "./submission-lifecycle";
import { syncDesignEnrollmentRoles } from "./design-track-roles";

const MONTH_RE = /^\d{4}-\d{2}$/;

function slugChars(): string {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 8; i++) s += c[buf[i]! % c.length];
  return s;
}

async function uniqueRedirectSlug(prisma: PrismaClient): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const s = slugChars();
    const clash = await prisma.submission.findUnique({
      where: { redirectSlug: s },
      select: { id: true },
    });
    if (!clash) return s;
  }
  throw new Error("Could not allocate redirect slug");
}

export function corsHeaders(
  env: WorkerBindings,
  request: Request,
): Record<string, string> {
  const base = env.BASE_URL?.replace(/\/$/, "") ?? "";
  const origin = request.headers.get("Origin") ?? "";
  const allow =
    base && origin && (origin === base || origin.startsWith(base))
      ? origin
      : base || "*";
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS, HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Cookie, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (allow === "*") {
    h["Access-Control-Allow-Origin"] = "*";
  } else {
    h["Access-Control-Allow-Origin"] = allow;
    h["Access-Control-Allow-Credentials"] = "true";
  }
  return h;
}

export function jsonResponse(
  env: WorkerBindings,
  request: Request,
  data: unknown,
  status = 200,
  extra?: Record<string, string>,
): Response {
  const h = new Headers({
    "Content-Type": "application/json",
    ...corsHeaders(env, request),
    ...extra,
  });
  return new Response(JSON.stringify(data), { status, headers: h });
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

type BlogKind = "ARTICLE" | "PROJECT";

function normalizeBlogKind(raw: string | null | undefined): BlogKind | null {
  const v = (raw ?? "").trim().toUpperCase();
  if (v === "ARTICLE" || v === "PROJECT") return v;
  return null;
}

function normalizeGithubInput(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t.startsWith("https://github.com/") || t.startsWith("https://gitlab.com/")) return t;
  if (t.startsWith("http://")) return null;
  if (/^[A-Za-z0-9_.-]+$/.test(t.replace(/^@/, ""))) {
    return `https://github.com/${t.replace(/^@/, "")}`;
  }
  return null;
}

function normalizeLinkedinInput(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t.startsWith("https://linkedin.com/") || t.startsWith("https://www.linkedin.com/")) {
    return t;
  }
  if (t.startsWith("http://")) return null;
  const handle = t.replace(/^@/, "").replace(/^\/+/, "");
  if (/^[A-Za-z0-9_-]+$/.test(handle)) {
    return `https://linkedin.com/in/${handle}`;
  }
  return null;
}

async function validateRepoReachable(urlStr: string): Promise<boolean> {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    if (!host.includes("github.com") && !host.includes("gitlab.com")) return false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(urlStr, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "H4ck&Stack-Bot/1.0" },
    });
    clearTimeout(t);
    return res.ok || res.status === 405 || res.status === 403;
  } catch {
    return false;
  }
}

async function authCtx(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<
  | { session: { discordId: string }; membershipError: null }
  | { session: null; membershipError: Response }
> {
  const session = await getSessionFromRequest(request, env.SESSION_SECRET);
  if (!session) {
    return {
      session: null,
      membershipError: jsonResponse(env, request, { error: "unauthorized" }, 401),
    };
  }
  const mem = await requireGuildMembership(prisma, session.discordId, env);
  if (mem) {
    return {
      session: null,
      membershipError: jsonResponse(
        env,
        request,
        { error: mem.error, joinUrl: mem.joinUrl },
        403,
      ),
    };
  }
  return { session: { discordId: session.discordId }, membershipError: null };
}

export async function handleMe(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    include: {
      _count: { select: { submissions: true, blogs: true, votesCast: true } },
    },
  });
  if (!user) {
    return jsonResponse(env, request, { error: "user_not_found" }, 404);
  }

  const m = monthKey();
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, challenge: { month: m } },
    include: { challenge: true },
  });

  const [submission, submissions] = await Promise.all([
    enrollment
      ? prisma.submission.findFirst({
          where: {
            userId: user.id,
            month: m,
            challengeId: enrollment.challengeId,
          },
        })
      : Promise.resolve(null),
    prisma.submission.findMany({
      where: { userId: user.id },
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        month: true,
        tier: true,
        title: true,
        description: true,
        track: true,
        repoUrl: true,
        demoUrl: true,
        attachmentUrl: true,
        votes: true,
        isApproved: true,
        submissionStatus: true,
        isLocked: true,
        createdAt: true,
      },
    }),
  ]);

  const blogs = await prisma.blog.findMany({
    where: { userId: user.id, kind: "ARTICLE" },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      kind: true,
      title: true,
      url: true,
      content: true,
      upvotes: true,
      views: true,
      createdAt: true,
    },
  });
  const projects = await prisma.blog.findMany({
    where: { userId: user.id, kind: "PROJECT" },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      kind: true,
      title: true,
      url: true,
      content: true,
      upvotes: true,
      views: true,
      createdAt: true,
    },
  });

  return jsonResponse(env, request, {
    user: {
      id: user.id,
      discordId: user.discordId,
      displayName: user.displayName,
      discordUsername: user.discordUsername,
      avatarHash: user.avatarHash,
      profileAvatarSource: user.profileAvatarSource ?? null,
      bio: user.bio,
      github: user.github,
      linkedin: user.linkedin,
      techStack: user.techStack,
      points: user.points,
      rank: user.rank,
      profileCompletedAt: user.profileCompletedAt?.toISOString() ?? null,
      stats: user._count,
    },
    enrollment: enrollment
      ? {
          id: enrollment.id,
          challenge: enrollment.challenge,
        }
      : null,
    submission,
    submissions,
    blogs,
    projects,
  });
}

const DISCORD_SNOWFLAKE_RE = /^\d{17,20}$/;

/** Public member profile by Discord ID: portfolio-style submissions + blogs. No auth. */
export async function handleUserPublicProfile(
  prisma: PrismaClient,
  discordIdParam: string,
  env: WorkerBindings,
  request: Request,
): Promise<Response> {
  if (!DISCORD_SNOWFLAKE_RE.test(discordIdParam)) {
    return jsonResponse(env, request, { error: "invalid_discord_id" }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { discordId: discordIdParam },
    include: {
      _count: { select: { submissions: true, blogs: true, votesCast: true } },
    },
  });

  if (!user) {
    return jsonResponse(env, request, { error: "not_found" }, 404);
  }

  const now = new Date();
  const phase = getMonthlyPhase(now);
  const currentMonth = monthKey(now);
  const monthFilter =
    phase === "PUBLISH" || phase === "POST_PUBLISH"
      ? { lte: currentMonth }
      : { lt: currentMonth };

  const submissionRows = await prisma.submission.findMany({
    where: {
      userId: user.id,
      OR: [
        { submissionStatus: "PUBLISHED" },
        { AND: [{ submissionStatus: null }, { revealed: true }] },
      ],
      month: monthFilter,
    },
    orderBy: [{ month: "desc" }, { votes: "desc" }, { createdAt: "desc" }],
  });

  const submissions = submissionRows.map((item) => ({
    id: item.id,
    tier: item.tier,
    track: item.track,
    title: item.title,
    description: item.description,
    repoUrl: item.repoUrl,
    demoUrl: item.demoUrl,
    attachmentUrl: item.attachmentUrl,
    votes: item.votes,
    month: item.month,
    redirectSlug: item.redirectSlug,
    createdAt: item.createdAt.toISOString(),
  }));

  const blogRows = await prisma.blog.findMany({
    where: { userId: user.id, kind: "ARTICLE" },
    orderBy: [{ createdAt: "desc" }],
  });

  const projectRows = await prisma.blog.findMany({
    where: { userId: user.id, kind: "PROJECT" },
    orderBy: [{ createdAt: "desc" }],
  });

  const blogs = blogRows.map((b) => ({
    kind: b.kind,
    id: b.id,
    title: b.title,
    url: b.url,
    viewUrl: `/hns-api/blogs/${b.id}/view`,
    upvotes: b.upvotes,
    views: b.views,
    createdAt: b.createdAt.toISOString(),
    content: b.content ? b.content.slice(0, 500) : null,
    user: {
      discordId: user.discordId,
      displayName: mergedPublicDisplayName(user.displayName, user.discordUsername),
      github: user.github,
    },
  }));

  const projects = projectRows.map((p) => ({
    kind: p.kind,
    id: p.id,
    title: p.title,
    url: p.url,
    viewUrl: `/hns-api/blogs/${p.id}/view`,
    upvotes: p.upvotes,
    views: p.views,
    createdAt: p.createdAt.toISOString(),
    content: p.content ? p.content.slice(0, 500) : null,
    user: {
      discordId: user.discordId,
      displayName: mergedPublicDisplayName(user.displayName, user.discordUsername),
      github: user.github,
    },
  }));

  return jsonResponse(
    env,
    request,
    {
      phase,
      month: currentMonth,
      user: {
        discordId: user.discordId,
        displayName: mergedPublicDisplayName(user.displayName, user.discordUsername),
        avatarHash: user.avatarHash,
        profileAvatarSource: user.profileAvatarSource ?? null,
        bio: user.bio,
        github: user.github,
        linkedin: user.linkedin,
        techStack: user.techStack,
        points: user.points,
        rank: user.rank,
        profileCompletedAt: user.profileCompletedAt?.toISOString() ?? null,
        stats: user._count,
      },
      submissions,
      blogs,
      projects,
    },
    200,
    { "Cache-Control": "public, max-age=60" },
  );
}

export async function handleBlogPost(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;
  const body = await readJson<{
    kind?: string;
    title?: string;
    url?: string;
    content?: string | null;
  }>(request);
  if (!body) return jsonResponse(env, request, { error: "invalid_json" }, 400);

  const kind = normalizeBlogKind(body.kind);
  if (!kind) return jsonResponse(env, request, { error: "invalid_kind" }, 400);
  const title = body.title?.trim() ?? "";
  const url = body.url?.trim() ?? "";
  if (title.length < 3 || title.length > 120) {
    return jsonResponse(env, request, { error: "title_length" }, 400);
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return jsonResponse(env, request, { error: "invalid_url" }, 400);
  }
  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    return jsonResponse(env, request, { error: "invalid_url_protocol" }, 400);
  }
  const content = body.content?.trim() || null;
  if (content && content.length > 20_000) {
    return jsonResponse(env, request, { error: "content_too_long" }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    select: { id: true },
  });
  if (!user) return jsonResponse(env, request, { error: "user_not_found" }, 404);

  const blog = await prisma.blog.create({
    data: {
      userId: user.id,
      kind,
      title,
      url: parsedUrl.toString(),
      content,
    },
  });
  return jsonResponse(env, request, { ok: true, blog });
}

export async function handleBlogPatch(
  prisma: PrismaClient,
  id: string,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;
  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    select: { id: true },
  });
  if (!user) return jsonResponse(env, request, { error: "user_not_found" }, 404);
  const existing = await prisma.blog.findFirst({ where: { id, userId: user.id } });
  if (!existing) return jsonResponse(env, request, { error: "not_found" }, 404);

  const body = await readJson<{
    title?: string;
    url?: string;
    content?: string | null;
  }>(request);
  if (!body) return jsonResponse(env, request, { error: "invalid_json" }, 400);

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (title.length < 3 || title.length > 120) {
      return jsonResponse(env, request, { error: "title_length" }, 400);
    }
    data.title = title;
  }
  if (body.url !== undefined) {
    const raw = body.url.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(raw);
    } catch {
      return jsonResponse(env, request, { error: "invalid_url" }, 400);
    }
    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      return jsonResponse(env, request, { error: "invalid_url_protocol" }, 400);
    }
    data.url = parsedUrl.toString();
  }
  if (body.content !== undefined) {
    const content = body.content?.trim() || null;
    if (content && content.length > 20_000) {
      return jsonResponse(env, request, { error: "content_too_long" }, 400);
    }
    data.content = content;
  }

  const blog = await prisma.blog.update({
    where: { id },
    data: data as any,
  });
  return jsonResponse(env, request, { ok: true, blog });
}

export async function handleBlogDelete(
  prisma: PrismaClient,
  id: string,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;
  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    select: { id: true },
  });
  if (!user) return jsonResponse(env, request, { error: "user_not_found" }, 404);
  const existing = await prisma.blog.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) return jsonResponse(env, request, { error: "not_found" }, 404);
  await prisma.blog.delete({ where: { id } });
  return jsonResponse(env, request, { deleted: true });
}

export async function handleVotePost(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const phase = getMonthlyPhase();
  if (phase !== "VOTE") {
    return jsonResponse(env, request, { error: "voting_closed" }, 400);
  }

  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const body = await readJson<{ submissionId?: string; month?: string }>(request);
  const submissionId = body?.submissionId?.trim();
  if (!submissionId) {
    return jsonResponse(env, request, { error: "missing_submissionId" }, 400);
  }

  const result = await castVote(
    prisma,
    ctx.session.discordId,
    submissionId,
    body?.month?.trim() ?? null,
    env,
  );
  if (!result.ok) {
    return jsonResponse(env, request, { error: "vote_failed", message: result.message }, 400);
  }

  const voteMonth =
    body?.month && MONTH_RE.test(body.month.trim()) ? body.month.trim() : monthKey();
  const remaining = await voteRemaining(prisma, ctx.session.discordId, voteMonth);
  return jsonResponse(env, request, {
    votes: result.votes,
    toggledOff: result.toggledOff ?? false,
    votesRemaining: remaining.totalRemaining,
    developerVotesRemaining: remaining.devRem,
    hackerVotesRemaining: remaining.hackRem,
    designerVotesRemaining: remaining.designRem,
  });
}

async function voteRemaining(
  prisma: PrismaClient,
  voterDiscordId: string,
  subMonth: string,
) {
  const total = await prisma.vote.count({
    where: { voterDiscordId, submission: { month: subMonth } },
  });
  const dev = await prisma.vote.count({
    where: {
      voterDiscordId,
      submission: { month: subMonth, track: "DEVELOPER" },
    },
  });
  const hack = await prisma.vote.count({
    where: {
      voterDiscordId,
      submission: { month: subMonth, track: "HACKER" },
    },
  });
  const design = await prisma.vote.count({
    where: {
      voterDiscordId,
      submission: { month: subMonth, track: TRACK_DESIGNERS },
    },
  });
  return {
    totalRemaining: Math.max(0, 3 - total),
    devRem: Math.max(0, 1 - dev),
    hackRem: Math.max(0, 1 - hack),
    designRem: Math.max(0, 1 - design),
  };
}

export async function handleVoteStatus(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? monthKey();
  if (!MONTH_RE.test(month)) {
    return jsonResponse(env, request, { error: "invalid_month" }, 400);
  }

  const voted = await prisma.vote.findMany({
    where: { voterDiscordId: ctx.session.discordId, submission: { month } },
    select: { submissionId: true },
  });

  const total = await prisma.vote.count({
    where: { voterDiscordId: ctx.session.discordId, submission: { month } },
  });
  const dev = await prisma.vote.count({
    where: {
      voterDiscordId: ctx.session.discordId,
      submission: { month, track: "DEVELOPER" },
    },
  });
  const hack = await prisma.vote.count({
    where: {
      voterDiscordId: ctx.session.discordId,
      submission: { month, track: "HACKER" },
    },
  });
  const design = await prisma.vote.count({
    where: {
      voterDiscordId: ctx.session.discordId,
      submission: { month, track: TRACK_DESIGNERS },
    },
  });

  // All three track remainders are returned; clients display whichever are relevant.
  return jsonResponse(env, request, {
    month,
    totalVotes: total,
    developerVotes: dev,
    hackerVotes: hack,
    designerVotes: design,
    developerVotesRemaining: Math.max(0, 1 - dev),
    hackerVotesRemaining: Math.max(0, 1 - hack),
    designerVotesRemaining: Math.max(0, 1 - design),
    totalVotesRemaining: Math.max(0, 3 - total),
    voted: voted.map((v) => v.submissionId),
  });
}

export async function handleVoteQueue(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? monthKey();
  if (!MONTH_RE.test(month)) {
    return jsonResponse(env, request, { error: "invalid_month" }, 400);
  }

  const phase = getMonthlyPhase();
  const subs = await prisma.submission.findMany({
    where: {
      month,
      OR: [
        { submissionStatus: "APPROVED" },
        { AND: [{ submissionStatus: null }, { isApproved: true }] },
      ],
    },
    include: {
      user: {
        select: {
          discordId: true,
          displayName: true,
          discordUsername: true,
          avatarHash: true,
        },
      },
    },
    orderBy: [{ track: "asc" }, { tier: "asc" }, { votes: "desc" }],
  });

  const showFull = phase === "VOTE" || phase === "REVIEW" || phase === "PUBLISH";
  const submissions = subs.map((s) => {
    const author = {
      discordId: s.user.discordId,
      displayName: mergedPublicDisplayName(s.user.displayName, s.user.discordUsername),
      avatarHash: s.user.avatarHash,
    };
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      tier: s.tier,
      track: s.track,
      challengeType: s.challengeType,
      votes: s.votes,
      redirectSlug: s.redirectSlug,
      revealed: s.revealed,
      repoUrl: showFull || s.revealed ? s.repoUrl : null,
      demoUrl: showFull || s.revealed ? s.demoUrl : null,
      attachmentUrl: showFull || s.revealed ? s.attachmentUrl : null,
      deliverableType: s.deliverableType,
      imageMeta: s.imageMeta,
      author: showFull || s.revealed ? author : null,
    };
  });

  return jsonResponse(env, request, { phase, month, submissions });
}

export async function handleSubmissionGet(
  prisma: PrismaClient,
  id: string,
  env: WorkerBindings,
  request: Request,
): Promise<Response> {
  const s = await prisma.submission.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          discordId: true,
          displayName: true,
          discordUsername: true,
          avatarHash: true,
        },
      },
    },
  });
  if (!s) {
    return jsonResponse(env, request, { error: "not_found" }, 404);
  }

  const session = await getSessionFromRequest(request, env.SESSION_SECRET);
  const viewerDiscord = session?.discordId ?? null;
  const st = effectiveSubmissionStatus(s);
  const isOwner = Boolean(viewerDiscord && s.user.discordId === viewerDiscord);
  const showPublic = isPublishedArchive(st) || st === "APPROVED";
  const showOwner = isOwner && (st === "PENDING" || st === "APPROVED" || st === "REJECTED");
  if (!showPublic && !showOwner) {
    return jsonResponse(env, request, {
      error: "not_found",
      message: "This submission is not public yet.",
    }, 404);
  }

  return jsonResponse(env, request, {
    id: s.id,
    title: s.title,
    description: s.description,
    tier: s.tier,
    track: s.track,
    challengeType: s.challengeType,
    votes: s.votes,
    redirectSlug: s.redirectSlug,
    submissionStatus: st,
    repoUrl: s.repoUrl,
    demoUrl: s.demoUrl,
    attachmentUrl: s.attachmentUrl,
    deliverableType: s.deliverableType,
    imageMeta: s.imageMeta,
    month: s.month,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    userId: s.userId,
    user: {
      discordId: s.user.discordId,
      displayName: mergedPublicDisplayName(s.user.displayName, s.user.discordUsername),
      avatarHash: s.user.avatarHash,
    },
  });
}

export async function handleRedirectSlug(
  prisma: PrismaClient,
  slug: string,
  env: WorkerBindings,
  request: Request,
): Promise<Response> {
  const s = await prisma.submission.findUnique({
    where: { redirectSlug: slug },
    select: { demoUrl: true, revealed: true },
  });
  if (!s) {
    return jsonResponse(env, request, { error: "not_found" }, 404);
  }
  if (!s.revealed) {
    return jsonResponse(env, request, {
      status: "hidden",
      message: "This demo will be revealed on publish day (day 29).",
    });
  }
  if (!s.demoUrl?.trim()) {
    return jsonResponse(env, request, { error: "no_demo" }, 404);
  }
  return Response.redirect(s.demoUrl, 302);
}

export async function handleEnrollPost(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const phase = getMonthlyPhase();
  if (phase !== "BUILD") {
    return jsonResponse(
      env,
      request,
      {
        error: "enrollment_closed",
        message: `The next build window opens ${nextUtcMonthFirstDateString()} (UTC, day 1).`,
      },
      400,
    );
  }

  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const body = await readJson<{ challengeId?: string }>(request);
  const challengeId = body?.challengeId?.trim();
  if (!challengeId) {
    return jsonResponse(env, request, { error: "missing_challengeId" }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
  });
  if (!user) {
    return jsonResponse(env, request, { error: "user_not_found" }, 404);
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.month !== monthKey()) {
    return jsonResponse(env, request, { error: "invalid_challenge" }, 400);
  }

  await prisma.enrollment.upsert({
    where: {
      userId_challengeId: { userId: user.id, challengeId },
    },
    create: { userId: user.id, challengeId },
    update: {},
  });

  await syncDesignEnrollmentRoles(
    prisma,
    ctx.session.discordId,
    challenge.track,
    challenge.tier,
    env.DISCORD_GUILD_ID,
    env.DISCORD_TOKEN,
  ).catch(() => {});

  return jsonResponse(env, request, { ok: true, challenge });
}

export async function handleProfilePatch(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const body = await readJson<{
    displayName?: string | null;
    bio?: string | null;
    github?: string | null;
    linkedin?: string | null;
    techStack?: string[] | null;
    profileAvatarSource?: string | null;
  }>(request);
  if (!body) {
    return jsonResponse(env, request, { error: "invalid_json" }, 400);
  }

  function validation(field: string, message: string): Response {
    return jsonResponse(env, request, { error: "validation", field, message }, 400);
  }

  const data: Record<string, unknown> = {};

  if (body.displayName !== undefined) {
    if (body.displayName !== null && typeof body.displayName !== "string") {
      return validation("displayName", "displayName must be a string.");
    }
    const raw = body.displayName?.trim() ?? null;
    if (raw === null || raw === "") {
      data.displayName = null;
    } else {
      const vErr = validatePublicDisplayName(raw);
      if (vErr) return validation("displayName", vErr);
      data.displayName = raw.replace(/\s+/g, " ");
    }
  }

  if (body.bio !== undefined) {
    if (body.bio !== null && typeof body.bio !== "string") {
      return validation("bio", "bio must be a string or null.");
    }
    if (typeof body.bio === "string" && body.bio.length > 500) {
      return validation("bio", "bio max length is 500.");
    }
    data.bio = body.bio ?? null;
  }

  if (body.github !== undefined) {
    if (body.github !== null && typeof body.github !== "string") {
      return validation("github", "github must be a string or null.");
    }
    const github = normalizeGithubInput(body.github ?? null);
    if (body.github && !github) {
      return validation(
        "github",
        "github must be a GitHub/GitLab URL or a valid handle.",
      );
    }
    data.github = github;
  }

  if (body.linkedin !== undefined) {
    if (body.linkedin !== null && typeof body.linkedin !== "string") {
      return validation("linkedin", "linkedin must be a string or null.");
    }
    const linkedin = normalizeLinkedinInput(body.linkedin ?? null);
    if (body.linkedin && !linkedin) {
      return validation(
        "linkedin",
        "linkedin must be a LinkedIn URL or a valid handle.",
      );
    }
    data.linkedin = linkedin;
  }

  if (body.techStack !== undefined) {
    if (body.techStack !== null && !Array.isArray(body.techStack)) {
      return validation("techStack", "techStack must be an array of strings.");
    }
    const tech = body.techStack ?? [];
    if (tech.length > 15) {
      return validation("techStack", "techStack max items is 15.");
    }
    for (const t of tech) {
      if (typeof t !== "string") {
        return validation("techStack", "techStack entries must be strings.");
      }
      if (t.length > 30) {
        return validation("techStack", "techStack entries max length is 30.");
      }
    }
    data.techStack = tech;
  }

  if (body.profileAvatarSource !== undefined) {
    if (body.profileAvatarSource !== null && typeof body.profileAvatarSource !== "string") {
      return validation("profileAvatarSource", "profileAvatarSource must be a string or null.");
    }
    const raw = body.profileAvatarSource?.trim().toLowerCase() ?? null;
    if (raw === null || raw === "" || raw === "auto") {
      data.profileAvatarSource = null;
    } else if (raw === "github" || raw === "discord") {
      data.profileAvatarSource = raw;
    } else {
      return validation(
        "profileAvatarSource",
        'Use "auto", "github", or "discord".',
      );
    }
  }

  const existing = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    select: { profileCompletedAt: true },
  });
  if (!existing?.profileCompletedAt) {
    data.profileCompletedAt = new Date();
  }

  const updated = await prisma.user.upsert({
    where: { discordId: ctx.session.discordId },
    update: data as any,
    create: {
      discordId: ctx.session.discordId,
      ...data,
    } as any,
  });

  return jsonResponse(env, request, { ok: true, user: updated });
}

export async function handleProfileDelete(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    select: { id: true, discordId: true },
  });
  if (!user) {
    return jsonResponse(env, request, { error: "user_not_found" }, 404);
  }

  await prisma.vote.deleteMany({
    where: { voterDiscordId: user.discordId },
  });
  await prisma.submission.deleteMany({
    where: { userId: user.id },
  });
  await prisma.enrollment.deleteMany({
    where: { userId: user.id },
  });
  await prisma.blog.deleteMany({
    where: { userId: user.id },
  });
  await prisma.user.delete({
    where: { id: user.id },
  });

  return jsonResponse(env, request, { deleted: true }, 200);
}

export async function handleBlogView(
  prisma: PrismaClient,
  id: string,
  request: Request,
): Promise<Response> {
  const blog = await prisma.blog.findUnique({
    where: { id },
    select: { id: true, url: true },
  });
  if (!blog) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
  await prisma.blog.update({
    where: { id: blog.id },
    data: { views: { increment: 1 } },
  });
  return Response.redirect(blog.url, 302);
}

const IMAGE_EXT_RE = /\.(png|jpg|jpeg|webp)(\?|#|$)/i;

export async function imageUrlLooksValid(url: string): Promise<boolean> {
  const t = url.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(u.toString(), {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "H4cknStack/1.0" },
    });
    clearTimeout(timer);
    const ct = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (ct.startsWith("image/")) return true;
    if (IMAGE_EXT_RE.test(u.pathname)) return res.ok || res.status === 403 || res.status === 405;
    return false;
  } catch {
    try {
      const u = new URL(t);
      return IMAGE_EXT_RE.test(u.pathname);
    } catch {
      return false;
    }
  }
}

async function fetchImageMeta(
  url: string,
): Promise<{ width?: number; height?: number; mime?: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "H4cknStack/1.0" },
    });
    clearTimeout(t);
    const ct = res.headers.get("content-type")?.toLowerCase().split(";")[0]?.trim() ?? "";
    const cl = res.headers.get("content-length");
    void cl;
    const mime = ct.startsWith("image/") ? ct : undefined;
    return mime ? { mime } : null;
  } catch {
    return null;
  }
}

export async function handleSubmitPost(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const phase = getMonthlyPhase();
  if (phase !== "BUILD") {
    return jsonResponse(
      env,
      request,
      {
        error: "submissions_closed",
        message: `The build window for this month is closed. The next one opens ${nextUtcMonthFirstDateString()} (UTC, day 1).`,
      },
      400,
    );
  }

  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const body = await readJson<{
    title?: string;
    description?: string;
    repoUrl?: string;
    demoUrl?: string | null;
    attachmentUrl?: string | null;
    imageMeta?: string | null;
    challengeType?: string;
    writeupBody?: string | null;
  }>(request);
  if (!body?.title?.trim() || !body.description?.trim()) {
    return jsonResponse(env, request, { error: "missing_fields" }, 400);
  }

  const title = body.title.trim();
  const description = body.description.trim();

  if (title.length < 5 || title.length > 100) {
    return jsonResponse(env, request, { error: "title_length" }, 400);
  }
  if (description.length < 100 || description.length > 2000) {
    return jsonResponse(env, request, { error: "description_length" }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
  });
  if (!user) {
    return jsonResponse(env, request, { error: "user_not_found" }, 404);
  }

  const m = monthKey();
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: user.id, challenge: { month: m } },
    include: { challenge: true },
  });
  if (!enrollment) {
    return jsonResponse(env, request, { error: "not_enrolled" }, 400);
  }

  const ch = enrollment.challenge;
  const existing = await prisma.submission.findFirst({
    where: { userId: user.id, month: m, challengeId: ch.id },
  });
  if (existing) {
    return jsonResponse(env, request, { error: "already_submitted", id: existing.id }, 409);
  }

  const slug = await uniqueRedirectSlug(prisma);
  const pending = syncLegacyApprovalFields("PENDING");

  let repoUrl = (body.repoUrl ?? "").trim();
  let demoUrl = body.demoUrl?.trim() || null;
  let attachmentUrl = body.attachmentUrl?.trim() || null;
  let challengeType: string | null = null;
  let deliverableType: string | null = null;
  let imageMeta: string | null = null;

  if (ch.track === TRACK_DESIGNERS) {
    deliverableType = DELIVERABLE_IMAGE_EXPORT;
    repoUrl = "https://h4cknstack.com/challenges/designers";
    if (!attachmentUrl) {
      return jsonResponse(
        env,
        request,
        { error: "design_requires_image", message: "Provide a direct PNG, JPG, or WebP image URL." },
        400,
      );
    }
    const imgOk = await imageUrlLooksValid(attachmentUrl);
    if (!imgOk) {
      return jsonResponse(
        env,
        request,
        {
          error: "invalid_image_url",
          message: "Image URL must respond with an image content-type or use a .png/.jpg/.webp path.",
        },
        400,
      );
    }
    const bodyImageMeta = body.imageMeta?.trim() || null;
    if (bodyImageMeta) {
      imageMeta = bodyImageMeta;
    } else {
      const meta = await fetchImageMeta(attachmentUrl);
      if (meta) imageMeta = JSON.stringify(meta);
    }
  } else if (ch.track === TRACK_HACKER) {
    const ct = (body.challengeType ?? "").trim().toUpperCase();
    if (!["CTF_WRITEUP", "TOOL_BUILD", "VULN_RESEARCH", "REDTEAM"].includes(ct)) {
      return jsonResponse(env, request, { error: "invalid_challenge_type" }, 400);
    }
    challengeType = ct;
    const writeup = (body.writeupBody ?? "").trim();
    if (!attachmentUrl && !demoUrl && !writeup) {
      return jsonResponse(
        env,
        request,
        { error: "hacker_requires_writeup_or_link", message: "Add a writeup URL, demo URL, or paste writeup text." },
        400,
      );
    }
    if (writeup && writeup.length >= 50) {
      demoUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(writeup.slice(0, 8000))}`;
    }
    if (!attachmentUrl && !demoUrl) {
      return jsonResponse(env, request, { error: "hacker_requires_writeup_or_link" }, 400);
    }
    if (!repoUrl) {
      repoUrl = "https://h4cknstack.com/challenges/hackers";
    }
  } else {
    if (!repoUrl) {
      return jsonResponse(env, request, { error: "missing_repo" }, 400);
    }
    try {
      const gh = new URL(repoUrl);
      if (gh.hostname.toLowerCase() !== "github.com") {
        return jsonResponse(
          env,
          request,
          { error: "repo_must_be_github", message: "Developer submissions require a github.com repository URL." },
          400,
        );
      }
    } catch {
      return jsonResponse(env, request, { error: "invalid_repo_url" }, 400);
    }
    const repoOk = await validateRepoReachable(repoUrl);
    if (!repoOk) {
      return jsonResponse(env, request, { error: "repo_unreachable" }, 400);
    }
  }

  const sub = await prisma.submission.create({
    data: {
      userId: user.id,
      month: m,
      tier: ch.tier,
      track: ch.track,
      title,
      description,
      repoUrl,
      demoUrl,
      attachmentUrl,
      challengeType,
      deliverableType,
      imageMeta,
      challengeId: ch.id,
      ...pending,
      isLocked: false,
      redirectSlug: slug,
    },
  });

  return jsonResponse(env, request, { ok: true, submission: sub });
}

export async function handleSubmitPatch(
  prisma: PrismaClient,
  id: string,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const phase = getMonthlyPhase();
  if (phase !== "BUILD") {
    return jsonResponse(env, request, { error: "submissions_closed" }, 400);
  }

  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
  });
  if (!user) {
    return jsonResponse(env, request, { error: "user_not_found" }, 404);
  }

  const sub = await prisma.submission.findFirst({
    where: { id, userId: user.id },
    include: { challenge: true },
  });
  if (!sub) {
    return jsonResponse(env, request, { error: "not_found" }, 404);
  }
  if (sub.isLocked) {
    return jsonResponse(env, request, { error: "locked" }, 403);
  }
  const st = effectiveSubmissionStatus(sub);
  if (st !== "PENDING" && st !== "REJECTED") {
    return jsonResponse(env, request, { error: "cannot_edit_after_review" }, 403);
  }

  const body = await readJson<{
    title?: string;
    description?: string;
    repoUrl?: string;
    demoUrl?: string | null;
    attachmentUrl?: string | null;
    challengeType?: string;
    writeupBody?: string | null;
  }>(request);
  if (!body) {
    return jsonResponse(env, request, { error: "invalid_json" }, 400);
  }

  const track = sub.challenge?.track ?? sub.track;
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const t = body.title.trim();
    if (t.length < 5 || t.length > 100) {
      return jsonResponse(env, request, { error: "title_length" }, 400);
    }
    data.title = t;
  }
  if (body.description !== undefined) {
    const d = body.description.trim();
    if (d.length < 100 || d.length > 2000) {
      return jsonResponse(env, request, { error: "description_length" }, 400);
    }
    data.description = d;
  }
  if (body.demoUrl !== undefined) data.demoUrl = body.demoUrl?.trim() || null;
  if (body.attachmentUrl !== undefined) data.attachmentUrl = body.attachmentUrl?.trim() || null;

  if (track === TRACK_DESIGNERS) {
    const att =
      (body.attachmentUrl !== undefined ? (body.attachmentUrl ?? "").trim() : sub.attachmentUrl) ||
      "";
    if (!att) {
      return jsonResponse(env, request, { error: "design_requires_image" }, 400);
    }
    if (body.attachmentUrl !== undefined) {
      const imgOk = await imageUrlLooksValid(att);
      if (!imgOk) {
        return jsonResponse(env, request, { error: "invalid_image_url" }, 400);
      }
      const meta = await fetchImageMeta(att);
      data.imageMeta = meta ? JSON.stringify(meta) : null;
    }
  } else if (track !== TRACK_HACKER) {
    if (body.repoUrl !== undefined) {
      const r = body.repoUrl.trim();
      try {
        const gh = new URL(r);
        if (gh.hostname.toLowerCase() !== "github.com") {
          return jsonResponse(env, request, { error: "repo_must_be_github" }, 400);
        }
      } catch {
        return jsonResponse(env, request, { error: "invalid_repo_url" }, 400);
      }
      const ok = await validateRepoReachable(r);
      if (!ok) return jsonResponse(env, request, { error: "repo_unreachable" }, 400);
      data.repoUrl = r;
    }
  }

  if (track === TRACK_HACKER) {
    if (body.challengeType !== undefined) {
      const ct = body.challengeType.trim().toUpperCase();
      if (!["CTF_WRITEUP", "TOOL_BUILD", "VULN_RESEARCH", "REDTEAM"].includes(ct)) {
        return jsonResponse(env, request, { error: "invalid_challenge_type" }, 400);
      }
      data.challengeType = ct;
    }
    if (body.writeupBody !== undefined) {
      const writeup = (body.writeupBody ?? "").trim();
      if (writeup.length >= 50) {
        data.demoUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(writeup.slice(0, 8000))}`;
      }
    }
  }

  if (st === "REJECTED") {
    data.submissionStatus = "PENDING";
    Object.assign(data, syncLegacyApprovalFields("PENDING"));
  }

  const updated = await prisma.submission.update({
    where: { id },
    data: data as any,
  });

  return jsonResponse(env, request, { ok: true, submission: updated });
}

export async function handleSubmitDelete(
  prisma: PrismaClient,
  id: string,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    select: { id: true },
  });
  if (!user) {
    return jsonResponse(env, request, { error: "user_not_found" }, 404);
  }

  const sub = await prisma.submission.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      isApproved: true,
      revealed: true,
      submissionStatus: true,
      challengeId: true,
    },
  });
  if (!sub) {
    return jsonResponse(env, request, { error: "not_found" }, 404);
  }

  await prisma.submission.delete({ where: { id: sub.id } });

  const st = effectiveSubmissionStatus(sub);
  const hadApprovalXp = st === "APPROVED" || st === "PUBLISHED";
  const deduction =
    (hadApprovalXp ? XP.SUBMISSION_APPROVED : 0) + (sub.challengeId && hadApprovalXp ? XP.ENROLLMENT_BONUS : 0);
  if (deduction > 0) {
    await awardPoints(prisma, user.id, -deduction, env);
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true },
  });

  return jsonResponse(env, request, { deleted: true, newXp: updatedUser?.points ?? 0 });
}

function parseAdminDiscordIds(env: WorkerBindings): Set<string> {
  const raw = (env.ADMIN_DISCORD_IDS ?? "").trim();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^\d{17,20}$/.test(s)),
  );
}

async function requireAdmin(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<
  | { session: { discordId: string }; error: null }
  | { session: null; error: Response }
> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return { session: null, error: ctx.membershipError! };
  if (!parseAdminDiscordIds(env).has(ctx.session.discordId)) {
    return {
      session: null,
      error: jsonResponse(env, request, { error: "Admin access required." }, 403),
    };
  }
  return { session: ctx.session, error: null };
}

/** GET — pending submissions for admin queue */
export async function handleAdminSubmissionsList(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const adm = await requireAdmin(prisma, request, env);
  if (!adm.session) return adm.error!;

  const rows = await prisma.submission.findMany({
    where: {
      OR: [
        { submissionStatus: "PENDING" },
        {
          AND: [{ submissionStatus: null }, { isApproved: false }, { revealed: false }],
        },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
    take: 200,
    include: {
      user: {
        select: {
          discordId: true,
          displayName: true,
          discordUsername: true,
        },
      },
      challenge: { select: { track: true, tier: true, month: true, title: true } },
    },
  });

  const list = rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    track: s.track,
    tier: s.tier,
    month: s.month,
    submissionStatus: effectiveSubmissionStatus(s),
    attachmentUrl: s.attachmentUrl,
    repoUrl: s.repoUrl,
    demoUrl: s.demoUrl,
    deliverableType: s.deliverableType,
    createdAt: s.createdAt.toISOString(),
    author: mergedPublicDisplayName(s.user.displayName, s.user.discordUsername),
    authorDiscordId: s.user.discordId,
  }));

  return jsonResponse(env, request, { submissions: list });
}

/** PATCH — approve or reject (admin only) */
export async function handleAdminSubmissionPatch(
  prisma: PrismaClient,
  id: string,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const adm = await requireAdmin(prisma, request, env);
  if (!adm.session) return adm.error!;

  const body = await readJson<{ action?: string }>(request);
  const action = (body?.action ?? "").trim().toLowerCase();
  if (action !== "approve" && action !== "reject") {
    return jsonResponse(env, request, { error: 'Use action "approve" or "reject".' }, 400);
  }

  const sub = await prisma.submission.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!sub) return jsonResponse(env, request, { error: "not_found" }, 404);

  const st = effectiveSubmissionStatus(sub);
  if (action === "approve") {
    if (st === "PUBLISHED") {
      return jsonResponse(env, request, { error: "already_published" }, 400);
    }
    const next = syncLegacyApprovalFields("APPROVED");
    await prisma.submission.update({ where: { id }, data: next as any });

    await awardPoints(prisma, sub.userId, XP.SUBMISSION_APPROVED, env);

    const priorApproved = await prisma.submission.count({
      where: {
        userId: sub.userId,
        OR: [{ submissionStatus: "APPROVED" }, { submissionStatus: "PUBLISHED" }],
        NOT: { id },
      },
    });
    if (priorApproved === 0) {
      await awardPoints(prisma, sub.userId, XP.FIRST_SUBMISSION, env);
    }

    const enrolledThisMonth = await prisma.enrollment.findFirst({
      where: { userId: sub.userId, challenge: { month: sub.month } },
    });
    if (enrolledThisMonth) {
      const alreadyBonus = await prisma.submission.count({
        where: {
          userId: sub.userId,
          month: sub.month,
          OR: [{ submissionStatus: "APPROVED" }, { submissionStatus: "PUBLISHED" }],
          NOT: { id },
        },
      });
      if (alreadyBonus === 0) {
        await awardPoints(prisma, sub.userId, XP.ENROLLMENT_BONUS, env);
      }
    }

    return jsonResponse(env, request, { ok: true, submissionStatus: "APPROVED" });
  }

  await prisma.submission.update({
    where: { id },
    data: syncLegacyApprovalFields("REJECTED") as any,
  });
  return jsonResponse(env, request, { ok: true, submissionStatus: "REJECTED" });
}

/** GET — published submissions for archive / public lists */
export async function handleSubmissionsListGet(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");
  const trackParam = normalizeTrackParam(url.searchParams.get("track"));
  if (month && !MONTH_RE.test(month)) {
    return jsonResponse(env, request, { error: "invalid_month" }, 400);
  }

  const where: Record<string, unknown> = {
    OR: [
      { submissionStatus: "PUBLISHED" },
      { AND: [{ submissionStatus: null }, { revealed: true }] },
    ],
  };
  if (month) where.month = month;
  if (trackParam) where.track = trackParam;

  const rows = await prisma.submission.findMany({
    where: where as any,
    orderBy: [{ month: "desc" }, { votes: "desc" }],
    take: 100,
    include: {
      user: {
        select: {
          discordId: true,
          displayName: true,
          discordUsername: true,
          avatarHash: true,
        },
      },
    },
  });

  const submissions = rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    tier: s.tier,
    track: s.track,
    votes: s.votes,
    month: s.month,
    repoUrl: s.repoUrl,
    demoUrl: s.demoUrl,
    attachmentUrl: s.attachmentUrl,
    challengeType: s.challengeType,
    deliverableType: s.deliverableType,
    imageMeta: s.imageMeta,
    createdAt: s.createdAt.toISOString(),
    user: {
      discordId: s.user.discordId,
      displayName: mergedPublicDisplayName(s.user.displayName, s.user.discordUsername),
      avatarHash: s.user.avatarHash,
    },
  }));

  return jsonResponse(env, request, { submissions });
}

/** GET — paginated approved+published submissions for activity */
export async function handleActivitySubmissionsFeed(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20));
  const offset = Math.min(2000, Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0));

  const where = {
    NOT: { submissionStatus: "REJECTED" },
    OR: [
      { submissionStatus: "APPROVED" },
      { submissionStatus: "PUBLISHED" },
      { AND: [{ submissionStatus: null }, { isApproved: true }] },
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.submission.findMany({
      where: where as any,
      orderBy: [{ createdAt: "desc" }],
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            discordId: true,
            displayName: true,
            discordUsername: true,
            avatarHash: true,
          },
        },
      },
    }),
    prisma.submission.count({ where: where as any }),
  ]);

  const submissions = rows.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    tier: s.tier,
    track: s.track,
    votes: s.votes,
    month: s.month,
    attachmentUrl: s.attachmentUrl,
    challengeType: s.challengeType,
    createdAt: s.createdAt.toISOString(),
    user: {
      discordId: s.user.discordId,
      displayName: mergedPublicDisplayName(s.user.displayName, s.user.discordUsername),
      avatarHash: s.user.avatarHash,
    },
  }));

  return jsonResponse(env, request, { submissions, total, limit, offset });
}

/** GET — vote tallies grouped by track */
export async function handleVotesResultsGet(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? monthKey();
  if (!MONTH_RE.test(month)) {
    return jsonResponse(env, request, { error: "invalid_month" }, 400);
  }

  const rows = await prisma.submission.findMany({
    where: {
      month,
      OR: [
        { submissionStatus: "PUBLISHED" },
        { submissionStatus: "APPROVED" },
        { AND: [{ submissionStatus: null }, { isApproved: true }] },
      ],
    },
    select: {
      id: true,
      title: true,
      track: true,
      tier: true,
      votes: true,
    },
    orderBy: [{ track: "asc" }, { votes: "desc" }],
  });

  const byTrack: Record<string, typeof rows> = {};
  for (const r of rows) {
    const t = r.track || "DEVELOPER";
    if (!byTrack[t]) byTrack[t] = [];
    byTrack[t]!.push(r);
  }

  return jsonResponse(env, request, { month, results: byTrack });
}

/** POST — toggle like on article */
export async function handleBlogLikePost(
  prisma: PrismaClient,
  blogId: string,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    select: { id: true },
  });
  if (!user) return jsonResponse(env, request, { error: "user_not_found" }, 404);

  const blog = await prisma.blog.findFirst({
    where: { id: blogId, kind: "ARTICLE" },
    select: { id: true, upvotes: true },
  });
  if (!blog) return jsonResponse(env, request, { error: "not_found" }, 404);

  const existing = await prisma.blogLike.findUnique({
    where: { blogId_userId: { blogId, userId: user.id } },
  });

  if (existing) {
    await prisma.blogLike.delete({ where: { blogId_userId: { blogId, userId: user.id } } });
    await prisma.blog.update({
      where: { id: blogId },
      data: { upvotes: { decrement: 1 } },
    });
    const b = await prisma.blog.findUnique({ where: { id: blogId }, select: { upvotes: true } });
    return jsonResponse(env, request, { liked: false, upvotes: b?.upvotes ?? 0 });
  }

  await prisma.blogLike.create({ data: { blogId, userId: user.id } });
  await prisma.blog.update({
    where: { id: blogId },
    data: { upvotes: { increment: 1 } },
  });
  const b = await prisma.blog.findUnique({ where: { id: blogId }, select: { upvotes: true } });
  return jsonResponse(env, request, { liked: true, upvotes: b?.upvotes ?? 0 });
}

/** GET — whether current user liked each blog (for hydration) */
export async function handleBlogLikesMineGet(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const user = await prisma.user.findUnique({
    where: { discordId: ctx.session.discordId },
    select: { id: true },
  });
  if (!user) return jsonResponse(env, request, { error: "user_not_found" }, 404);

  const likes = await prisma.blogLike.findMany({
    where: { userId: user.id },
    select: { blogId: true },
  });

  return jsonResponse(env, request, { likedBlogIds: likes.map((l) => l.blogId) });
}

/** POST multipart — design image to R2 (optional binding) */
export async function handleDesignImageUpload(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const bucket = env.SUBMISSIONS_BUCKET;
  if (!bucket) {
    return jsonResponse(
      env,
      request,
      {
        error: "upload_not_configured",
        message: "Configure SUBMISSIONS_BUCKET (R2) on the Worker to enable image uploads.",
      },
      501,
    );
  }

  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const ct = request.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return jsonResponse(env, request, { error: "expected_multipart" }, 400);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonResponse(env, request, { error: "missing_file" }, 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return jsonResponse(env, request, { error: "file_too_large", message: "Max 10MB." }, 400);
  }
  const mime = (file.type || "").toLowerCase();
  if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
    return jsonResponse(env, request, { error: "invalid_image_type" }, 400);
  }

  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const key = `design/${ctx.session.discordId}/${crypto.randomUUID()}.${ext}`;
  const buf = await file.arrayBuffer();
  await bucket.put(key, buf, {
    httpMetadata: { contentType: mime },
  });

  const base = env.BASE_URL?.replace(/\/$/, "") || env.WORKER_PUBLIC_URL?.replace(/\/$/, "") || "";
  const url = `${base}/api/media/r2/${encodeURIComponent(key)}`;
  return jsonResponse(env, request, {
    url,
    imageMeta: JSON.stringify({ mime }),
  });
}

/** GET — stream public R2 object (design uploads) */
export async function handleR2MediaGet(
  _prisma: PrismaClient,
  keyEncoded: string,
  env: WorkerBindings,
): Promise<Response> {
  const bucket = env.SUBMISSIONS_BUCKET;
  if (!bucket) return new Response("Not found", { status: 404 });
  const key = decodeURIComponent(keyEncoded);
  if (!key.startsWith("design/")) return new Response("Not found", { status: 404 });
  const obj = await bucket.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  const ct = obj.httpMetadata?.contentType ?? "application/octet-stream";
  headers.set("Content-Type", ct);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  const body = await obj.arrayBuffer();
  return new Response(body, { headers });
}
