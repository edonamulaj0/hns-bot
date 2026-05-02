import type { DiscordHono } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { PrismaClient } from "@prisma/client/edge";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { monthKey } from "../time";
import { isAdmin } from "./admin";

/** Deletes votes, submissions, enrollments, and challenges for one calendar month (challenge cycle). */
export async function clearMonthChallengeAndRelated(prisma: PrismaClient, month: string): Promise<void> {
  await prisma.vote.deleteMany({
    where: { submission: { month } },
  });
  await prisma.submission.deleteMany({
    where: { month },
  });
  await prisma.enrollment.deleteMany({
    where: { challenge: { month } },
  });
  await prisma.challenge.deleteMany({
    where: { month },
  });
}

/** Replace the Discord component message (same `followup` target as `c.update().resDefer`). */
export async function patchAdminComponentMessage(ctx: any, content: string): Promise<void> {
  await ctx.followup({
    content,
    embeds: [],
    components: [],
  });
}

export function registerAdminResetMonth(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-reset-month", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized.", flags: MessageFlags.Ephemeral });
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

  if (customId === "admin:cancel") {
    await patchAdminComponentMessage(ctx, "Cancelled. No data was changed.");
    return true;
  }

  const currentMonth = customId.replace("admin:confirm-reset:", "").trim() || monthKey();
  const prisma = getPrisma(ctx.env.DB);

  await clearMonthChallengeAndRelated(prisma, currentMonth);

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

  await patchAdminComponentMessage(
    ctx,
    `✅ ${currentMonth} data cleared. Bot will regenerate challenges on next /admin-test-generate or day-1 cron.`,
  );
  return true;
}
