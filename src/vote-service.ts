import type { PrismaClient } from "@prisma/client/edge";
import { awardPoints, XP } from "./points";
import { monthKey } from "./time";
import type { WorkerBindings } from "./worker-env";
import { TRACK_DEVELOPER, TRACK_DESIGNERS, TRACK_HACKER, trackLabel } from "./tracks";

const MONTH_RE = /^\d{4}-\d{2}$/;

export type CastVoteResult =
  | { ok: true; votes: number; toggledOff?: boolean }
  | { ok: false; message: string };

function trackKey(track: string): "DEVELOPER" | "HACKER" | "DESIGNERS" {
  if (track === TRACK_HACKER) return TRACK_HACKER;
  if (track === TRACK_DESIGNERS) return TRACK_DESIGNERS;
  return TRACK_DEVELOPER;
}

/**
 * Record or remove a vote with monthly caps: 4 total per voter per submission month, max 2 per track.
 * Same submission again toggles the vote off (idempotent).
 */
export async function castVote(
  prisma: PrismaClient,
  voterDiscordId: string,
  submissionId: string,
  monthParam: string | null | undefined,
  env: WorkerBindings,
): Promise<CastVoteResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, month: true, track: true, userId: true, votes: true },
  });

  if (!submission) {
    return { ok: false, message: "Submission not found." };
  }

  const month =
    monthParam && MONTH_RE.test(monthParam.trim()) ? monthParam.trim() : monthKey();
  if (submission.month !== month) {
    return {
      ok: false,
      message: "You can only vote for submissions in the selected challenge month.",
    };
  }

  const existing = await prisma.vote.findUnique({
    where: {
      submissionId_voterDiscordId: { submissionId, voterDiscordId },
    },
  });

  if (existing) {
    await prisma.vote.delete({
      where: { submissionId_voterDiscordId: { submissionId, voterDiscordId } },
    });
    const full = await prisma.submission.update({
      where: { id: submissionId },
      data: { votes: { decrement: 1 } },
      select: { votes: true, userId: true },
    });
    await awardPoints(prisma, full.userId, -XP.VOTE_RECEIVED, env);
    return { ok: true, votes: full.votes, toggledOff: true };
  }

  const subMonth = submission.month;
  const tk = trackKey(submission.track);

  const totalVotesThisMonth = await prisma.vote.count({
    where: {
      voterDiscordId,
      submission: { month: subMonth },
    },
  });

  const trackVotesThisMonth = await prisma.vote.count({
    where: {
      voterDiscordId,
      submission: { month: subMonth, track: tk },
    },
  });

  if (totalVotesThisMonth >= 4) {
    return {
      ok: false,
      message: `You've used all 4 of your votes for ${subMonth}. Votes reset next month.`,
    };
  }

  if (trackVotesThisMonth >= 2) {
    const others = [TRACK_DEVELOPER, TRACK_HACKER, TRACK_DESIGNERS].filter((t) => t !== tk);
    const labels = others.map((t) => trackLabel(t)).join(", ");
    return {
      ok: false,
      message: `You've already voted on 2 ${trackLabel(tk)} submissions this month. You can still vote on ${labels} work.`,
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
