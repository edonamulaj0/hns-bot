import { getConfig, setConfig } from "../config";
import { getPrisma } from "../db";
import { getCommunityCalendarParts, getMonthlyPhase, monthKey } from "../time";
import { generateAndPostChallenges } from "../challenge-generator";
import { syncAllRoles } from "../role-manager";
import { syncLegacyApprovalFields } from "../submission-lifecycle";
import {
  notifyChallengesLive,
  notifyDeadlineWarning,
  notifyResultsPublished,
  notifySubmissionsClosed,
} from "../notifications";
import { createMonthlyResultsArticle } from "../results-article";

export function registerCron(app: any) {
  return app.cron("5 22 * * *", async (c: any) => {
    const prisma = getPrisma(c.env.DB);
    const now = new Date();
    const { day } = getCommunityCalendarParts(now);
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

          await notifyResultsPublished(c, c.env);
          await createMonthlyResultsArticle(prisma, c.env, currentMonth);
          await setConfig(prisma, config.id, { lastPublishMonth: currentMonth });
        }
      }
    } catch (e) {
      console.error("cron error:", e);
    }
  });
}
