import { DiscordHono } from "discord-hono";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { handleAdminReview, handleVote } from "./review-handler";
import type { HonoWorkerEnv, WorkerBindings } from "./worker-env";
import { handleApiRequest } from "./api";
import { getPrisma } from "./db";
import {
  registerSetupProfile,
  registerUpdateProfile,
  registerProfileModal,
} from "./commands/setup-profile";
import { registerProfile } from "./commands/profile";
import { registerSubmit } from "./commands/submit";
import { registerShareBlog } from "./commands/share-blog";
import { registerPulse } from "./commands/pulse";
import { registerLeaderboard } from "./commands/leaderboard";
import { registerCron } from "./commands/cron";

let app = new DiscordHono<HonoWorkerEnv>();

app = registerSetupProfile(app);
app = registerUpdateProfile(app);
app = registerProfileModal(app);
app = registerProfile(app);
app = registerSubmit(app);
app = registerShareBlog(app);
app = registerPulse(app);
app = registerLeaderboard(app);
app = registerCron(app);

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

export default {
  fetch: async (request: Request, env: WorkerBindings, executionCtx?: ExecutionContext) => {
    const apiResponse = await handleApiRequest(request, env);
    if (apiResponse) return apiResponse;

    return app.fetch(request, env, executionCtx);
  },
  scheduled: app.scheduled,
};
