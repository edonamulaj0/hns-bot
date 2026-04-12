import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { monthKey } from "../time";
import { formatLeaderboardEmbed } from "../points";
import { getDiscordUserId } from "./helpers";
import { syncDiscordIdentity } from "../discord-identity";

export function registerLeaderboard(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("leaderboard", async (c) =>
    c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const did = getDiscordUserId(ctx.interaction);
      if (did) await syncDiscordIdentity(prisma, did, ctx.interaction);
      const currentMonth = monthKey();

      const top = await prisma.user.findMany({
        where: { points: { gt: 0 } },
        select: { discordId: true, points: true, rank: true },
        orderBy: [{ points: "desc" }, { rank: "asc" }],
        take: 10,
      });

      await ctx.followup({
        embeds: [formatLeaderboardEmbed(top, currentMonth) as any],
      });
    }),
  );
}
