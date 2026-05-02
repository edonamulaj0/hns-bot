-- Idempotent ledger for GitHub pulse XP awards.
-- One row per user/month prevents duplicate /pulse or admin backfill awards.

CREATE TABLE "PulseAward" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "xp" INTEGER NOT NULL,
  "source" TEXT,
  "commits" INTEGER NOT NULL DEFAULT 0,
  "prsOpened" INTEGER NOT NULL DEFAULT 0,
  "prsMerged" INTEGER NOT NULL DEFAULT 0,
  "prReviews" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PulseAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PulseAward_userId_month_key" ON "PulseAward"("userId", "month");
CREATE INDEX "PulseAward_month_idx" ON "PulseAward"("month");
