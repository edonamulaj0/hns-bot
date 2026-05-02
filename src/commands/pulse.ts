import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import {
  computePulseRawXp,
  extractGithubUsername,
  fetchMonthlyPulse,
  fetchMonthlyPulseViaViewerGraphql,
  GitHubApiError,
  PULSE_XP_CAP,
  type PulseResult,
} from "../github";
import { getValidGithubAccessTokenForUser } from "../github-oauth";
import { awardMonthlyPulsePoints } from "../points";
import { monthEndLinearScale, monthKey } from "../time";
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

function scaledPulsePreview(pulse: PulseResult, scale: number): PulseResult {
  return {
    ...pulse,
    commits: Math.round(pulse.commits * scale),
    prsOpened: Math.round(pulse.prsOpened * scale),
    prsMerged: Math.round(pulse.prsMerged * scale),
    prReviews:
      pulse.prReviews != null ? Math.round(pulse.prReviews * scale) : undefined,
    xpEarned: pulse.xpEarned,
  };
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
            lastPulseMonth: true,
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

        const scale = monthEndLinearScale();
        const projectedRaw = computePulseRawXp(scaledPulsePreview(pulse, scale));
        const xpProjectedMonthEnd = Math.min(projectedRaw, PULSE_XP_CAP);
        const xpAwarded = pulse.xpEarned;
        const pulseAward =
          xpAwarded > 0
            ? await awardMonthlyPulsePoints(
                prisma,
                user.id,
                currentMonth,
                xpAwarded,
                ctx.env,
                {
                  source: pulse.source,
                  commits: pulse.commits,
                  prsOpened: pulse.prsOpened,
                  prsMerged: pulse.prsMerged,
                  prReviews: pulse.prReviews ?? null,
                },
              )
            : { awarded: false, points: null };

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

        const description = noActivity
          ? noActivityText
          : `Counts are **${currentMonth}** (UTC), from GitHub. Pulse XP is awarded once per month from current activity and caps at **${PULSE_XP_CAP}**. Projected XP scales your pace by **${scale.toFixed(2)}×** for a month-end estimate.`;

        const footerBase =
          pulse.source === "viewer"
            ? "OAuth viewer (private repos you allowed)"
            : `${pulse.source} (public) · /link-github for private`;
        const awardFooter =
          xpAwarded <= 0
            ? "No pulse XP awarded"
            : pulseAward.awarded
              ? `Awarded +${xpAwarded} XP`
              : `Pulse XP already claimed for ${currentMonth}`;

        await safeFollowup(ctx, {
          embeds: [
            {
              title: `📊 GitHub activity — ${currentMonth}`,
              description,
              color: xpProjectedMonthEnd > 0 ? 0x5865f2 : 0x99aab5,
              fields: noActivity
                ? [{ name: "GitHub", value: `[@${username}](${user.github})`, inline: true }]
                : [
                    { name: "GitHub", value: `[@${username}](${user.github})`, inline: true },
                    { name: "Commits", value: `${pulse.commits}`, inline: true },
                    ...prFields,
                    {
                      name: pulseAward.awarded ? "Pulse XP awarded" : "Pulse XP",
                      value:
                        xpAwarded <= 0
                          ? `**+0** / ${PULSE_XP_CAP} max`
                          : pulseAward.awarded
                            ? `**+${xpAwarded}** / ${PULSE_XP_CAP} max`
                            : `Already claimed for ${currentMonth}`,
                      inline: true,
                    },
                    {
                      name: "Projected month-end XP",
                      value: `**+${xpProjectedMonthEnd}** / ${PULSE_XP_CAP} max`,
                      inline: true,
                    },
                    ...(pulseAward.points != null
                      ? [{ name: "Total XP", value: `${pulseAward.points}`, inline: true }]
                      : []),
                    ...(pulse.repoCount > 0
                      ? [{ name: "Repos Active", value: `${pulse.repoCount}`, inline: true }]
                      : []),
                  ],
              footer: { text: `${awardFooter} · ${footerBase}` },
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
