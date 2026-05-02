import type { DiscordHono } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { postChallengesToDiscord, type GeneratedChallengesResult } from "../challenge-generator";
import { getDiscordUserId } from "./helpers";
import { isAdmin } from "./admin";
import { clearMonthChallengeAndRelated, patchAdminComponentMessage } from "./admin-reset-month";

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

      const token = ctx.interaction.token;
      const applicationId = ctx.env.DISCORD_APPLICATION_ID?.trim();
      if (!token || !applicationId) {
        await ctx.followup({
          content: "Misconfiguration: missing **interaction token** or **DISCORD_APPLICATION_ID**.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        await ctx.env.CHALLENGE_GEN_QUEUE.send({
          kind: "admin-test-preview",
          applicationId,
          interactionToken: token,
          discordUserId: discordId,
        });
      } catch (e) {
        console.error("CHALLENGE_GEN_QUEUE.send:", e);
        await ctx.followup({
          content: `❌ Could not queue generation: ${e instanceof Error ? e.message : String(e)}. Check **CHALLENGE_GEN_QUEUE** binding and redeploy.`,
          flags: MessageFlags.Ephemeral,
        });
      }
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

  const prisma = getPrisma(ctx.env.DB);

  if (customId === "admin:discard-challenges") {
    await prisma.challengeGenPreview.deleteMany({ where: { discordUserId: discordId } }).catch(() => {});
    await patchAdminComponentMessage(ctx, "🗑️ Discarded. Nothing was posted.");
    return true;
  }

  const month = customId.replace("admin:confirm-post-challenges:", "").trim();
  const row = await prisma.challengeGenPreview.findUnique({
    where: { discordUserId: discordId },
  });
  if (!row || row.month !== month) {
    await patchAdminComponentMessage(
      ctx,
      "Preview not found or expired (wrong month). Run `/admin-test-generate` again.",
    );
    return true;
  }

  let cached: GeneratedChallengesResult;
  try {
    cached = JSON.parse(row.payloadJson) as GeneratedChallengesResult;
  } catch {
    await patchAdminComponentMessage(ctx, "Stored preview was corrupt. Run `/admin-test-generate` again.");
    return true;
  }

  try {
    await clearMonthChallengeAndRelated(prisma, month);
    await postChallengesToDiscord({ env: ctx.env }, prisma, month, cached.challenges);
    await prisma.challengeGenPreview.deleteMany({ where: { discordUserId: discordId } }).catch(() => {});
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
