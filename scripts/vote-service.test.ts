import assert from "node:assert/strict";
import { castVote } from "../src/vote-service";

function prismaForSubmission(submission: unknown): any {
  return {
    submission: {
      findUnique: async () => submission,
      update: async () => {
        throw new Error("submission.update should not be called for rejected votes");
      },
    },
    vote: {
      findUnique: async () => null,
      count: async () => {
        throw new Error("vote.count should not be called for rejected votes");
      },
      create: async () => {
        throw new Error("vote.create should not be called for rejected votes");
      },
    },
  };
}

const baseSubmission = {
  id: "sub_1",
  month: "2026-05",
  track: "DEVELOPER",
  userId: "user_1",
  votes: 0,
  isApproved: true,
  revealed: false,
  submissionStatus: "APPROVED",
  user: { discordId: "111111111111111111" },
};

const env = {} as any;

async function main(): Promise<void> {
  assert.deepEqual(
    await castVote(
      prismaForSubmission(baseSubmission),
      baseSubmission.user.discordId,
      baseSubmission.id,
      baseSubmission.month,
      env,
    ),
    { ok: false, message: "You can't vote for your own submission." },
  );

  assert.deepEqual(
    await castVote(
      prismaForSubmission({
        ...baseSubmission,
        submissionStatus: "PENDING",
        isApproved: false,
        user: { discordId: "222222222222222222" },
      }),
      "333333333333333333",
      baseSubmission.id,
      baseSubmission.month,
      env,
    ),
    { ok: false, message: "This submission is not eligible for voting." },
  );

  console.log("vote service tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
