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

const previewCache = new Map<string, GeneratedChallengesResult>();

function previewFields(list: GeneratedChallengesResult["challenges"]) {
  return list.map((ch) => ({
    name: `${ch.track} — ${ch.tier}`,
    value: `**${ch.title}**\n${ch.description.slice(0, 150)}${ch.description.length > 150 ? "…" : ""}`,
    inline: false,
  }));
}

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

export function registerAdminTestGenerate(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-test-generate", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized." });
        return;
      }
      const discordId = getDiscordUserId(ctx.interaction);
      if (!discordId) {
        await ctx.followup({ content: "Could not detect your Discord ID.", flags: MessageFlags.Ephemeral });
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
        await ctx.followup({
          ...basePayload,
          content: `❌ Generation failed. Error: ${generated.error ?? "Unknown error"}\nShowing fallback challenges that would have been used.`,
        });
        return;
      }

      await ctx.followup({
        ...basePayload,
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

  if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
    await ctx.followup({ content: "⛔ Unauthorized.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const discordId = getDiscordUserId(ctx.interaction);
  if (!discordId) {
    await ctx.followup({ content: "Could not detect your Discord ID.", flags: MessageFlags.Ephemeral });
    return true;
  }

  if (customId === "admin:discard-challenges") {
    const ok = await editSourceMessage(ctx, "🗑️ Discarded. Nothing was posted.");
    if (!ok) {
      await ctx.followup({ content: "🗑️ Discarded. Nothing was posted.", flags: MessageFlags.Ephemeral });
    }
    return true;
  }

  const month = customId.replace("admin:confirm-post-challenges:", "").trim();
  const cached = previewCache.get(`${discordId}:${month}`);
  if (!cached) {
    await ctx.followup({
      content: "Preview not found or expired. Run /admin-test-generate again.",
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  try {
    const prisma = getPrisma(ctx.env.DB);
    await postChallengesToDiscord({ env: ctx.env }, prisma, month, cached.challenges);
    previewCache.delete(`${discordId}:${month}`);
    const ok = await editSourceMessage(ctx, "✅ Challenges posted to #developers and #hackers");
    if (!ok) {
      await ctx.followup({
        content: "✅ Challenges posted to #developers and #hackers",
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (err) {
    await ctx.followup({
      content: `❌ Failed to post challenges. Error: ${err instanceof Error ? err.message : String(err)}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  return true;
}
