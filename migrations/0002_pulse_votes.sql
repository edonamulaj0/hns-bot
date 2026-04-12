-- Add lastPulseMonth to User for pulse dedup
ALTER TABLE "User" ADD COLUMN "lastPulseMonth" TEXT;

-- CreateTable Vote (submission voting dedup)
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "voterDiscordId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_submissionId_voterDiscordId_key" ON "Vote"("submissionId", "voterDiscordId");
CREATE INDEX "Vote_submissionId_idx" ON "Vote"("submissionId");
