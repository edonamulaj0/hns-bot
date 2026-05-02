-- Latest admin challenge-generation preview per Discord user (queue consumer writes; buttons read).
CREATE TABLE IF NOT EXISTS "ChallengeGenPreview" (
    "discordUserId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChallengeGenPreview_pkey" PRIMARY KEY ("discordUserId")
);
