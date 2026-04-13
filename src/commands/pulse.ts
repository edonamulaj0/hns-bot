import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import {
  extractGithubUsername,
  fetchMonthlyPulse,
  fetchMonthlyPulseViaViewerGraphql,
  GitHubApiError,
} from "../github";
import { getValidGithubAccessTokenForUser } from "../github-oauth";
import { monthKey } from "../time";
import { awardPoints } from "../points";
import { getDiscordUserId } from "./helpers";

async function safeFollowup(
  ctx: { followup: (data: object) => Promise<unknown> },
  data: object,
) {
  try {
    await ctx.followup(data);
  } catch (e) {
    console.error("pulse followup failed:", e);
  }
}

export function registerPulse(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("pulse", async (c) =>
    c.resDefer(async (ctx) => {
      try {
        const prisma = getPrisma(ctx.env.DB);
        const discordId = getDiscordUserId(ctx.interaction);

        if (!discordId) {
          await safeFollowup(ctx, {
            content: "Could not detect your Discord ID.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

          const currentMonth = monthKey();

        const user = await prisma.user.findUnique({
          where: { discordId },
          select: {
            id: true,
            github: true,
            githubAccessTokenEnc: true,
            githubRefreshTokenEnc: true,
            githubTokenExpiresAt: true,
            githubLinkedLogin: true,
          },
        });

        if (!user?.github) {
          await safeFollowup(ctx, {
            content: "You haven't set a GitHub URL yet. Add it on the website: **/profile**.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const username = extractGithubUsername(user.github);
        if (!username) {
          await safeFollowup(ctx, {
            content:
              "Could not parse a GitHub username from your profile URL. Check **/profile** on the site.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const userOAuth = await getValidGithubAccessTokenForUser(prisma, user, ctx.env);
        const pulse = userOAuth
          ? await fetchMonthlyPulseViaViewerGraphql(userOAuth, currentMonth)
          : await fetchMonthlyPulse(username, currentMonth, ctx.env.GITHUB_TOKEN);

        if (pulse.xpEarned > 0) {
          await awardPoints(prisma, user.id, pulse.xpEarned, ctx.env);
        }

        const noActivity =
          pulse.commits === 0 &&
          pulse.prsOpened === 0 &&
          pulse.prsMerged === 0 &&
          (pulse.prReviews ?? 0) === 0;

        const noActivityText =
          pulse.source === "viewer"
            ? `No GitHub contributions recorded for **@${username}** in **${currentMonth}** in your contribution calendar (for the linked account).`
            : `No **public** GitHub activity matched for **@${username}** in ${currentMonth}. Green squares often include **private** repos; run \`/link-github\` or add \`GITHUB_TOKEN\` on the Worker.`;

        const prFields =
          pulse.source === "viewer"
            ? [
                { name: "PRs opened", value: `${pulse.prsOpened}`, inline: true },
                { name: "PR reviews", value: `${pulse.prReviews ?? 0}`, inline: true },
              ]
            : [
                { name: "PRs Opened", value: `${pulse.prsOpened}`, inline: true },
                { name: "PRs Merged", value: `${pulse.prsMerged}`, inline: true },
              ];

        await safeFollowup(ctx, {
          embeds: [
            {
              title: `⚡ GitHub Pulse — ${currentMonth}`,
              description: noActivity ? noActivityText : undefined,
              color: pulse.xpEarned > 0 ? 0x57f287 : 0x99aab5,
              fields: noActivity
                ? []
                : [
                    { name: "GitHub", value: `[@${username}](${user.github})`, inline: true },
                    { name: "Commits", value: `${pulse.commits}`, inline: true },
                    ...prFields,
                    { name: "XP Earned", value: `**+${pulse.xpEarned}**`, inline: true },
                    ...(pulse.repoCount > 0
                      ? [{ name: "Repos Active", value: `${pulse.repoCount}`, inline: true }]
                      : []),
                  ],
              footer: {
                text:
                  pulse.source === "viewer"
                    ? "Max 100 XP/run · OAuth viewer (private repos you allowed)"
                    : `Max 100 XP/run · ${pulse.source} (public) · /link-github for private`,
              },
            },
          ],
        });
      } catch (err) {
        console.error("pulse error:", err);
        const detail =
          err instanceof GitHubApiError
            ? err.message
            : "Could not fetch GitHub activity. Check your GitHub URL on **/profile** and try again.";
        await safeFollowup(ctx, {
          content: detail.slice(0, 1900),
          flags: MessageFlags.Ephemeral,
        });
      }
    }),
  );
}
