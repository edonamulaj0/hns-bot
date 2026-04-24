import type { PrismaClient } from "@prisma/client/edge";
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
