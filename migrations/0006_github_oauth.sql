-- Per-user GitHub OAuth (private contribution counts via GraphQL viewer)
ALTER TABLE "User" ADD COLUMN "githubAccessTokenEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "githubRefreshTokenEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "githubTokenExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "githubLinkedLogin" TEXT;

CREATE TABLE "PendingGithubOAuth" (
  "state" TEXT NOT NULL PRIMARY KEY,
  "discordUserId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL
);

CREATE INDEX "PendingGithubOAuth_expiresAt_idx" ON "PendingGithubOAuth"("expiresAt");
