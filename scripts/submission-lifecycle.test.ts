import assert from "node:assert/strict";
import {
  effectiveSubmissionStatus,
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

console.log("submission lifecycle tests passed");
