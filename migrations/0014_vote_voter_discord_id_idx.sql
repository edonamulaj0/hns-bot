-- Align with prisma/schema.prisma @@index([voterDiscordId]) on Vote
CREATE INDEX IF NOT EXISTS "Vote_voterDiscordId_idx" ON "Vote"("voterDiscordId");
