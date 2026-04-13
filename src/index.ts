import { DiscordHono } from "discord-hono";
import type { ExecutionContext } from "@cloudflare/workers-types";
import type { HonoWorkerEnv, WorkerBindings } from "./worker-env";
import {
  getNormalizedPathname,
  handleApiRequest,
  unknownApiRouteResponse,
} from "./api";
import { handleGithubOAuthCallback } from "./github-oauth";
import { getPrisma } from "./db";
import { registerProfile } from "./commands/profile";
import { registerSubmit } from "./commands/submit";
import { registerPulse } from "./commands/pulse";
import { registerLinkGithub, registerUnlinkGithub } from "./commands/link-github";
import { registerLeaderboard } from "./commands/leaderboard";
import { registerHelp } from "./commands/help";
import { registerIntro } from "./commands/intro";
import { registerCron } from "./commands/cron";
import { registerEnroll } from "./commands/enroll";
import { registerDeleteAccount } from "./commands/delete-account";
import { registerAdminHealth } from "./commands/admin-health";
import { registerAdminTestClaude } from "./commands/admin-test-claude";
import {
  handleAdminGenerateComponent,
  registerAdminTestGenerate,
} from "./commands/admin-test-generate";
import { registerAdminTestNotify } from "./commands/admin-test-notify";
import { registerAdminSyncRoles } from "./commands/admin-sync-roles";
import {
  handleAdminResetComponent,
  registerAdminResetMonth,
} from "./commands/admin-reset-month";
import { processDiscordEnrollment, type EnrollmentDeferCtx } from "./commands/enroll";
import { getDiscordUserId } from "./commands/helpers";
import { MessageFlags } from "discord-api-types/v10";
import { ensureRolesExist } from "./role-manager";

let app = new DiscordHono<HonoWorkerEnv>();
let startupRolesInit = false;

app = registerProfile(app);
app = registerSubmit(app);
app = registerPulse(app);
app = registerLinkGithub(app);
app = registerUnlinkGithub(app);
app = registerLeaderboard(app);
app = registerHelp(app);
app = registerIntro(app);
app = registerCron(app);
app = registerEnroll(app);
app = registerDeleteAccount(app);
app = registerAdminHealth(app);
app = registerAdminTestClaude(app);
app = registerAdminTestGenerate(app);
app = registerAdminTestNotify(app);
app = registerAdminSyncRoles(app);
app = registerAdminResetMonth(app);

app = app.component("", async (c) => {
  const customId: string = c.interaction?.data?.custom_id ?? "";
  if (customId.startsWith("admin:")) {
    return c.flags("EPHEMERAL").resDefer(async (ctx) => {
      if (await handleAdminGenerateComponent(ctx)) return;
      if (await handleAdminResetComponent(ctx)) return;
      await ctx.followup({ content: "Unknown admin action.", flags: MessageFlags.Ephemeral });
    });
  }
  if (!customId.startsWith("enroll:")) {
    return c.res("Unknown component.");
  }
  const challengeId = customId.slice("enroll:".length);
  if (!challengeId) {
    return c.res("Invalid enroll action.");
  }
  return c.flags("EPHEMERAL").resDefer(async (ctx) => {
    const discordId = getDiscordUserId(ctx.interaction);
    if (!discordId) {
      await ctx.followup({
        content: "Could not detect your Discord ID.",
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
  });
});

function rootApiDiscoveryResponse(): Response {
  const body = {
    service: "hns-bot",
    note:
      "GET / is not the JSON API. Use the paths below (GET/POST/PATCH/DELETE as documented).",
    endpoints: [
      "/api/blogs",
      "/api/members",
      "/api/portfolio",
      "/api/leaderboard",
      "/api/challenges",
      "/api/me",
      "/api/vote",
      "/api/vote/status",
      "/api/vote/queue",
      "/api/enroll",
      "/api/profile",
      "/api/submit",
      "/api/submit/:id",
      "/api/submission/:id",
      "/api/redirect/:slug",
      "/oauth/github/callback",
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
    if (!startupRolesInit) {
      try {
        await ensureRolesExist(getPrisma(env.DB), env.DISCORD_GUILD_ID, env.DISCORD_TOKEN);
        startupRolesInit = true;
      } catch (e) {
        console.error("role init error:", e);
      }
    }

    const pathname = getNormalizedPathname(request);

    if (pathname === "/oauth/github/callback" && request.method === "GET") {
      return handleGithubOAuthCallback(request, env);
    }

    if (pathname.startsWith("/api/")) {
      const apiResponse = await handleApiRequest(request, env);
      if (apiResponse) return apiResponse;
      if (request.method === "GET" || request.method === "HEAD") {
        return unknownApiRouteResponse(pathname, request.url);
      }
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
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
  /** Cron: `commands/cron.ts` — idempotent via Config `lastChallengeMonth`, `lastVoteFeedMonth`, `lastPublishMonth`. */
  scheduled: app.scheduled,
};
