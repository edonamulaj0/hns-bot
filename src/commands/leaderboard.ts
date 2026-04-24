import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { monthKey } from "../time";
import { formatLeaderboardEmbed } from "../points";
import { mergedPublicDisplayName } from "../display-name";

export function registerLeaderboard(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("leaderboard", async (c) =>
    c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const currentMonth = monthKey();

      const top = await prisma.user.findMany({
        select: {
          discordId: true,
          points: true,
          rank: true,
          displayName: true,
          discordUsername: true,
        },
        orderBy: [{ points: "desc" }, { createdAt: "asc" }],
        take: 10,
      });

      const rows = top.map((u) => ({
        points: u.points,
        rank: u.rank,
        displayLine: mergedPublicDisplayName(u.displayName, u.discordUsername) || "Member",
      }));

      await ctx.followup({
        embeds: [formatLeaderboardEmbed(rows, currentMonth) as any],
      });
    }),
  );
}
