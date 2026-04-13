import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey } from "../time";
import { generateAndPostChallenges } from "../challenge-generator";
import { syncAllRoles } from "../role-manager";
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

    let config = await prisma.config.findFirst();
    if (!config) {
      config = await prisma.config.create({ data: {} });
    }

    try {
      await syncAllRoles(c, prisma);

      if (day === 1) {
        if (config.lastChallengeMonth !== currentMonth) {
          await generateAndPostChallenges(c, prisma, now);
          await notifyChallengesLive(c, c.env);
          await prisma.config.update({
            where: { id: config.id },
            data: { lastChallengeMonth: currentMonth },
          });
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
          await prisma.config.update({
            where: { id: config.id },
            data: { lastVoteFeedMonth: currentMonth },
          });
        }
      }

      if (day === 29 && phase === "PUBLISH") {
        if (config.lastPublishMonth !== currentMonth) {
          await prisma.submission.updateMany({
            where: { month: currentMonth },
            data: { revealed: true, isLocked: true },
          });
          await notifyResultsPublished(c, c.env);
          await prisma.config.update({
            where: { id: config.id },
            data: { lastPublishMonth: currentMonth },
          });
        }
      }
    } catch (e) {
      console.error("cron error:", e);
    }
  });
}
