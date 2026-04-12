import { Components, Select } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey } from "../time";
import { getDiscordUserId } from "./helpers";
import { syncDiscordIdentity } from "../discord-identity";
import { sendDirectMessage } from "../discord-api";
import type { PrismaClient } from "@prisma/client/edge";

function trackLabel(track: string): string {
  return track === "HACKER" ? "Hacker" : "Developer";
}

function webBase(env: { BASE_URL?: string }): string {
  return env.BASE_URL?.replace(/\/$/, "") || "https://h4cknstack.com";
}

async function requireProfile(
  prisma: PrismaClient,
  discordId: string,
  base: string,
): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const row = await prisma.user.findUnique({
    where: { discordId },
    select: { id: true, profileCompletedAt: true },
  });
  if (!row?.profileCompletedAt) {
    return {
      ok: false,
      message: `Set up your profile first at ${base}/profile`,
    };
  }
  return { ok: true, userId: row.id };
}

export async function processDiscordEnrollment(
  ctx: {
    env: HonoWorkerEnv["Bindings"];
    followup: (opts: Record<string, unknown>) => Promise<void>;
    interaction: { member?: { user?: { id?: string } }; user?: { id?: string } };
  },
  discordId: string,
  challengeId: string,
): Promise<void> {
  const prisma = getPrisma(ctx.env.DB);
  const base = webBase(ctx.env);

  await syncDiscordIdentity(prisma, discordId, ctx.interaction);

  const phase = getMonthlyPhase();
  const m = monthKey();
  if (phase !== "BUILD") {
    await ctx.followup({
      content: `Enrollment is closed for **${m}**. The build window has ended.`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const prof = await requireProfile(prisma, discordId, base);
  if (!prof.ok) {
    await ctx.followup({ content: prof.message, flags: MessageFlags.Ephemeral });
    return;
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
  });
  if (!challenge || challenge.month !== m) {
    await ctx.followup({
      content: "That challenge is not available for enrollment.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await prisma.enrollment.upsert({
    where: {
      userId_challengeId: { userId: prof.userId, challengeId },
    },
    create: { userId: prof.userId, challengeId },
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
          text: `Build and submit at ${base}/submit before day 21.`,
        },
      },
    ],
    flags: MessageFlags.Ephemeral,
  });

  await sendDirectMessage(ctx.env.DISCORD_TOKEN, discordId, {
    content: `📋 **${challenge.title}** (${challenge.month})\n\n${challenge.description.slice(0, 3500)}${challenge.description.length > 3500 ? "…" : ""}${challenge.resources ? `\n\n**Resources**\n${challenge.resources.slice(0, 1500)}` : ""}`,
  }).catch(() => {});
}

export function registerEnroll(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("enroll", async (c) => {
      const discordId = getDiscordUserId(c.interaction);
      if (!discordId) {
        return c.flags("EPHEMERAL").res("Could not detect your Discord ID.");
      }

      const prisma = getPrisma(c.env.DB);
      const base = webBase(c.env);
      await syncDiscordIdentity(prisma, discordId, c.interaction);

      const phase = getMonthlyPhase();
      const m = monthKey();
      if (phase !== "BUILD") {
        return c.flags("EPHEMERAL").res(
          `Enrollment is closed for **${m}**. The build window has ended.`,
        );
      }

      const prof = await requireProfile(prisma, discordId, base);
      if (!prof.ok) {
        return c.flags("EPHEMERAL").res(prof.message);
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
        const discordId = getDiscordUserId(ctx.interaction);
        if (!discordId) {
          await ctx.followup({
            content: "Could not detect your Discord ID.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const challengeId = ctx.interaction.data?.values?.[0];
        if (!challengeId) {
          await ctx.followup({
            content: "No challenge selected.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        await processDiscordEnrollment(ctx, discordId, challengeId);
      }),
    );
}
