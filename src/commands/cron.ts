import { getConfig, setConfig } from "../config";
import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey } from "../time";
import { generateAndPostChallenges } from "../challenge-generator";
import { syncAllRoles } from "../role-manager";
import { assignDesignWinnerRole } from "../design-track-roles";
import { TRACK_DESIGNERS } from "../tracks";
import { syncLegacyApprovalFields } from "../submission-lifecycle";
import {
  notifyChallengesLive,
  notifyDeadlineWarning,
  notifyResultsPublished,
  notifySubmissionsClosed,
} from "../notifications";

export function registerCron(app: any) {
  return app.cron("5 0 * * *", async (c: any) => {
    const prisma = getPrisma(c.env.DB);
    const now = new Date();
    const day = now.getUTCDate();
    const currentMonth = monthKey(now);
    const phase = getMonthlyPhase(now);

    const config = await getConfig(prisma);

    try {
      await syncAllRoles(c, prisma);

      if (day === 1) {
        if (config.lastChallengeMonth !== currentMonth) {
          await generateAndPostChallenges(c, prisma, now);
          await notifyChallengesLive(c, c.env);
          await setConfig(prisma, config.id, { lastChallengeMonth: currentMonth });
        }
      }

      if (day === 14) {
        await notifyDeadlineWarning(c, c.env);
      }

      if (day === 22 && phase === "VOTE") {
        if (config.lastVoteFeedMonth !== currentMonth) {
          await notifySubmissionsClosed(c, c.env);
          await prisma.submission.updateMany({
            where: { month: currentMonth },
            data: { isLocked: true },
          });
          await setConfig(prisma, config.id, { lastVoteFeedMonth: currentMonth });
        }
      }

      if (day === 29 && phase === "PUBLISH") {
        if (config.lastPublishMonth !== currentMonth) {
          const publishData = { ...syncLegacyApprovalFields("PUBLISHED"), isLocked: true };
          await prisma.submission.updateMany({
            where: { month: currentMonth },
            data: publishData as any,
          });

          const designTop = await prisma.submission.findMany({
            where: { month: currentMonth, track: TRACK_DESIGNERS },
            orderBy: [{ votes: "desc" }],
            take: 5,
            select: { votes: true, user: { select: { discordId: true } } },
          });
          const maxV = designTop[0]?.votes ?? -1;
          if (maxV > 0) {
            for (const row of designTop) {
              if (row.votes !== maxV) break;
              await assignDesignWinnerRole(
                prisma,
                row.user.discordId,
                c.env.DISCORD_GUILD_ID,
                c.env.DISCORD_TOKEN,
              ).catch(() => {});
            }
          }

          await notifyResultsPublished(c, c.env);
          await setConfig(prisma, config.id, { lastPublishMonth: currentMonth });
        }
      }
    } catch (e) {
      console.error("cron error:", e);
    }
  });
}
