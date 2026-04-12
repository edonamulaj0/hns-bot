import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { extractGithubUsername, fetchMonthlyPulse } from "../github";
import { monthKey } from "../time";
import { awardPoints, XP } from "../points";
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
    // Ephemeral defer so PATCH @original can use ephemeral on every reply (Discord requirement).
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
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
          select: { id: true, github: true, lastPulseMonth: true },
        });

        if (!user?.github) {
          await safeFollowup(ctx, {
            content: "You haven't set a GitHub URL yet. Run `/setup-profile` first.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (user.lastPulseMonth === currentMonth) {
          await safeFollowup(ctx, {
            content: `You've already run \`/pulse\` for **${currentMonth}**. Come back next month!`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const username = extractGithubUsername(user.github);
        if (!username) {
          await safeFollowup(ctx, {
            content:
              "Could not parse a GitHub username from your profile URL. Check `/setup-profile`.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const pulse = await fetchMonthlyPulse(username, currentMonth, ctx.env.GITHUB_TOKEN);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastPulseMonth: currentMonth },
        });

        if (pulse.xpEarned > 0) {
          await awardPoints(prisma, user.id, pulse.xpEarned);
        }

        const noActivity =
          pulse.commits === 0 && pulse.prsOpened === 0 && pulse.prsMerged === 0;

        await safeFollowup(ctx, {
          flags: MessageFlags.Ephemeral,
          embeds: [
            {
              title: `⚡ GitHub Pulse — ${currentMonth}`,
              description: noActivity
                ? `No public GitHub activity found for **@${username}** this month. Keep shipping!`
                : undefined,
              color: pulse.xpEarned > 0 ? 0x57f287 : 0x99aab5,
              fields: noActivity
                ? []
                : [
                    { name: "GitHub", value: `[@${username}](${user.github})`, inline: true },
                    { name: "Commits", value: `${pulse.commits}`, inline: true },
                    { name: "PRs Opened", value: `${pulse.prsOpened}`, inline: true },
                    { name: "PRs Merged", value: `${pulse.prsMerged}`, inline: true },
                    { name: "XP Earned", value: `**+${pulse.xpEarned}**`, inline: true },
                    ...(pulse.repoCount > 0
                      ? [{ name: "Repos Active", value: `${pulse.repoCount}`, inline: true }]
                      : []),
                  ],
              footer: { text: "Pulse can only be run once per month. Max 100 XP." },
            },
          ],
        });
      } catch (err) {
        console.error("pulse error:", err);
        await safeFollowup(ctx, {
          content:
            "Could not fetch GitHub activity. Make sure your profile URL is correct and try again.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }),
  );
}
