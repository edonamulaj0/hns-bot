import { Components, Select } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey } from "../time";
import { getDiscordUserId } from "./helpers";
import { syncDiscordIdentity } from "../discord-identity";
import { sendDirectMessage } from "../discord-api";

function trackLabel(track: string): string {
  return track === "HACKER" ? "Hacker" : "Developer";
}

export function registerEnroll(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("enroll", async (c) => {
      const discordId = getDiscordUserId(c.interaction);
      if (!discordId) {
        return c.flags("EPHEMERAL").res("Could not detect your Discord ID.");
      }

      const prisma = getPrisma(c.env.DB);
      await syncDiscordIdentity(prisma, discordId, c.interaction);

      const phase = getMonthlyPhase();
      const m = monthKey();
      if (phase !== "BUILD") {
        return c.flags("EPHEMERAL").res(
          `Enrollment is closed for **${m}**. The build window has ended.`,
        );
      }

      const challenges = await prisma.challenge.findMany({
        where: { month: m },
        orderBy: [{ track: "asc" }, { tier: "asc" }],
      });

      if (challenges.length === 0) {
        return c.flags("EPHEMERAL").res(
          `No challenges have been posted for **${m}** yet. Check back soon.`,
        );
      }

      const options = challenges.map((ch) => ({
        label: `${trackLabel(ch.track)} — ${ch.tier}: ${ch.title}`.slice(0, 100),
        value: ch.id,
        description: undefined,
      }));

      return c.flags("EPHEMERAL").res({
        content: "Pick a challenge to enroll in for this month:",
        components: new Components().row(
          new Select("enroll_menu", "String")
            .placeholder("Choose a challenge")
            .options(...options),
        ),
      });
    })
    .component("enroll_menu", (c) =>
      c.flags("EPHEMERAL").resDefer(async (ctx) => {
        const prisma = getPrisma(ctx.env.DB);
        const discordId = getDiscordUserId(ctx.interaction);
        if (!discordId) {
          await ctx.followup({
            content: "Could not detect your Discord ID.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await syncDiscordIdentity(prisma, discordId, ctx.interaction);

        const challengeId = ctx.interaction.data?.values?.[0];
        if (!challengeId) {
          await ctx.followup({
            content: "No challenge selected.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const challenge = await prisma.challenge.findUnique({
          where: { id: challengeId },
        });
        if (!challenge) {
          await ctx.followup({
            content: "That challenge no longer exists.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const user = await prisma.user.upsert({
          where: { discordId },
          create: { discordId },
          update: {},
        });

        await prisma.enrollment.upsert({
          where: {
            userId_challengeId: { userId: user.id, challengeId },
          },
          create: { userId: user.id, challengeId },
          update: {},
        });

        const brief =
          challenge.description.length > 300
            ? `${challenge.description.slice(0, 300)}…`
            : challenge.description;

        await ctx.followup({
          embeds: [
            {
              title: `✅ Enrolled in ${challenge.tier} ${trackLabel(challenge.track)} Challenge`,
              color: 0xccff00,
              fields: [
                { name: "Challenge", value: challenge.title, inline: false },
                { name: "Month", value: challenge.month, inline: true },
                { name: "Track", value: trackLabel(challenge.track), inline: true },
                { name: "Tier", value: challenge.tier, inline: true },
                { name: "Brief", value: brief.slice(0, 1024), inline: false },
              ],
              footer: {
                text: "Submit your work with /submit before day 21. Full brief in #challenges.",
              },
            },
          ],
          flags: MessageFlags.Ephemeral,
        });

        const token = ctx.env.DISCORD_TOKEN;
        await sendDirectMessage(token, discordId, {
          content: `📋 **${challenge.title}** (${challenge.month})\n\n${challenge.description.slice(0, 3500)}${challenge.description.length > 3500 ? "…" : ""}${challenge.resources ? `\n\n**Resources**\n${challenge.resources.slice(0, 1500)}` : ""}`,
        }).catch(() => {});
      }),
    );
}
