import { Command, register } from "discord-hono";
import dotenv from "dotenv";
import process from "node:process";

dotenv.config();

async function main() {
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_TEST_GUILD_ID;

  if (!applicationId || !token) {
    throw new Error(
      "DISCORD_APPLICATION_ID and DISCORD_TOKEN must be set in .env",
    );
  }

  if (!guildId) {
    throw new Error(
      "DISCORD_TEST_GUILD_ID must be set in .env for instant guild command updates while debugging",
    );
  }

  const commands = [
    new Command("setup-profile", "Setup your developer portfolio profile"),
    new Command("submit", "Submit a project for the monthly challenge"),
    new Command("share-blog", "Share a technical blog post or article"),
    new Command("pulse", "Check your GitHub activity for the month"),
  ];

  const message = await register(commands, applicationId, token, guildId);
  console.log(message);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
