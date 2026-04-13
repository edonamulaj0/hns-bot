import type { DiscordHono } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { monthKey } from "../time";
import { isAdmin } from "./admin";

async function editSourceMessage(ctx: any, content: string) {
  const channelId = ctx.interaction?.channel_id;
  const messageId = ctx.interaction?.message?.id;
  if (!channelId || !messageId) return false;
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${ctx.env.DISCORD_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, components: [] }),
  });
  return res.ok;
}

export function registerAdminResetMonth(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-reset-month", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized." });
        return;
      }

      const currentMonth = monthKey();
      await ctx.followup({
        content:
          `⚠️ This will delete all Challenge, Enrollment, Submission, and Vote records for ${currentMonth}. ` +
          "Config flags will also be reset.\nThis cannot be undone.",
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 4,
                label: "Confirm reset",
                custom_id: `admin:confirm-reset:${currentMonth}`,
              },
              {
                type: 2,
                style: 2,
                label: "Cancel",
                custom_id: "admin:cancel",
              },
            ],
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    }),
  );
}

export async function handleAdminResetComponent(ctx: any): Promise<boolean> {
  const customId: string = ctx.interaction?.data?.custom_id ?? "";
  if (!customId.startsWith("admin:confirm-reset:") && customId !== "admin:cancel") {
    return false;
  }

  if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
    await ctx.followup({ content: "⛔ Unauthorized.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (customId === "admin:cancel") {
    const ok = await editSourceMessage(ctx, "Cancelled. No data was changed.");
    if (!ok) {
      await ctx.followup({ content: "Cancelled. No data was changed.", flags: MessageFlags.Ephemeral });
    }
    return true;
  }

  const currentMonth = customId.replace("admin:confirm-reset:", "").trim() || monthKey();
  const prisma = getPrisma(ctx.env.DB);

  await prisma.vote.deleteMany({
    where: { submission: { month: currentMonth } },
  });
  await prisma.submission.deleteMany({
    where: { month: currentMonth },
  });
  await prisma.enrollment.deleteMany({
    where: { challenge: { month: currentMonth } },
  });
  await prisma.challenge.deleteMany({
    where: { month: currentMonth },
  });

  let cfg = await prisma.config.findFirst();
  if (!cfg) cfg = await prisma.config.create({ data: {} });
  await prisma.config.update({
    where: { id: cfg.id },
    data: {
      lastChallengeMonth: "",
      lastVoteFeedMonth: "",
      lastPublishMonth: "",
    },
  });

  const ok = await editSourceMessage(
    ctx,
    `✅ ${currentMonth} data cleared. Bot will regenerate challenges on next /admin-test-generate or day-1 cron.`,
  );
  if (!ok) {
    await ctx.followup({
      content: `✅ ${currentMonth} data cleared. Bot will regenerate challenges on next /admin-test-generate or day-1 cron.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  return true;
}
