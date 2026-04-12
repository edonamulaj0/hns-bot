-- Add hacker track fields to Submission
ALTER TABLE "Submission" ADD COLUMN "track" TEXT NOT NULL DEFAULT "DEVELOPER";
ALTER TABLE "Submission" ADD COLUMN "challengeType" TEXT;
ALTER TABLE "Submission" ADD COLUMN "qualityWeight" REAL NOT NULL DEFAULT 1.0;
