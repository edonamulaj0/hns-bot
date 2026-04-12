-- CreateTable Config (for cron idempotency tracking)
CREATE TABLE "Config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastVoteFeedMonth" TEXT,
    "lastPublishMonth" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
