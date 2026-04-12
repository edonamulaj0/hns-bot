import { DiscordHono } from "discord-hono";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { handleAdminReview, handleVote } from "./review-handler";
import type { HonoWorkerEnv, WorkerBindings } from "./worker-env";
import {
  getNormalizedPathname,
  handleApiRequest,
  unknownApiRouteResponse,
} from "./api";
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

function rootApiDiscoveryResponse(): Response {
  const body = {
    service: "hns-bot",
    note:
      "GET / is not the JSON API. discord-hono answers other GETs with Operational — use the paths below.",
    endpoints: [
      "/api/blogs",
      "/api/members",
      "/api/portfolio",
      "/api/leaderboard",
    ],
  };
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default {
  fetch: async (request: Request, env: WorkerBindings, executionCtx?: ExecutionContext) => {
    const pathname = getNormalizedPathname(request);

    const apiResponse = await handleApiRequest(request, env);
    if (apiResponse) return apiResponse;

    // Never send /api/* to discord-hono (it always responds GET with Operational🔥).
    if (
      pathname.startsWith("/api/") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return unknownApiRouteResponse(pathname, request.url);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      if (pathname === "/") {
        return request.method === "HEAD"
          ? new Response(null, {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          : rootApiDiscoveryResponse();
      }
    }

    return app.fetch(request, env, executionCtx);
  },
  scheduled: app.scheduled,
};
