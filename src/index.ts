import {
  $channels$_$messages,
  Button,
  Components,
  DiscordHono,
  Modal,
  TextInput,
} from "discord-hono";
import { Prisma } from "@prisma/client/edge";
import { MessageFlags } from "discord-api-types/v10";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { handleAdminReview, handleVote } from "./review-handler";
import type { HonoWorkerEnv, WorkerBindings } from "./worker-env";
import { awardPoints, XP, formatLeaderboardEmbed } from "./points";
import { extractGithubUsername, fetchMonthlyPulse } from "./github";
import { getMonthlyPhase, monthKey } from "./time";
import { handleApiRequest } from "./api";
import { getPrisma } from "./db";
import { validateGitHubUrl, validateLinkedInUrl, validateUrl, validateTier, enforceMaxLength } from "./validate";
// Command registrations
import { registerSetupProfile } from "./commands/setup-profile";
import { registerSubmit } from "./commands/submit";
import { registerShareBlog } from "./commands/share-blog";
import { registerPulse } from "./commands/pulse";
import { registerLeaderboard } from "./commands/leaderboard";
import { registerCron } from "./commands/cron";

// ─── App ──────────────────────────────────────────────────────────────────────

let app = new DiscordHono<HonoWorkerEnv>();

// Register all command handlers
app = registerSetupProfile(app);
app = registerSubmit(app);
app = registerShareBlog(app);
app = registerPulse(app);
app = registerLeaderboard(app);
app = registerCron(app);

// ── Component handlers (vote buttons, review buttons, etc.) ──────────────────────

app = app.component("", async (c) => {
  const customId: string = c.interaction?.data?.custom_id ?? "";

  if (customId.startsWith("review:")) {
    return c.update().resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      await handleAdminReview(ctx, prisma, ctx.env.ADMIN_CHANNEL_ID);
    });
  }

  if (customId.startsWith("vote:")) {
    return c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      await handleVote(ctx, prisma);
    });
  }

  return c.res("Unknown component.");
});

// ─── Worker export ────────────────────────────────────────────────────────────

export default {
  fetch: async (request: Request, env: WorkerBindings, executionCtx?: ExecutionContext) => {
    // REST API routes
    const apiResponse = await handleApiRequest(request, env);
    if (apiResponse) return apiResponse;

    // Discord interaction handler
    return app.fetch(request, env, executionCtx);
  },
  scheduled: app.scheduled,
};
