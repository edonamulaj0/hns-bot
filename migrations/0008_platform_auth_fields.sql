-- OAuth profile, challenge deliverables, submission anonymity, cron flags
ALTER TABLE "User" ADD COLUMN "avatarHash" TEXT;
ALTER TABLE "User" ADD COLUMN "accessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "tokenExpiresAt" DATETIME;

ALTER TABLE "Challenge" ADD COLUMN "deliverables" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Challenge" ADD COLUMN "messageId" TEXT;

ALTER TABLE "Submission" ADD COLUMN "redirectSlug" TEXT;
ALTER TABLE "Submission" ADD COLUMN "revealed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Submission" ADD COLUMN "isLocked" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Submission_redirectSlug_key" ON "Submission"("redirectSlug");

ALTER TABLE "Config" ADD COLUMN "lastChallengeMonth" TEXT;
ALTER TABLE "Config" ADD COLUMN "lastChallengeGenError" TEXT;
