-- Challenges, enrollments, submission.challengeId, User Discord display fields

CREATE TABLE "Challenge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "month" TEXT NOT NULL,
  "track" TEXT NOT NULL,
  "tier" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "resources" TEXT,
  "threadId" TEXT,
  "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Challenge_month_track_tier_key" ON "Challenge"("month", "track", "tier");
CREATE INDEX "Challenge_month_track_idx" ON "Challenge"("month", "track");

CREATE TABLE "Enrollment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "enrolledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Enrollment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Enrollment_userId_challengeId_key" ON "Enrollment"("userId", "challengeId");

ALTER TABLE "Submission" ADD COLUMN "challengeId" TEXT;
CREATE INDEX "Submission_challengeId_idx" ON "Submission"("challengeId");

ALTER TABLE "User" ADD COLUMN "discordUsername" TEXT;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
