import type { PrismaClient } from "@prisma/client/edge";
import type { ComponentContext } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "./worker-env";
import { awardPoints, XP } from "./points";

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

export async function handleAdminReview(
  c: AdminReviewCtx,
  prisma: PrismaClient,
  adminChannelId: string,
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
      include: { user: true },
    });

    // Award XP only on first approval (not if toggling back and forth)
    if (approved && !wasAlreadyApproved?.isApproved) {
      await awardPoints(prisma, updated.userId, XP.SUBMISSION_APPROVED);
    }

    const statusLabel = approved ? "✅ APPROVED" : "❌ REJECTED";
    const statusColor = approved ? 0x57f287 : 0xed4245;

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
            ...(approved
              ? [{ name: "XP Awarded", value: `+${XP.SUBMISSION_APPROVED} XP`, inline: true }]
              : []),
          ],
        },
      ],
      components: [],
    });
  } catch (err) {
    console.error("handleAdminReview error:", err);
    await c.followup({
      content:
        "Could not update that submission (it may have been removed already).",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function handleVote(
  c: AdminReviewCtx,
  prisma: PrismaClient,
) {
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
  // format: vote:<submissionId>
  const [, submissionId] = customId.split(":");

  if (!submissionId) {
    await c.followup({ content: "Invalid vote action.", flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    // Pre-flight check: have they already voted?
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

    // Create vote
    await prisma.vote.create({
      data: { submissionId, voterDiscordId },
    });

    // Increment votes on submission
    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: { votes: { increment: 1 } },
      include: { user: true },
    });

    // Award XP to the submission author
    await awardPoints(prisma, submission.userId, XP.VOTE_RECEIVED);

    await c.followup({
      content: `You voted for **${submission.title}** by <@${submission.user.discordId}>! It now has **${submission.votes}** vote(s).`,
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
