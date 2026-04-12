-- User: profile completion timestamp (canonical "has portfolio profile")
ALTER TABLE "User" ADD COLUMN "profileCompletedAt" DATETIME;

CREATE INDEX "User_profileCompletedAt_idx" ON "User"("profileCompletedAt");

-- Backfill: treat existing filled profiles as completed
UPDATE "User"
SET "profileCompletedAt" = "updatedAt"
WHERE "profileCompletedAt" IS NULL
  AND ("bio" IS NOT NULL OR "github" IS NOT NULL OR "linkedin" IS NOT NULL);

-- Submission: optional Discord CDN link for uploaded PDF / text (URLs expire — see bot comment)
ALTER TABLE "Submission" ADD COLUMN "attachmentUrl" TEXT;

-- Blog: optional raw markdown from uploaded .txt / .md
ALTER TABLE "Blog" ADD COLUMN "content" TEXT;

-- Stash slash-command attachments until modal submit (command interaction does not carry into modal)
CREATE TABLE "PendingDiscordAttachment" (
    "discordUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "contentType" TEXT,
    "size" INTEGER,
    "expiresAt" DATETIME NOT NULL,
    PRIMARY KEY ("discordUserId", "kind")
);

CREATE INDEX "PendingDiscordAttachment_expiresAt_idx" ON "PendingDiscordAttachment"("expiresAt");
