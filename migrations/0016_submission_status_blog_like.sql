-- Submission moderation lifecycle + design metadata + article likes

ALTER TABLE "Submission" ADD COLUMN "submissionStatus" TEXT;
UPDATE "Submission"
SET "submissionStatus" = CASE
  WHEN "revealed" = 1 THEN 'PUBLISHED'
  WHEN "isApproved" = 1 THEN 'APPROVED'
  ELSE 'PENDING'
END;
UPDATE "Submission" SET "submissionStatus" = 'PENDING' WHERE "submissionStatus" IS NULL;

ALTER TABLE "Submission" ADD COLUMN "deliverableType" TEXT;
ALTER TABLE "Submission" ADD COLUMN "imageMeta" TEXT;

CREATE TABLE "BlogLike" (
  "blogId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogLike_blogId_fkey" FOREIGN KEY ("blogId") REFERENCES "Blog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BlogLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY ("blogId", "userId")
);
CREATE INDEX "BlogLike_userId_idx" ON "BlogLike"("userId");
