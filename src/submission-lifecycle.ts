export type SubmissionLifecycleStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED";

export function syncLegacyApprovalFields(
  status: SubmissionLifecycleStatus,
): {
  submissionStatus: SubmissionLifecycleStatus;
  isApproved: boolean;
  revealed: boolean;
} {
  return {
    submissionStatus: status,
    isApproved: status === "APPROVED" || status === "PUBLISHED",
    revealed: status === "PUBLISHED",
  };
}

export function effectiveSubmissionStatus(s: {
  submissionStatus: string | null | undefined;
  revealed: boolean;
  isApproved: boolean;
}): SubmissionLifecycleStatus {
  const st = s.submissionStatus?.trim().toUpperCase();
  if (st === "PENDING" || st === "APPROVED" || st === "REJECTED" || st === "PUBLISHED") {
    return st;
  }
  if (s.revealed) return "PUBLISHED";
  if (s.isApproved) return "APPROVED";
  return "PENDING";
}

export function isInVotePool(status: SubmissionLifecycleStatus): boolean {
  return status === "APPROVED";
}

export function isPublishedArchive(status: SubmissionLifecycleStatus): boolean {
  return status === "PUBLISHED";
}
