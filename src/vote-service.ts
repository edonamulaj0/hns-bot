import type { PrismaClient } from "@prisma/client/edge";
import { awardPoints, XP } from "./points";
import { monthKey } from "./time";
import type { WorkerBindings } from "./worker-env";

function trackLabel(track: string): string {
  return track === "HACKER" ? "Hacker" : "Developer";
}

export type CastVoteResult =
  | { ok: true; votes: number }
  | { ok: false; message: string };

/**
 * Record a vote with monthly caps: 4 total per voter per submission month, 2 per track.
 */
export async function castVote(
  prisma: PrismaClient,
  voterDiscordId: string,
  submissionId: string,
  env: WorkerBindings,
): Promise<CastVoteResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, month: true, track: true },
  });

  if (!submission) {
    return { ok: false, message: "Submission not found." };
  }

  if (submission.month !== monthKey()) {
    return {
      ok: false,
      message: "You can only vote for the current challenge month.",
    };
  }

  const existing = await prisma.vote.findUnique({
    where: {
      submissionId_voterDiscordId: { submissionId, voterDiscordId },
    },
  });
  if (existing) {
    return { ok: false, message: "You've already voted for this submission." };
  }

  const subMonth = submission.month;

  const totalVotesThisMonth = await prisma.vote.count({
    where: {
      voterDiscordId,
      submission: { month: subMonth },
    },
  });

  const trackVotesThisMonth = await prisma.vote.count({
    where: {
      voterDiscordId,
      submission: { month: subMonth, track: submission.track },
    },
  });

  if (totalVotesThisMonth >= 4) {
    return {
      ok: false,
      message: `You've used all 4 of your votes for ${subMonth}. Votes reset next month.`,
    };
  }

  if (trackVotesThisMonth >= 2) {
    const other = submission.track === "HACKER" ? "Developer" : "Hacker";
    return {
      ok: false,
      message: `You've already voted on 2 ${trackLabel(submission.track)} submissions this month. You can still vote on ${other} submissions.`,
    };
  }

  await prisma.vote.create({
    data: { submissionId, voterDiscordId },
  });

  const full = await prisma.submission.update({
    where: { id: submissionId },
    data: { votes: { increment: 1 } },
    select: { votes: true, userId: true },
  });

  await awardPoints(prisma, full.userId, XP.VOTE_RECEIVED, env);

  return { ok: true, votes: full.votes };
}
