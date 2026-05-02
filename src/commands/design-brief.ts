import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { monthKey } from "../time";

const TIER_ORDER: Record<string, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

export function registerDesignBrief(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("design-brief", async (c) => {
    const prisma = getPrisma(c.env.DB);
    const m = monthKey();
    const list = await prisma.challenge.findMany({
      where: { month: m, track: "DESIGNERS" },
    });
    if (!list.length) {
      return c.flags("EPHEMERAL").res(`No design challenges posted for **${m}** yet.`);
    }
    list.sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9));

    const embeds = list.map((ch) => ({
      title: `${ch.tier} — ${ch.title}`,
      description: ch.description.slice(0, 4096),
      color: 0xd85a30,
      fields: [
        {
          name: "Deliverables",
          value: ch.deliverables.slice(0, 1024) || "—",
          inline: false,
        },
        ...(ch.resources?.trim()
          ? [{ name: "Resources", value: ch.resources.slice(0, 1024), inline: false }]
          : []),
      ],
    }));

    return c.res({
      content: `**Designer track · ${m}** — three tiers below.`,
      embeds,
    });
  });
}
