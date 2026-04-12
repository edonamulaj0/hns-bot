import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { createGithubAuthorizeUrl, oauthConfigReady } from "../github-oauth";
import { getDiscordUserId } from "./helpers";
import { syncDiscordIdentity } from "../discord-identity";

async function safeFollowup(
  ctx: { followup: (data: object) => Promise<unknown> },
  data: object,
) {
  try {
    await ctx.followup(data);
  } catch (e) {
    console.error("link-github followup failed:", e);
  }
}

export function registerLinkGithub(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("link-github", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const discordId = getDiscordUserId(ctx.interaction);

      if (!discordId) {
        await safeFollowup(ctx, {
          content: "Could not detect your Discord ID.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await syncDiscordIdentity(prisma, discordId, ctx.interaction);

      if (!oauthConfigReady(ctx.env)) {
        await safeFollowup(ctx, {
          content:
            "GitHub OAuth is not configured. On the Worker set: **WORKER_PUBLIC_URL** (e.g. `https://your-bot.workers.dev`), **GITHUB_OAUTH_CLIENT_ID** (var), **GITHUB_OAUTH_CLIENT_SECRET** (`wrangler secret put`), **GITHUB_LINK_SECRET** (`wrangler secret put` — long random string for encrypting tokens). Create a GitHub OAuth app with callback `{WORKER_PUBLIC_URL}/oauth/github/callback`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { discordId },
        select: { id: true },
      });
      if (!user) {
        await safeFollowup(ctx, {
          content: "Run `/setup-profile` first so we have your account.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const url = await createGithubAuthorizeUrl(prisma, discordId, ctx.env);
      await safeFollowup(ctx, {
        content: `Open this link once to connect GitHub (enables **private** repo contributions on \`/pulse\`):\n${url}\n\nLink expires in ~15 minutes. Scopes: \`read:user\` + \`repo\`.`,
        flags: MessageFlags.Ephemeral,
      });
    }),
  );
}

export function registerUnlinkGithub(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("unlink-github", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const discordId = getDiscordUserId(ctx.interaction);

      if (!discordId) {
        await safeFollowup(ctx, {
          content: "Could not detect your Discord ID.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await syncDiscordIdentity(prisma, discordId, ctx.interaction);

      await prisma.user.updateMany({
        where: { discordId },
        data: {
          githubAccessTokenEnc: null,
          githubRefreshTokenEnc: null,
          githubTokenExpiresAt: null,
          githubLinkedLogin: null,
        },
      });

      await safeFollowup(ctx, {
        content:
          "Removed stored GitHub OAuth tokens. `/pulse` will use public Search/events only (until you `/link-github` again).",
        flags: MessageFlags.Ephemeral,
      });
    }),
  );
}
