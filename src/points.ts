import type { PrismaClient } from "@prisma/client/edge";

export const XP = {
  SUBMISSION_APPROVED: 50,
  BLOG_POSTED: 10,
  VOTE_RECEIVED: 2,
} as const;

/**
 * Add points to a user and recompute rank (rank = position by points descending).
 * Uses a two-query approach that's safe in D1's SQLite.
 */
export async function awardPoints(
  prisma: PrismaClient,
  userId: string,
  amount: number,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { points: { increment: amount } },
  });

  // Rerank: fetch all users sorted by points desc, assign rank 1..N
  const all = await prisma.user.findMany({
    orderBy: [{ points: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  // D1 doesn't support batch updates in Prisma directly, so we use a transaction-style loop
  for (let i = 0; i < all.length; i++) {
    await prisma.user.update({
      where: { id: all[i].id },
      data: { rank: i + 1 },
    });
  }
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
