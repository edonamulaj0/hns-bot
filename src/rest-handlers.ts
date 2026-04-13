import type { PrismaClient } from "@prisma/client/edge";
import type { WorkerBindings } from "./worker-env";
import { getMonthlyPhase, monthKey } from "./time";
import { getSessionFromRequest } from "./session-verify";
import { requireGuildMembership } from "./membership";
import { castVote } from "./vote-service";
import { awardPoints, XP } from "./points";

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

  const submission = enrollment
    ? await prisma.submission.findFirst({
        where: {
          userId: user.id,
          month: m,
          challengeId: enrollment.challengeId,
        },
      })
    : null;

  return jsonResponse(env, request, {
    user: {
      id: user.id,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      displayName: user.displayName,
      avatarHash: user.avatarHash,
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
  });
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

  const body = await readJson<{ submissionId?: string }>(request);
  const submissionId = body?.submissionId?.trim();
  if (!submissionId) {
    return jsonResponse(env, request, { error: "missing_submissionId" }, 400);
  }

  const result = await castVote(prisma, ctx.session.discordId, submissionId, env);
  if (!result.ok) {
    return jsonResponse(env, request, { error: "vote_failed", message: result.message }, 400);
  }

  const remaining = await voteRemaining(prisma, ctx.session.discordId, monthKey());
  return jsonResponse(env, request, {
    votes: result.votes,
    votesRemaining: remaining.totalRemaining,
    developerVotesRemaining: remaining.devRem,
    hackerVotesRemaining: remaining.hackRem,
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
  return {
    totalRemaining: Math.max(0, 4 - total),
    devRem: Math.max(0, 2 - dev),
    hackRem: Math.max(0, 2 - hack),
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

  return jsonResponse(env, request, {
    month,
    totalVotes: total,
    developerVotes: dev,
    hackerVotes: hack,
    developerVotesRemaining: Math.max(0, 2 - dev),
    hackerVotesRemaining: Math.max(0, 2 - hack),
    totalVotesRemaining: Math.max(0, 4 - total),
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
    where: { month, isApproved: true },
    include: {
      user: {
        select: {
          discordId: true,
          discordUsername: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ track: "asc" }, { tier: "asc" }, { votes: "desc" }],
  });

  const submissions = subs.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    tier: s.tier,
    track: s.track,
    votes: s.votes,
    redirectSlug: s.redirectSlug,
    revealed: s.revealed,
    repoUrl: s.revealed ? s.repoUrl : null,
    demoUrl: s.revealed ? s.demoUrl : null,
    author: s.revealed
      ? {
          discordId: s.user.discordId,
          discordUsername: s.user.discordUsername,
          displayName: s.user.displayName,
        }
      : null,
  }));

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
          discordUsername: true,
          displayName: true,
        },
      },
    },
  });
  if (!s) {
    return jsonResponse(env, request, { error: "not_found" }, 404);
  }

  if (!s.revealed) {
    return jsonResponse(env, request, {
      id: s.id,
      title: s.title,
      description: s.description,
      tier: s.tier,
      track: s.track,
      votes: s.votes,
      redirectSlug: s.redirectSlug,
      revealed: false,
    });
  }

  return jsonResponse(env, request, {
    id: s.id,
    title: s.title,
    description: s.description,
    tier: s.tier,
    track: s.track,
    votes: s.votes,
    redirectSlug: s.redirectSlug,
    revealed: true,
    repoUrl: s.repoUrl,
    demoUrl: s.demoUrl,
    userId: s.userId,
    user: s.user,
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
    return jsonResponse(env, request, { error: "enrollment_closed" }, 400);
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
    const displayName = body.displayName?.trim() ?? null;
    if (displayName && displayName.length > 32) {
      return validation("displayName", "displayName max length is 32.");
    }
    data.displayName = displayName;
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
    const github = body.github?.trim() || null;
    if (
      github &&
      !github.startsWith("https://github.com/") &&
      !github.startsWith("https://gitlab.com/")
    ) {
      return validation("github", "github must start with https://github.com/ or https://gitlab.com/.");
    }
    data.github = github;
  }

  if (body.linkedin !== undefined) {
    if (body.linkedin !== null && typeof body.linkedin !== "string") {
      return validation("linkedin", "linkedin must be a string or null.");
    }
    const linkedin = body.linkedin?.trim() || null;
    if (linkedin && !linkedin.startsWith("https://linkedin.com/")) {
      return validation("linkedin", "linkedin must start with https://linkedin.com/.");
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

export async function handleSubmitPost(
  prisma: PrismaClient,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
  const phase = getMonthlyPhase();
  if (phase !== "BUILD") {
    return jsonResponse(env, request, { error: "submissions_closed" }, 400);
  }

  const ctx = await authCtx(prisma, request, env);
  if (!ctx.session) return ctx.membershipError!;

  const body = await readJson<{
    title?: string;
    description?: string;
    repoUrl?: string;
    demoUrl?: string | null;
    attachmentUrl?: string | null;
  }>(request);
  if (!body?.title?.trim() || !body.description?.trim() || !body.repoUrl?.trim()) {
    return jsonResponse(env, request, { error: "missing_fields" }, 400);
  }

  const title = body.title.trim();
  const description = body.description.trim();
  const repoUrl = body.repoUrl.trim();

  if (title.length < 5 || title.length > 100) {
    return jsonResponse(env, request, { error: "title_length" }, 400);
  }
  if (description.length < 100 || description.length > 2000) {
    return jsonResponse(env, request, { error: "description_length" }, 400);
  }

  const repoOk = await validateRepoReachable(repoUrl);
  if (!repoOk) {
    return jsonResponse(env, request, { error: "repo_unreachable" }, 400);
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

  if (ch.track === "HACKER") {
    const hasAtt = Boolean(body.attachmentUrl?.trim());
    const hasDemo = Boolean(body.demoUrl?.trim());
    if (!hasAtt && !hasDemo) {
      return jsonResponse(
        env,
        request,
        { error: "hacker_requires_attachment_or_demo" },
        400,
      );
    }
  }

  const slug = await uniqueRedirectSlug(prisma);

  const sub = await prisma.submission.create({
    data: {
      userId: user.id,
      month: m,
      tier: ch.tier,
      track: ch.track,
      title,
      description,
      repoUrl,
      demoUrl: body.demoUrl?.trim() || null,
      attachmentUrl: body.attachmentUrl?.trim() || null,
      challengeId: ch.id,
      isApproved: true,
      revealed: false,
      isLocked: false,
      redirectSlug: slug,
    },
  });

  await awardPoints(prisma, user.id, XP.SUBMISSION_APPROVED, env);

  if (sub.challengeId) {
    await awardPoints(prisma, user.id, XP.ENROLLMENT_BONUS, env);
  }

  const approvedCount = await prisma.submission.count({
    where: { userId: user.id, isApproved: true },
  });
  if (approvedCount === 1) {
    await awardPoints(prisma, user.id, XP.FIRST_SUBMISSION, env);
  }

  return jsonResponse(env, request, { ok: true, submission: sub });
}

export async function handleSubmitPatch(
  prisma: PrismaClient,
  id: string,
  request: Request,
  env: WorkerBindings,
): Promise<Response> {
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
  });
  if (!sub) {
    return jsonResponse(env, request, { error: "not_found" }, 404);
  }
  if (sub.isLocked) {
    return jsonResponse(env, request, { error: "locked" }, 403);
  }

  const body = await readJson<{
    title?: string;
    description?: string;
    repoUrl?: string;
    demoUrl?: string | null;
    attachmentUrl?: string | null;
  }>(request);
  if (!body) {
    return jsonResponse(env, request, { error: "invalid_json" }, 400);
  }

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
  if (body.repoUrl !== undefined) {
    const r = body.repoUrl.trim();
    const ok = await validateRepoReachable(r);
    if (!ok) return jsonResponse(env, request, { error: "repo_unreachable" }, 400);
    data.repoUrl = r;
  }
  if (body.demoUrl !== undefined) data.demoUrl = body.demoUrl?.trim() || null;
  if (body.attachmentUrl !== undefined) data.attachmentUrl = body.attachmentUrl?.trim() || null;

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
    select: { id: true, isApproved: true, challengeId: true },
  });
  if (!sub) {
    return jsonResponse(env, request, { error: "not_found" }, 404);
  }

  await prisma.submission.delete({ where: { id: sub.id } });

  const deduction =
    (sub.isApproved ? XP.SUBMISSION_APPROVED : 0) +
    (sub.challengeId ? XP.ENROLLMENT_BONUS : 0);
  if (deduction > 0) {
    await awardPoints(prisma, user.id, -deduction, env);
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true },
  });

  return jsonResponse(env, request, { deleted: true, newXp: updatedUser?.points ?? 0 });
}
