import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { createGithubAuthorizeUrl, oauthConfigReady } from "../github-oauth";
import { getDiscordUserId } from "./helpers";

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

      if (!oauthConfigReady(ctx.env)) {
        const missing: string[] = [];
        if (!ctx.env.WORKER_PUBLIC_URL?.trim()) missing.push("WORKER_PUBLIC_URL (var)");
        if (!ctx.env.GITHUB_OAUTH_CLIENT_ID?.trim()) missing.push("GITHUB_OAUTH_CLIENT_ID (var)");
        if (!ctx.env.GITHUB_OAUTH_CLIENT_SECRET?.trim())
          missing.push("GITHUB_OAUTH_CLIENT_SECRET (secret)");
        if (!ctx.env.GITHUB_LINK_SECRET?.trim()) missing.push("GITHUB_LINK_SECRET (secret)");
        await safeFollowup(ctx, {
          content: [
            "GitHub OAuth is not configured.",
            "Missing on Worker: " + (missing.length ? missing.join(", ") : "unknown"),
            "Required: WORKER_PUBLIC_URL + GITHUB_OAUTH_CLIENT_ID (vars), GITHUB_OAUTH_CLIENT_SECRET + GITHUB_LINK_SECRET (secrets).",
            "OAuth callback must be: {WORKER_PUBLIC_URL}/oauth/github/callback",
          ].join("\n"),
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
          content: "Open the website and complete **/profile** first so we have your account.",
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
