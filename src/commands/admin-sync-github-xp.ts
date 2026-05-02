import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import {
  extractGithubUsername,
  fetchMonthlyPulse,
  fetchMonthlyPulseViaViewerGraphql,
  GitHubApiError,
  type PulseResult,
} from "../github";
import { getValidGithubAccessTokenForUser } from "../github-oauth";
import { ensurePulseAwardTable, insertPulseAward, recomputeAllUserRanks } from "../points";
import { syncUserRole } from "../role-manager";
import { mergedPublicDisplayName } from "../display-name";
import { isAdmin } from "./admin";

const BACKFILL_MONTHS = [
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
] as const;

type BackfillUser = {
  id: string;
  discordId: string;
  displayName: string | null;
  discordUsername: string | null;
  github: string | null;
  points: number;
  lastPulseMonth: string | null;
  githubAccessTokenEnc: string | null;
  githubRefreshTokenEnc: string | null;
  githubTokenExpiresAt: Date | null;
};

function userLabel(user: BackfillUser): string {
  return mergedPublicDisplayName(user.displayName, user.discordUsername) || user.discordId;
}

function pulseErr(err: unknown): string {
  if (err instanceof GitHubApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

export function registerAdminSyncGithubXp(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-sync-github-xp", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized." });
        return;
      }

      const prisma = getPrisma(ctx.env.DB);
      await ensurePulseAwardTable(ctx.env.DB);

      const users = await prisma.user.findMany({
        where: { github: { not: null } },
        select: {
          id: true,
          discordId: true,
          displayName: true,
          discordUsername: true,
          github: true,
          points: true,
          lastPulseMonth: true,
          githubAccessTokenEnc: true,
          githubRefreshTokenEnc: true,
          githubTokenExpiresAt: true,
        },
        orderBy: [{ createdAt: "asc" }],
      });

      let processed = 0;
      let awardedUsers = 0;
      let awardedMonths = 0;
      let duplicateMonths = 0;
      let skippedMonths = 0;
      let totalXp = 0;
      const errors: string[] = [];
      const awardedUserIds = new Set<string>();

      for (const user of users as BackfillUser[]) {
        processed++;
        const username = extractGithubUsername(user.github);
        if (!username) {
          skippedMonths += BACKFILL_MONTHS.length;
          errors.push(`${userLabel(user)}: invalid GitHub URL`);
          continue;
        }

        const userOAuth = await getValidGithubAccessTokenForUser(prisma, user, ctx.env);
        if (!userOAuth && !ctx.env.GITHUB_TOKEN?.trim()) {
          skippedMonths += BACKFILL_MONTHS.length;
          errors.push(`${userLabel(user)}: missing GitHub OAuth or GITHUB_TOKEN`);
          continue;
        }

        let userXp = 0;
        let latestAwardMonth: string | null = null;

        for (const month of BACKFILL_MONTHS) {
          if (user.lastPulseMonth === month) {
            duplicateMonths++;
            continue;
          }

          let pulse: PulseResult;
          try {
            pulse = userOAuth
              ? await fetchMonthlyPulseViaViewerGraphql(userOAuth, month)
              : await fetchMonthlyPulse(username, month, ctx.env.GITHUB_TOKEN);
          } catch (err) {
            skippedMonths++;
            if (errors.length < 10) errors.push(`${userLabel(user)} ${month}: ${pulseErr(err)}`);
            continue;
          }

          if (pulse.xpEarned <= 0) {
            skippedMonths++;
            continue;
          }

          const inserted = await insertPulseAward(ctx.env.DB, user.id, month, pulse.xpEarned, {
            source: pulse.source,
            commits: pulse.commits,
            prsOpened: pulse.prsOpened,
            prsMerged: pulse.prsMerged,
            prReviews: pulse.prReviews ?? null,
          });
          if (!inserted) {
            duplicateMonths++;
            continue;
          }

          userXp += pulse.xpEarned;
          totalXp += pulse.xpEarned;
          awardedMonths++;
          latestAwardMonth = month;
        }

        if (userXp > 0) {
          awardedUsers++;
          awardedUserIds.add(user.id);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              points: { increment: userXp },
              ...(latestAwardMonth ? { lastPulseMonth: latestAwardMonth } : {}),
            },
          });
        }
      }

      if (totalXp > 0) {
        await recomputeAllUserRanks(prisma);
        const awarded = await prisma.user.findMany({
          where: { id: { in: [...awardedUserIds] } },
          select: { discordId: true, points: true },
        });
        for (const user of awarded) {
          await syncUserRole(
            prisma,
            user.discordId,
            user.points,
            ctx.env.DISCORD_GUILD_ID,
            ctx.env.DISCORD_TOKEN,
          );
        }
      }

      const lines = [
        "✅ GitHub XP backfill complete.",
        `Range: ${BACKFILL_MONTHS[0]} → ${BACKFILL_MONTHS[BACKFILL_MONTHS.length - 1]}`,
        `Users checked: ${processed}`,
        `Users awarded: ${awardedUsers}`,
        `Months awarded: ${awardedMonths}`,
        `Duplicate/already-claimed months: ${duplicateMonths}`,
        `Skipped/no-XP months: ${skippedMonths}`,
        `Total XP awarded: ${totalXp}`,
      ];
      if (errors.length) {
        lines.push("", "Warnings:", ...errors.slice(0, 10).map((e) => `- ${e}`));
        if (errors.length > 10) lines.push(`- …and ${errors.length - 10} more`);
      }

      await ctx.followup({ content: lines.join("\n").slice(0, 1900) });
    }),
  );
}
