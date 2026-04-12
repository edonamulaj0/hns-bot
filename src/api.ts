import { PrismaClient } from "@prisma/client/edge";
import { PrismaD1 } from "@prisma/adapter-d1";
import type { WorkerBindings } from "./worker-env";
import { getMonthlyPhase, monthKey } from "./time";

function getPrisma(db: WorkerBindings["DB"]) {
  return new PrismaClient({ adapter: new PrismaD1(db) });
}

export async function handleApiRequest(
  request: Request,
  env: WorkerBindings,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== "GET") return null;

  const prisma = getPrisma(env.DB);
  const now = new Date();
  const phase = getMonthlyPhase(now);
  const currentMonth = monthKey(now);

  switch (url.pathname) {
    case "/api/portfolio":
      return portfolioResponse(prisma, phase, currentMonth);
    case "/api/members":
      return membersResponse(prisma);
    case "/api/leaderboard":
      return leaderboardResponse(prisma);
    case "/api/blogs":
      return blogsResponse(prisma);
    default:
      return null;
  }
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
      title: item.title,
      description: item.description,
      repoUrl: item.repoUrl,
      demoUrl: item.demoUrl,
      votes: item.votes,
      month: item.month,
      user: item.user,
    });
    acc[item.month] = bucket;
    return acc;
  }, {});

  return corsJson({ phase, month: currentMonth, published: grouped });
}

async function membersResponse(prisma: PrismaClient): Promise<Response> {
  const members = await prisma.user.findMany({
    select: {
      discordId: true,
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

  return corsJson({ members });
}

async function leaderboardResponse(prisma: PrismaClient): Promise<Response> {
  const top = await prisma.user.findMany({
    where: { points: { gt: 0 } },
    select: {
      discordId: true,
      bio: true,
      github: true,
      techStack: true,
      points: true,
      rank: true,
    },
    orderBy: [{ points: "desc" }, { rank: "asc" }],
    take: 50,
  });

  return corsJson({ leaderboard: top });
}

async function blogsResponse(prisma: PrismaClient): Promise<Response> {
  const blogs = await prisma.blog.findMany({
    include: {
      user: { select: { discordId: true, github: true } },
    },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return corsJson({ blogs });
}

function corsJson(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
