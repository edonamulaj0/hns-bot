import { PrismaClient } from "@prisma/client/edge";
import type { WorkerBindings } from "./worker-env";
import { getMonthlyPhase, monthKey } from "./time";
import { getPrisma } from "./db";

/** Stable pathname for routing (collapse slashes, trim trailing slash, keep leading slash). */
export function getNormalizedPathname(request: Request): string {
  try {
    let p = new URL(request.url).pathname.replace(/\/+/g, "/");
    if (p.length > 1 && p.endsWith("/")) {
      p = p.slice(0, -1);
    }
    return p || "/";
  } catch {
    return "/";
  }
}

export function unknownApiRouteResponse(
  pathname: string,
  requestUrl: string,
): Response {
  return corsJson(
    {
      error: "unknown_api_route",
      pathname,
      requestUrl,
      hint: "If pathname is not /api/..., a zone route or proxy may be stripping or prefixing paths. In Cloudflare, attach this Worker to * / * for the hostname you use.",
    },
    404,
  );
}

export async function handleApiRequest(
  request: Request,
  env: WorkerBindings,
): Promise<Response | null> {
  const pathname = getNormalizedPathname(request);
  if (!pathname.startsWith("/api/")) return null;

  const method = request.method;
  if (method !== "GET" && method !== "HEAD") return null;

  const prisma = getPrisma(env.DB);
  const now = new Date();
  const phase = getMonthlyPhase(now);
  const currentMonth = monthKey(now);

  let body: Response;
  try {
    switch (pathname) {
      case "/api/portfolio":
        body = await portfolioResponse(prisma, phase, currentMonth);
        break;
      case "/api/members":
        body = await membersResponse(prisma);
        break;
      case "/api/leaderboard":
        body = await leaderboardResponse(prisma);
        break;
      case "/api/blogs":
        body = await blogsResponse(prisma);
        break;
      case "/api/challenges": {
        const url = new URL(request.url);
        const track = url.searchParams.get("track");
        const monthQ = url.searchParams.get("month");
        if (track !== "DEVELOPER" && track !== "HACKER") {
          body = corsJson(
            { error: "Invalid or missing track (use DEVELOPER or HACKER)" },
            400,
          );
          break;
        }
        body = await challengesResponse(prisma, track, monthQ);
        break;
      }
      default:
        return null;
    }
  } catch (err) {
    console.error("handleApiRequest:", err);
    return corsJson(
      {
        error: "api_error",
        message: err instanceof Error ? err.message : String(err),
      },
      500,
    );
  }

  const headers = new Headers(body.headers);
  headers.set("X-HNS-Route", "api");
  const withTag = new Response(body.body, {
    status: body.status,
    headers,
  });

  if (method === "HEAD") {
    return new Response(null, {
      status: withTag.status,
      headers: withTag.headers,
    });
  }

  return withTag;
}

async function portfolioResponse(
  prisma: PrismaClient,
  phase: string,
  currentMonth: string,
): Promise<Response> {
  const approved = await prisma.submission.findMany({
    where: {
      isApproved: true,
      month:
        phase === "PUBLISH" || phase === "POST_PUBLISH"
          ? { lte: currentMonth }
          : { lt: currentMonth },
    },
    include: {
      user: {
        select: {
          discordId: true,
          discordUsername: true,
          displayName: true,
          bio: true,
          github: true,
          linkedin: true,
          techStack: true,
          points: true,
          rank: true,
        },
      },
    },
    orderBy: [{ month: "desc" }, { votes: "desc" }, { createdAt: "desc" }],
  });

  const grouped = approved.reduce<Record<string, unknown[]>>((acc, item) => {
    const bucket = acc[item.month] ?? [];
    bucket.push({
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
      createdAt: item.createdAt.toISOString(),
      user: item.user,
    });
    acc[item.month] = bucket;
    return acc;
  }, {});

  return corsJson({ phase, month: currentMonth, published: grouped });
}

async function membersResponse(prisma: PrismaClient): Promise<Response> {
  const members = await prisma.user.findMany({
    where: {
      OR: [
        { profileCompletedAt: { not: null } },
        { bio: { not: null } },
        { github: { not: null } },
        { linkedin: { not: null } },
      ],
    },
    select: {
      discordId: true,
      discordUsername: true,
      displayName: true,
      bio: true,
      github: true,
      linkedin: true,
      techStack: true,
      points: true,
      rank: true,
      createdAt: true,
      _count: { select: { submissions: true, blogs: true } },
      submissions: {
        where: { isApproved: true },
        select: { id: true, title: true, month: true, tier: true, votes: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { rank: "asc" },
  });

  return corsJson(
    { members },
    200,
    "private, no-store, must-revalidate",
  );
}

async function leaderboardResponse(prisma: PrismaClient): Promise<Response> {
  const top = await prisma.user.findMany({
    where: { points: { gt: 0 } },
    select: {
      discordId: true,
      discordUsername: true,
      displayName: true,
      bio: true,
      github: true,
      techStack: true,
      points: true,
      rank: true,
    },
    orderBy: [{ points: "desc" }, { rank: "asc" }],
    take: 50,
  });

  return corsJson(
    { leaderboard: top },
    200,
    "private, no-store, must-revalidate",
  );
}

const MONTH_PARAM_RE = /^\d{4}-\d{2}$/;

async function challengesResponse(
  prisma: PrismaClient,
  track: string,
  monthQ: string | null,
): Promise<Response> {
  const where: { track: string; month?: string } = { track };
  if (monthQ && MONTH_PARAM_RE.test(monthQ)) {
    where.month = monthQ;
  }

  const rows = await prisma.challenge.findMany({
    where,
    orderBy: [{ month: "desc" }, { tier: "asc" }],
    include: {
      _count: { select: { enrollments: true } },
    },
  });

  const ids = rows.map((r) => r.id);
  const subAgg =
    ids.length === 0
      ? []
      : await prisma.submission.groupBy({
          by: ["challengeId"],
          where: {
            isApproved: true,
            challengeId: { in: ids },
          },
          _count: { id: true },
        });
  const subMap = new Map(
    subAgg.map((s) => [s.challengeId as string, s._count.id]),
  );

  const challenges = rows.map((r) => ({
    id: r.id,
    month: r.month,
    track: r.track,
    tier: r.tier,
    title: r.title,
    description: r.description,
    resources: r.resources,
    publishedAt: r.publishedAt.toISOString(),
    enrollmentCount: r._count.enrollments,
    submissionCount: subMap.get(r.id) ?? 0,
  }));

  return corsJson({ challenges });
}

async function blogsResponse(prisma: PrismaClient): Promise<Response> {
  const rows = await prisma.blog.findMany({
    include: {
      user: {
        select: {
          discordId: true,
          discordUsername: true,
          displayName: true,
          github: true,
        },
      },
    },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const blogs = rows.map((b) => ({
    id: b.id,
    title: b.title,
    url: b.url,
    upvotes: b.upvotes,
    createdAt: b.createdAt,
    user: b.user,
    content: b.content ? b.content.slice(0, 500) : null,
  }));

  return corsJson({ blogs });
}

function corsJson(
  data: unknown,
  status = 200,
  cacheControl = "public, max-age=60",
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": cacheControl,
    },
  });
}
