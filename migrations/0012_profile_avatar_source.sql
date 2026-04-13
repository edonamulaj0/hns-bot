-- Which picture to prefer for public profile: auto (GitHub then Discord), github, or discord
ALTER TABLE "User" ADD COLUMN "profileAvatarSource" TEXT;
