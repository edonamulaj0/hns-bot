import type { PrismaClient } from "@prisma/client/edge";
import type { ComponentContext } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "./worker-env";

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
  if (!customId || !customId.startsWith(REVIEW_PREFIX)) {
    return null;
  }

  const [, actionRaw, submissionId] = customId.split(":");
  if (!submissionId || (actionRaw !== "approve" && actionRaw !== "reject")) {
    return null;
  }

  return { action: actionRaw, submissionId };
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
    const approved = parsed.action === "approve";
    const updated = await prisma.submission.update({
      where: { id: parsed.submissionId },
      data: { isApproved: approved },
      include: { user: true },
    });

    const statusLabel = approved ? "APPROVED" : "REJECTED";
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
          ],
        },
      ],
      components: [],
    });
  } catch {
    await c.followup({
      content:
        "Could not update that submission (it may have been removed already).",
      flags: MessageFlags.Ephemeral,
    });
  }
}
