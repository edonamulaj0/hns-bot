import { $channels$_$messages } from "discord-hono";
import type { PrismaClient } from "@prisma/client/edge";
import { getMonthlyPhase, monthKey } from "../time";

/**
 * Post vote phase feed to announce voting is open
 */
export async function postVotePhaseFeed(
  c: any,
  prisma: PrismaClient,
  votingChannelId: string,
  targetMonth: string,
) {
  const approved = await prisma.submission.findMany({
    where: { month: targetMonth, isApproved: true },
    include: { user: { select: { discordId: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (approved.length === 0) return;

  // Post a header message
  await c.rest("POST", $channels$_$messages, [votingChannelId], {
    content: `🗳️ **Voting is now open for ${targetMonth}!** Cast your votes below. Each member has **4 votes per month** (max **2** on Developer submissions and **2** on Hacker submissions). One vote per project.`,
  });

  // Post each approved submission as its own message with a Vote button
  const { Button, Components } = await import("discord-hono");
  for (const item of approved) {
    await c.rest("POST", $channels$_$messages, [votingChannelId], {
      embeds: [
        {
          title: item.title,
          description: item.description,
          color: 0x5865f2,
          fields: [
            { name: "Builder", value: `<@${item.user.discordId}>`, inline: true },
            { name: "Tier", value: item.tier, inline: true },
            { name: "Votes", value: `${item.votes}`, inline: true },
            { name: "Repository", value: item.repoUrl, inline: false },
            ...(item.demoUrl ? [{ name: "Demo", value: item.demoUrl, inline: false }] : []),
          ],
          footer: { text: `Submission ID: ${item.id}` },
        },
      ],
      components: new Components().row(
        new Button(`vote:${item.id}`, "🗳️ Vote", "Primary"),
      ),
    });
  }
}

/**
 * Post publish announcement to celebrate when results go live
 */
export async function postPublishAnnouncement(
  c: any,
  votingChannelId: string,
  targetMonth: string,
) {
  await c.rest("POST", $channels$_$messages, [votingChannelId], {
    content: `🎉 **${targetMonth} is now published!** The results are live on the portfolio website. Congrats to everyone who shipped something this month.`,
  });
}

/**
 * Register the monthly cron job that handles vote feed and publish announcements
 */
export function registerCron(app: any) {
  const { getPrisma } = require("../db");

  return app.cron("5 0 * * *", async (c: any) => {
    const prisma = getPrisma(c.env.DB);
    const now = new Date();
    const phase = getMonthlyPhase(now);
    const currentMonth = monthKey(now);

    // Get or create config for idempotency tracking
    let config = await prisma.config.findFirst();
    if (!config) {
      config = await prisma.config.create({ data: {} });
    }

    // VOTE phase: post vote feed once per month (idempotent)
    if (phase === "VOTE") {
      // Check if we've already posted this month
      const cfg = await prisma.config.findFirst();
      if (cfg?.lastVoteFeedMonth !== currentMonth) {
        await postVotePhaseFeed(c, prisma, c.env.VOTING_CHANNEL_ID, currentMonth);
        // Mark as posted for this month
        await prisma.config.update({
          where: { id: cfg?.id },
          data: { lastVoteFeedMonth: currentMonth },
        });
      }
    }

    // PUBLISH phase: announce once per month (idempotent)
    if (phase === "PUBLISH") {
      // Check if we've already announced this month
      const cfg = await prisma.config.findFirst();
      if (cfg?.lastPublishMonth !== currentMonth) {
        await postPublishAnnouncement(c, c.env.VOTING_CHANNEL_ID, currentMonth);
        // Mark as announced for this month
        await prisma.config.update({
          where: { id: cfg?.id },
          data: { lastPublishMonth: currentMonth },
        });
      }
    }
  });
}
