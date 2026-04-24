import { Components, Select } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey, nextUtcMonthFirstDateString } from "../time";
import { getDiscordUserId } from "./helpers";
import { sendDirectMessage } from "../discord-api";
import type { PrismaClient } from "@prisma/client/edge";
import { normalizeTrackParam, trackLabel } from "../tracks";
import { syncDesignEnrollmentRoles } from "../design-track-roles";

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

/** Deferred component/slash context from discord-hono (followup return type varies by version). */
export type EnrollmentDeferCtx = {
  env: HonoWorkerEnv["Bindings"];
  followup: (data?: object, file?: unknown) => Promise<unknown>;
};

export async function processDiscordEnrollment(
  ctx: EnrollmentDeferCtx,
  discordId: string,
  challengeId: string,
): Promise<void> {
  const prisma = getPrisma(ctx.env.DB);
  const base = webBase(ctx.env);

  const phase = getMonthlyPhase();
  const m = monthKey();
  if (phase !== "BUILD") {
    await ctx.followup({
      content: `Enrollment is closed. The next build window opens **${nextUtcMonthFirstDateString()}** (UTC, day 1).`,
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

  await syncDesignEnrollmentRoles(
    prisma,
    discordId,
    challenge.track,
    challenge.tier,
    ctx.env.DISCORD_GUILD_ID,
    ctx.env.DISCORD_TOKEN,
  ).catch(() => {});

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
      const phase = getMonthlyPhase();
      const m = monthKey();
      if (phase !== "BUILD") {
        return c.flags("EPHEMERAL").res(
          `Enrollment is closed. The next build window opens **${nextUtcMonthFirstDateString()}** (UTC, day 1).`,
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

      const selectedTrack = normalizeTrackParam((c.var as { track?: string }).track ?? "");
      const selectedTier = ((c.var as { tier?: string }).tier ?? "").trim();
      if (selectedTrack && selectedTier) {
        const picked = challenges.find(
          (ch) =>
            ch.track.toUpperCase() === selectedTrack &&
            ch.tier.toLowerCase() === selectedTier.toLowerCase(),
        );
        if (!picked) {
          return c.flags("EPHEMERAL").res(
            `No ${selectedTier} ${trackLabel(selectedTrack)} challenge found for **${m}**.`,
          );
        }

        await prisma.enrollment.upsert({
          where: {
            userId_challengeId: { userId: prof.userId, challengeId: picked.id },
          },
          create: { userId: prof.userId, challengeId: picked.id },
          update: {},
        });

        await syncDesignEnrollmentRoles(
          prisma,
          discordId,
          picked.track,
          picked.tier,
          c.env.DISCORD_GUILD_ID,
          c.env.DISCORD_TOKEN,
        ).catch(() => {});

        const brief =
          picked.description.length > 300
            ? `${picked.description.slice(0, 300)}…`
            : picked.description;

        await sendDirectMessage(c.env.DISCORD_TOKEN, discordId, {
          content: `📋 **${picked.title}** (${picked.month})\n\n${picked.description.slice(0, 3500)}${picked.description.length > 3500 ? "…" : ""}${picked.resources ? `\n\n**Resources**\n${picked.resources.slice(0, 1500)}` : ""}`,
        }).catch(() => {});

        return c.res({
          embeds: [
            {
              title: `✅ Enrolled in ${picked.tier} ${trackLabel(picked.track)} Challenge`,
              color: 0xccff00,
              fields: [
                { name: "Challenge", value: picked.title, inline: false },
                { name: "Month", value: picked.month, inline: true },
                { name: "Track", value: trackLabel(picked.track), inline: true },
                { name: "Tier", value: picked.tier, inline: true },
                { name: "Brief", value: brief.slice(0, 1024), inline: false },
              ],
              footer: {
                text: `Build and submit at ${base}/submit before day 21. Full brief sent in DM.`,
              },
            },
          ],
        });
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

        const selectValues = (ctx.interaction.data as { values?: string[] } | undefined)?.values ?? [];
        const challengeId = selectValues[0];
        if (!challengeId) {
          await ctx.followup({
            content: "No challenge selected.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const enrollCtx: EnrollmentDeferCtx = {
          env: ctx.env,
          followup: (data, file) =>
            file !== undefined
              ? ctx.followup(data as never, file as never)
              : ctx.followup(data as never),
        };

        await processDiscordEnrollment(enrollCtx, discordId, challengeId);
      }),
    );
}
