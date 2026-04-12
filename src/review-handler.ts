import type { PrismaClient } from "@prisma/client/edge";
import type { ComponentContext } from "discord-hono";
import { Button, Components } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "./worker-env";
import { awardPoints, XP } from "./points";
import { monthKey } from "./time";
import { sendChannelMessage } from "./discord-api";

type ReviewAction = "approve" | "reject";

type AdminReviewCtx = Pick<
  ComponentContext<HonoWorkerEnv, any>,
  "interaction" | "followup"
>;

const REVIEW_PREFIX = "review:";

function parseReviewCustomId(customId?: string): {
  action: ReviewAction;
  submissionId: string;
} | null {
  if (!customId?.startsWith(REVIEW_PREFIX)) return null;

  const [, actionRaw, submissionId] = customId.split(":");
  if (!submissionId || (actionRaw !== "approve" && actionRaw !== "reject")) {
    return null;
  }

  return { action: actionRaw as ReviewAction, submissionId };
}

function trackLabel(track: string): string {
  return track === "HACKER" ? "Hacker" : "Developer";
}

export async function handleAdminReview(
  c: AdminReviewCtx,
  prisma: PrismaClient,
  adminChannelId: string,
  discordBotToken: string,
) {
  const actorDiscordId =
    c.interaction.member?.user?.id ?? c.interaction.user?.id ?? "unknown";
  const channelId = c.interaction.channel_id;
  const parsed = parseReviewCustomId(c.interaction.data?.custom_id);

  if (!parsed) {
    await c.followup({
      content: "Unsupported review action.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (channelId !== adminChannelId) {
    await c.followup({
      content: "Review actions are only allowed in the admin review channel.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const wasAlreadyApproved = await prisma.submission.findUnique({
      where: { id: parsed.submissionId },
      select: { isApproved: true },
    });

    const approved = parsed.action === "approve";

    const updated = await prisma.submission.update({
      where: { id: parsed.submissionId },
      data: { isApproved: approved },
      include: { user: true, challenge: true },
    });

    if (approved && !wasAlreadyApproved?.isApproved) {
      await awardPoints(prisma, updated.userId, XP.SUBMISSION_APPROVED);
    }

    const statusLabel = approved ? "✅ APPROVED" : "❌ REJECTED";
    const statusColor = approved ? 0x57f287 : 0xed4245;

    const challengeFields =
      updated.challenge != null
        ? [
            { name: "Challenge", value: updated.challenge.title, inline: false },
            { name: "Track", value: trackLabel(updated.challenge.track), inline: true },
            { name: "Tier", value: updated.challenge.tier, inline: true },
          ]
        : [];

    await c.followup({
      embeds: [
        {
          title: `Submission ${statusLabel}`,
          color: statusColor,
          fields: [
            { name: "Title", value: updated.title, inline: false },
            {
              name: "Author",
              value: `<@${updated.user.discordId}>`,
              inline: true,
            },
            { name: "Month", value: updated.month, inline: true },
            {
              name: "Reviewed By",
              value: `<@${actorDiscordId}>`,
              inline: true,
            },
            ...challengeFields,
            ...(approved
              ? [{ name: "XP Awarded", value: `+${XP.SUBMISSION_APPROVED} XP`, inline: true }]
              : []),
          ],
        },
      ],
      components: [],
    });

    if (
      approved &&
      !wasAlreadyApproved?.isApproved &&
      updated.challengeId &&
      updated.challenge?.threadId
    ) {
      await sendChannelMessage(discordBotToken, updated.challenge.threadId, {
        embeds: [
          {
            title: updated.title,
            description: updated.description.slice(0, 4096),
            color: 0x5865f2,
            fields: [
              { name: "Builder", value: `<@${updated.user.discordId}>`, inline: true },
              { name: "Tier", value: updated.tier, inline: true },
              { name: "Votes", value: "0", inline: true },
              { name: "Repo", value: updated.repoUrl, inline: false },
              ...(updated.demoUrl
                ? [{ name: "Demo", value: updated.demoUrl, inline: false }]
                : []),
            ],
            footer: { text: "Vote with the button below" },
          },
        ],
        components: new Components().row(
          new Button(`vote:${updated.id}`, "🗳️ Vote", "Primary"),
        ),
      });
    }
  } catch (err) {
    console.error("handleAdminReview error:", err);
    await c.followup({
      content:
        "Could not update that submission (it may have been removed already).",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function handleVote(c: AdminReviewCtx, prisma: PrismaClient) {
  const voterDiscordId =
    c.interaction.member?.user?.id ?? c.interaction.user?.id ?? null;

  if (!voterDiscordId) {
    await c.followup({
      content: "Could not detect your Discord ID.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const customId: string = c.interaction.data?.custom_id ?? "";
  const [, submissionId] = customId.split(":");

  if (!submissionId) {
    await c.followup({ content: "Invalid vote action.", flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, month: true, track: true },
    });

    if (!submission) {
      await c.followup({
        content: "That submission was not found.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        submissionId_voterDiscordId: {
          submissionId,
          voterDiscordId,
        },
      },
    });

    if (existingVote) {
      await c.followup({
        content: "You've already voted for this submission.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const currentMonth = monthKey();

    const totalVotesThisMonth = await prisma.vote.count({
      where: {
        voterDiscordId,
        submission: { month: currentMonth },
      },
    });

    const trackVotesThisMonth = await prisma.vote.count({
      where: {
        voterDiscordId,
        submission: { month: currentMonth, track: submission.track },
      },
    });

    if (totalVotesThisMonth >= 4) {
      await c.followup({
        content: `You've used all 4 of your votes for **${currentMonth}**. Votes reset next month.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (trackVotesThisMonth >= 2) {
      const other =
        submission.track === "HACKER" ? "Developer" : "Hacker";
      await c.followup({
        content: `You've already voted on 2 **${trackLabel(submission.track)}** submissions this month. You can still vote on **${other}** submissions.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await prisma.vote.create({
      data: { submissionId, voterDiscordId },
    });

    const full = await prisma.submission.update({
      where: { id: submissionId },
      data: { votes: { increment: 1 } },
      include: { user: true },
    });

    await awardPoints(prisma, full.userId, XP.VOTE_RECEIVED);

    await c.followup({
      content: `You voted for **${full.title}** by <@${full.user.discordId}>! It now has **${full.votes}** vote(s).`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (err: any) {
    console.error("handleVote error:", err);
    await c.followup({
      content: "Could not record your vote. Please try again.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
