import type { DiscordHono } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import {
  generateChallenges,
  postChallengesToDiscord,
  type GeneratedChallengesResult,
} from "../challenge-generator";
import { getDiscordUserId } from "./helpers";
import { isAdmin } from "./admin";
import { clearMonthChallengeAndRelated, patchAdminComponentMessage } from "./admin-reset-month";

const previewCache = new Map<string, GeneratedChallengesResult>();

function previewFields(list: GeneratedChallengesResult["challenges"]) {
  return list.map((ch) => ({
    name: `${ch.track} — ${ch.tier}`,
    value: `**${ch.title}**\n${ch.description.slice(0, 150)}${ch.description.length > 150 ? "…" : ""}`,
    inline: false,
  }));
}

export function registerAdminTestGenerate(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-test-generate", async (c) =>
    c.resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized.", flags: MessageFlags.Ephemeral });
        return;
      }
      const discordId = getDiscordUserId(ctx.interaction);
      if (!discordId) {
        await ctx.followup({
          content: "Could not detect your Discord ID.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const prisma = getPrisma(ctx.env.DB);
      const generated = await generateChallenges({ env: ctx.env }, prisma, new Date());
      previewCache.set(`${discordId}:${generated.month}`, generated);

      const basePayload = {
        embeds: [
          {
            title: `🧪 Challenge generation preview — ${generated.month}`,
            color: 0xf59e0b,
            fields: previewFields(generated.challenges),
          },
        ],
      };

      if (generated.usedFallback) {
        const err = generated.error ?? "";
        const overloaded = /overloaded|529|rate_limit|503|unavailable/i.test(err);
        const content = overloaded
          ? "⚠️ **Claude is overloaded or rate-limited** (retries were already attempted). Showing **fallback** challenges — you can still post them, or run the command again later."
          : `❌ Generation failed. Error: ${err || "Unknown error"}\nShowing fallback challenges that would have been used.`;
        await ctx.followup({
          ...basePayload,
          content,
        });
        return;
      }

      await ctx.followup({
        ...basePayload,
        content:
          "Preview below — **Post for real** clears this month’s challenges + related enrollments/submissions/votes in the database, posts fresh embeds to the challenge channels, then edits this message.",
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 3,
                label: "Post for real",
                custom_id: `admin:confirm-post-challenges:${generated.month}`,
              },
              {
                type: 2,
                style: 2,
                label: "Discard",
                custom_id: "admin:discard-challenges",
              },
            ],
          },
        ],
      });
    }),
  );
}

export async function handleAdminGenerateComponent(ctx: any): Promise<boolean> {
  const customId: string = ctx.interaction?.data?.custom_id ?? "";
  if (
    !customId.startsWith("admin:confirm-post-challenges:") &&
    customId !== "admin:discard-challenges"
  ) {
    return false;
  }

  const discordId = getDiscordUserId(ctx.interaction);
  if (!discordId) {
    await patchAdminComponentMessage(ctx, "Could not detect your Discord ID.");
    return true;
  }

  if (customId === "admin:discard-challenges") {
    await patchAdminComponentMessage(ctx, "🗑️ Discarded. Nothing was posted.");
    return true;
  }

  const month = customId.replace("admin:confirm-post-challenges:", "").trim();
  const cached = previewCache.get(`${discordId}:${month}`);
  if (!cached) {
    await patchAdminComponentMessage(
      ctx,
      "Preview not found or expired. Run `/admin-test-generate` again.",
    );
    return true;
  }

  try {
    const prisma = getPrisma(ctx.env.DB);
    await clearMonthChallengeAndRelated(prisma, month);
    await postChallengesToDiscord({ env: ctx.env }, prisma, month, cached.challenges);
    previewCache.delete(`${discordId}:${month}`);
    await patchAdminComponentMessage(
      ctx,
      "✅ This month’s challenge data was cleared and replaced. New challenge posts were sent to the developer / hacker / designer channels.",
    );
  } catch (err) {
    await patchAdminComponentMessage(
      ctx,
      `❌ Failed to post challenges. Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return true;
}
