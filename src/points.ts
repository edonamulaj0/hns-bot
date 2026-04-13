import type { PrismaClient } from "@prisma/client/edge";
import type { WorkerBindings } from "./worker-env";
import { syncUserRole } from "./role-manager";

export const XP = {
  SUBMISSION_APPROVED: 50,
  VOTE_RECEIVED: 2,
  BLOG_POSTED: 10,
  PULSE_MAX: 100,
  ENROLLMENT_BONUS: 25,
  FIRST_SUBMISSION: 10,
} as const;

/**
 * Add points to a user and recompute rank (rank = position by points descending).
 * Uses a single $executeRaw query for efficient batch rank computation.
 * This is much faster than individual updates per user (N+1 problem).
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

  await prisma.$executeRaw`
    UPDATE "User"
    SET rank = (
      SELECT COUNT(*) + 1
      FROM "User" u2
      WHERE u2.points > "User".points
    )
  `;

  await syncUserRole(
    prisma,
    updated.discordId,
    updated.points,
    env.DISCORD_GUILD_ID,
    env.DISCORD_TOKEN,
  );
}

export function formatLeaderboardEmbed(
  members: Array<{ discordId: string; points: number; rank: number }>,
  month: string,
): object {
  const medals = ["🥇", "🥈", "🥉"];
  const rows = members
    .slice(0, 10)
    .map((m, i) => {
      const medal = medals[i] ?? `**#${i + 1}**`;
      return `${medal} <@${m.discordId}> — **${m.points} XP**`;
    })
    .join("\n");

  return {
    title: `🏆 Leaderboard — ${month}`,
    description: rows || "No members yet.",
    color: 0xfee75c,
    footer: { text: "XP earned via submissions, blogs, and GitHub pulse" },
  };
}
