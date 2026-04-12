import { Command, Option, register } from "discord-hono";
import dotenv from "dotenv";
import process from "node:process";

dotenv.config();

async function main() {
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_TEST_GUILD_ID;

  if (!applicationId || !token) {
    throw new Error("DISCORD_APPLICATION_ID and DISCORD_TOKEN must be set in .env");
  }

  if (!guildId) {
    throw new Error("DISCORD_TEST_GUILD_ID must be set in .env for instant guild command updates");
  }

  const commands = [
    new Command("setup-profile", "Set up your developer portfolio profile"),
    new Command("update-profile", "Update your existing developer profile"),
    new Command("profile", "View a member portfolio profile").options(
      new Option("user", "Member to view (optional — defaults to you)", "User"),
    ),
    new Command("submit", "Submit your monthly project").options(
      new Option(
        "attachment",
        "PDF writeup or supporting document (optional)",
        "Attachment",
      ),
    ),
    new Command("share-blog", "Share a technical blog post or article").options(
      new Option("file", "Upload a .txt or .md markdown article (optional)", "Attachment"),
    ),
    new Command("pulse", "Sync your GitHub activity and earn XP (once per month)"),
    new Command("leaderboard", "See the top contributors this month"),
  ];

  const message = await register(commands, applicationId, token, guildId);
  console.log(message);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
