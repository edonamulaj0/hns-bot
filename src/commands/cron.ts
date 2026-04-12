import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey } from "../time";
import { sendChannelMessage } from "../discord-api";
import { generateAndPostChallenges } from "../challenge-generator";

function webBase(env: { BASE_URL?: string }): string {
  return env.BASE_URL?.replace(/\/$/, "") || "https://h4cknstack.com";
}

async function postVotingWebAnnouncement(c: any, currentMonth: string) {
  const token = c.env.DISCORD_TOKEN;
  const base = webBase(c.env);
  const msg = `🗳️ **Voting is open for ${currentMonth}!**
Browse submissions and cast your votes at **${base}/vote/${currentMonth}**
You have **4 votes** — **2 per track**. Voting closes **day 25**.`;

  const dev = c.env.DEVELOPER_CHALLENGES_CHANNEL_ID?.trim();
  const hack = c.env.HACKER_CHALLENGES_CHANNEL_ID?.trim();
  if (dev) await sendChannelMessage(token, dev, { content: msg });
  if (hack && hack !== dev) await sendChannelMessage(token, hack, { content: msg });
  const voting = c.env.VOTING_CHANNEL_ID?.trim();
  if (voting && voting !== dev && voting !== hack) {
    await sendChannelMessage(token, voting, { content: msg });
  }
}

async function postPublishSummary(c: any, prisma: any, currentMonth: string) {
  const token = c.env.DISCORD_TOKEN;
  const base = webBase(c.env);
  const subs = await prisma.submission.findMany({
    where: { month: currentMonth, isApproved: true },
    orderBy: { votes: "desc" },
  });

  const lines: string[] = [];
  const tracks = ["DEVELOPER", "HACKER"] as const;
  const tiers = ["Beginner", "Intermediate", "Advanced"];
  for (const tr of tracks) {
    for (const tier of tiers) {
      const top = subs.find((s: { track: string; tier: string }) => s.track === tr && s.tier === tier);
      if (top) {
        const label = tr === "HACKER" ? "Hacker" : "Developer";
        lines.push(`**${label} · ${tier}**: ${top.title} — **${top.votes}** votes`);
      }
    }
  }

  const msg = `🎉 **${currentMonth}** is published! Results and demos: **${base}/challenges/${currentMonth}**

${lines.length ? lines.join("\n") : "_See the site for full results._"}`;

  const dev = c.env.DEVELOPER_CHALLENGES_CHANNEL_ID?.trim();
  const hack = c.env.HACKER_CHALLENGES_CHANNEL_ID?.trim();
  if (dev) await sendChannelMessage(token, dev, { content: msg });
  if (hack && hack !== dev) await sendChannelMessage(token, hack, { content: msg });
  const voting = c.env.VOTING_CHANNEL_ID?.trim();
  if (voting && voting !== dev && voting !== hack) {
    await sendChannelMessage(token, voting, { content: msg });
  }
}

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
      if (day === 1) {
        if (config.lastChallengeMonth !== currentMonth) {
          await generateAndPostChallenges(c, prisma, now);
          await prisma.config.update({
            where: { id: config.id },
            data: { lastChallengeMonth: currentMonth },
          });
        }
      }

      if (day === 22 && phase === "VOTE") {
        if (config.lastVoteFeedMonth !== currentMonth) {
          await postVotingWebAnnouncement(c, currentMonth);
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
          await postPublishSummary(c, prisma, currentMonth);
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
