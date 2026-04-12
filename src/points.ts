import type { PrismaClient } from "@prisma/client/edge";

export const XP = {
  SUBMISSION_APPROVED: 50,
  BLOG_POSTED: 10,
  VOTE_RECEIVED: 2,
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
): Promise<void> {
  // Award points to the user
  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
  });

  // Use a single raw SQL query to compute ranks for ALL users at once
  // This avoids the N+1 problem of updating each user individually
  await prisma.$executeRaw`
    UPDATE User
    SET rank = (
      SELECT COUNT(*) + 1
      FROM User AS u2
      WHERE u2.points > User.points
         OR (u2.points = User.points AND u2.createdAt < User.createdAt)
    )
  `;
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
