import type { PrismaClient } from "@prisma/client/edge";
import type { D1Database } from "@cloudflare/workers-types";
import type { WorkerBindings } from "./worker-env";
import { syncUserRole } from "./role-manager";

export const XP = {
  SUBMISSION_APPROVED: 50,
  VOTE_RECEIVED: 2,
  BLOG_POSTED: 10,
  ENROLLMENT_BONUS: 25,
  FIRST_SUBMISSION: 10,
} as const;

/**
 * Competitive rank by XP: rank = 1 + count of users with strictly higher points.
 * Same XP => same rank. Zero XP included.
 */
export async function recomputeAllUserRanks(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET rank = (
      SELECT COUNT(*) + 1
      FROM "User" u2
      WHERE u2.points > "User".points
    )
  `;
}

/**
 * Add points to a user and recompute everyone's rank (batch update).
 */
export async function awardPoints(
  prisma: PrismaClient,
  userId: string,
  amount: number,
  env: WorkerBindings,
): Promise<void> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
    select: { discordId: true, points: true },
  });

  await recomputeAllUserRanks(prisma);

  await syncUserRole(
    prisma,
    updated.discordId,
    updated.points,
    env.DISCORD_GUILD_ID,
    env.DISCORD_TOKEN,
  );
}

export type PulseAwardDetails = {
  source?: string;
  commits?: number;
  prsOpened?: number;
  prsMerged?: number;
  prReviews?: number | null;
};

export async function ensurePulseAwardTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS "PulseAward" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "month" TEXT NOT NULL,
        "xp" INTEGER NOT NULL,
        "source" TEXT,
        "commits" INTEGER NOT NULL DEFAULT 0,
        "prsOpened" INTEGER NOT NULL DEFAULT 0,
        "prsMerged" INTEGER NOT NULL DEFAULT 0,
        "prReviews" INTEGER,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PulseAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
    )
    .run();
  await db
    .prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS "PulseAward_userId_month_key" ON "PulseAward"("userId", "month")`,
    )
    .run();
  await db
    .prepare(`CREATE INDEX IF NOT EXISTS "PulseAward_month_idx" ON "PulseAward"("month")`)
    .run();
}

export async function insertPulseAward(
  db: D1Database,
  userId: string,
  month: string,
  xp: number,
  details: PulseAwardDetails = {},
): Promise<boolean> {
  await ensurePulseAwardTable(db);
  const res = await db
    .prepare(
      `INSERT OR IGNORE INTO "PulseAward"
        ("id", "userId", "month", "xp", "source", "commits", "prsOpened", "prsMerged", "prReviews")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID().replace(/-/g, ""),
      userId,
      month,
      xp,
      details.source ?? null,
      details.commits ?? 0,
      details.prsOpened ?? 0,
      details.prsMerged ?? 0,
      details.prReviews ?? null,
    )
    .run();
  return (res.meta.changes ?? 0) > 0;
}

/**
 * Award GitHub pulse XP at most once per user per UTC month.
 */
export async function awardMonthlyPulsePoints(
  prisma: PrismaClient,
  userId: string,
  month: string,
  amount: number,
  env: WorkerBindings,
  details: PulseAwardDetails = {},
): Promise<{ awarded: boolean; points: number | null }> {
  if (amount <= 0) return { awarded: false, points: null };

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastPulseMonth: true, points: true },
  });
  if (existingUser?.lastPulseMonth === month) {
    return { awarded: false, points: existingUser.points };
  }

  const claimed = await insertPulseAward(env.DB, userId, month, amount, details);
  if (!claimed) {
    return { awarded: false, points: existingUser?.points ?? null };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      points: { increment: amount },
      lastPulseMonth: month,
    },
    select: { discordId: true, points: true },
  });

  await recomputeAllUserRanks(prisma);

  await syncUserRole(
    prisma,
    updated.discordId,
    updated.points,
    env.DISCORD_GUILD_ID,
    env.DISCORD_TOKEN,
  );

  return { awarded: true, points: updated.points };
}

function rankPrefix(rank: number): string {
  if (rank <= 0) return "—";
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `**#${rank}**`;
}

export function formatLeaderboardEmbed(
  members: Array<{ points: number; rank: number; displayLine: string }>,
  month: string,
): object {
  const rows = members
    .slice(0, 10)
    .map((m) => {
      const name = m.displayLine.trim() || "Member";
      return `${rankPrefix(m.rank)} **${name}** — **${m.points} XP**`;
    })
    .join("\n");

  return {
    title: `🏆 Leaderboard — ${month}`,
    description: rows || "No members yet.",
    color: 0xfee75c,
    footer: { text: "XP earned via submissions, articles, and votes" },
  };
}
