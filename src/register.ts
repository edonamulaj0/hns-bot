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
    new Command("profile", "View a member portfolio profile").options(
      new Option("user", "Member to view (optional — defaults to you)", "User"),
    ),
    new Command("submit", "Open the website to submit your monthly project"),
    new Command("pulse", "Sync your GitHub activity and earn XP (once per month)"),
    new Command(
      "link-github",
      "Connect GitHub (OAuth) so /pulse can count private repo contributions",
    ),
    new Command("unlink-github", "Remove stored GitHub OAuth from this bot"),
    new Command("leaderboard", "See the top contributors this month"),
    new Command("enroll", "Enroll in a monthly challenge before you submit on the web"),
    new Command("admin", "Admin health-check for XP role mappings and hierarchy"),
    new Command(
      "delete-account",
      "Permanently delete your H4ck&Stack account (same as website danger zone)",
    ),
  ];

  const message = await register(commands, applicationId, token, guildId);
  console.log(message);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
