import assert from "node:assert/strict";
import { castVote } from "../src/vote-service";

type FakeSubmission = {
  id: string;
  month: string;
  track: string;
  userId: string;
  votes: number;
  isApproved: boolean;
  revealed: boolean;
  submissionStatus: string | null;
  user: { discordId: string };
};

function fakePrismaForRejectedVote(submission: FakeSubmission) {
  return {
    submission: {
      findUnique: async () => submission,
      update: async () => {
        throw new Error("vote rejection must not update the submission");
      },
    },
    vote: {
      findUnique: async () => null,
      count: async () => {
        throw new Error("vote rejection must not count existing votes");
      },
      create: async () => {
        throw new Error("vote rejection must not create a vote");
      },
      delete: async () => {
        throw new Error("vote rejection must not delete a vote");
      },
    },
  };
}

const baseSubmission: FakeSubmission = {
  id: "sub_1",
  month: "2026-05",
  track: "DEVELOPER",
  userId: "user_1",
  votes: 0,
  isApproved: false,
  revealed: false,
  submissionStatus: "PENDING",
  user: { discordId: "111111111111111111" },
};

async function main() {
  const pendingResult = await castVote(
    fakePrismaForRejectedVote(baseSubmission) as any,
    "222222222222222222",
    baseSubmission.id,
    baseSubmission.month,
    {} as any,
  );
  assert.deepEqual(pendingResult, {
    ok: false,
    message: "This submission is not open for voting.",
  });

  const selfVoteResult = await castVote(
    fakePrismaForRejectedVote({
      ...baseSubmission,
      isApproved: true,
      submissionStatus: "APPROVED",
    }) as any,
    baseSubmission.user.discordId,
    baseSubmission.id,
    baseSubmission.month,
    {} as any,
  );
  assert.deepEqual(selfVoteResult, {
    ok: false,
    message: "You cannot vote for your own submission.",
  });

  console.log("vote service tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
