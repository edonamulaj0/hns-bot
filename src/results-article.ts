import type { PrismaClient } from "@prisma/client/edge";
import { mergedPublicDisplayName } from "./display-name";
import { XP } from "./points";
import type { WorkerBindings } from "./worker-env";
import { submissionEligibleForWinnerPick } from "./submission-lifecycle";

function trackLabel(track: string): string {
  const t = track.toUpperCase();
  return t === "HACKER" ? "Hacker" : t === "DESIGNERS" ? "Designer" : "Developer";
}

function xpFromWinnerSubmission(sub: {
  votes: number;
  challengeId: string | null;
}): { approval: number; enrollment: number; votes: number; total: number } {
  const approval = XP.SUBMISSION_APPROVED;
  const enrollment = sub.challengeId ? XP.ENROLLMENT_BONUS : 0;
  const votesXp = sub.votes * XP.VOTE_RECEIVED;
  return {
    approval,
    enrollment,
    votes: votesXp,
    total: approval + enrollment + votesXp,
  };
}

async function getOrCreateBotAuthorUserId(
  prisma: PrismaClient,
  discordSnowflake: string,
): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { discordId: discordSnowflake },
    select: { id: true },
  });
  if (existing) return existing.id;

  const row = await prisma.user.create({
    data: {
      discordId: discordSnowflake,
      displayName: "H4ck&Stack",
      discordUsername: "Bot",
    },
    select: { id: true },
  });
  return row.id;
}

/**
 * Creates an on-site article summarizing winners after publish day (cron).
 * Author: `ANNOUNCEMENTS_AUTHOR_DISCORD_ID` if set, otherwise **`DISCORD_APPLICATION_ID`**
 * (Discord uses the same snowflake for the application and the bot user).
 */
export async function createMonthlyResultsArticle(
  prisma: PrismaClient,
  env: WorkerBindings,
  month: string,
): Promise<void> {
  const authorDiscordId =
    env.ANNOUNCEMENTS_AUTHOR_DISCORD_ID?.trim() || env.DISCORD_APPLICATION_ID?.trim();
  if (!authorDiscordId) {
    console.warn(
      "createMonthlyResultsArticle: no author id (set DISCORD_APPLICATION_ID or ANNOUNCEMENTS_AUTHOR_DISCORD_ID) — skipping",
    );
    return;
  }

  const title = `🏆 ${month} challenge winners`;

  const dup = await prisma.blog.findFirst({
    where: { kind: "ARTICLE", title },
    select: { id: true },
  });
  if (dup) return;

  const authorUserId = await getOrCreateBotAuthorUserId(prisma, authorDiscordId);

  const tiers = ["Beginner", "Intermediate", "Advanced"] as const;
  const tracks = ["DEVELOPER", "HACKER", "DESIGNERS"] as const;

  const lines: string[] = [];
  lines.push(
    `Published results for challenge month **${month}** (UTC+2 calendar). Winners are the top vote getters per track and tier among approved work.`,
  );
  lines.push("");
  lines.push("## Winners");
  lines.push("");

  let anyWinner = false;
  for (const track of tracks) {
    const tl = trackLabel(track);
    for (const tier of tiers) {
      const top = await prisma.submission.findFirst({
        where: {
          month,
          track,
          tier,
          ...submissionEligibleForWinnerPick(),
        },
        include: {
          user: { select: { displayName: true, discordUsername: true } },
        },
        orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
      });
      if (!top) continue;
      anyWinner = true;
      const who =
        mergedPublicDisplayName(top.user.displayName, top.user.discordUsername) || "Member";
      const xpBreakdown = xpFromWinnerSubmission(top);
      const submissionPath = `/submissions/${encodeURIComponent(top.id)}`;
      lines.push(`### ${tl} · ${tier}`);
      lines.push("");
      lines.push(`- **${top.title}** — ${who}`);
      lines.push(`  - [View submission](${submissionPath})`);
      lines.push(`- **Community votes:** ${top.votes}`);
      lines.push(
        `- **XP from this entry:** ${xpBreakdown.total} (${xpBreakdown.approval} submission · ${xpBreakdown.enrollment} enrollment · ${xpBreakdown.votes} from votes)`,
      );
      lines.push("");
    }
  }

  if (!anyWinner) {
    lines.push("_No qualifying winners were recorded for this month._");
    lines.push("");
  }

  lines.push("## Next cycle");
  lines.push("");
  lines.push(
    "New challenges drop on **day 1** (UTC+2). Until then, browse portfolios and celebrate everyone who shipped.",
  );

  const content = lines.join("\n");

  await prisma.blog.create({
    data: {
      userId: authorUserId,
      kind: "ARTICLE",
      title,
      url: "",
      content,
    },
  });
}
