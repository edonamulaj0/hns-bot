import type { DiscordHono } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "../worker-env";
import { isAdmin } from "./admin";
import {
  notifyChallengesLive,
  notifyDeadlineWarning,
  notifyResultsPublished,
  notifySubmissionsClosed,
  notifyVotingOpen,
} from "../notifications";

type NotifyType = "challenges-live" | "deadline-warning" | "submissions-closed" | "voting-open" | "results-published";

export function registerAdminTestNotify(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-test-notify", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized." });
        return;
      }

      const type = String((ctx.var as { type?: string }).type ?? "") as NotifyType;
      if (!type) {
        await ctx.followup({
          content: "Missing required option: type",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const adminChannel = ctx.env.ADMIN_CHANNEL_ID?.trim();
      if (!adminChannel) {
        await ctx.followup({
          content: "ADMIN_CHANNEL_ID is not configured.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const opts = { channelsOverride: [adminChannel] };
      if (type === "challenges-live") await notifyChallengesLive(ctx, ctx.env, opts);
      else if (type === "deadline-warning") await notifyDeadlineWarning(ctx, ctx.env, opts);
      else if (type === "submissions-closed") await notifySubmissionsClosed(ctx, ctx.env, opts);
      else if (type === "voting-open") await notifyVotingOpen(ctx, ctx.env, opts);
      else if (type === "results-published") await notifyResultsPublished(ctx, ctx.env, opts);
      else {
        await ctx.followup({
          content: `Unknown notify type: ${type}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await ctx.followup({
        content: "✅ Preview sent to admin channel.",
        flags: MessageFlags.Ephemeral,
      });
    }),
  );
}
