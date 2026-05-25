import assert from "node:assert/strict";
import {
  effectiveSubmissionStatus,
  isInVotePool,
  isOwnerDeletableStatus,
  isReviewableStatus,
  submissionEligibleForPublish,
  submissionEligibleForWinnerPick,
} from "../src/submission-lifecycle";

assert.deepEqual(submissionEligibleForPublish(), {
  OR: [
    { submissionStatus: "APPROVED" },
    { AND: [{ submissionStatus: null }, { isApproved: true }] },
  ],
});

assert.deepEqual(submissionEligibleForWinnerPick(), {
  OR: [
    { submissionStatus: "APPROVED" },
    { submissionStatus: "PUBLISHED" },
    { AND: [{ submissionStatus: null }, { isApproved: true }] },
  ],
});

assert.equal(
  effectiveSubmissionStatus({
    submissionStatus: "REJECTED",
    isApproved: false,
    revealed: false,
  }),
  "REJECTED",
);
assert.equal(isReviewableStatus("PENDING"), true);
assert.equal(isReviewableStatus("APPROVED"), false);
assert.equal(isReviewableStatus("REJECTED"), false);
assert.equal(isReviewableStatus("PUBLISHED"), false);

assert.equal(isInVotePool("PENDING"), false);
assert.equal(isInVotePool("APPROVED"), true);
assert.equal(isInVotePool("REJECTED"), false);
assert.equal(isInVotePool("PUBLISHED"), false);

assert.equal(isOwnerDeletableStatus("PENDING"), true);
assert.equal(isOwnerDeletableStatus("REJECTED"), true);
assert.equal(isOwnerDeletableStatus("APPROVED"), false);
assert.equal(isOwnerDeletableStatus("PUBLISHED"), false);

console.log("submission lifecycle tests passed");
