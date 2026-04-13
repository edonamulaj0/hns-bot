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
    new Command("pulse", "Preview GitHub activity and estimated month-end pulse XP"),
    new Command(
      "link-github",
      "Connect GitHub (OAuth) so /pulse can include private repo contributions",
    ),
    new Command("unlink-github", "Remove stored GitHub OAuth from this bot"),
    new Command("leaderboard", "See the top contributors this month"),
    new Command("help", "List all bot commands and what they do (ephemeral)"),
    new Command("intro", "Post the public welcome & getting-started guide (mods only)"),
    new Command("enroll", "Enroll in a monthly challenge before you submit on the web").options(
      new Option("track", "Challenge track (optional — omit to pick from a menu)", "String")
        .required(false)
        .choices(
          { name: "Developer", value: "DEVELOPER" },
          { name: "Hacker", value: "HACKER" },
        ),
      new Option("tier", "Challenge tier (optional — use with track)", "String")
        .required(false)
        .choices(
          { name: "Beginner", value: "Beginner" },
          { name: "Intermediate", value: "Intermediate" },
          { name: "Advanced", value: "Advanced" },
        ),
    ),
    new Command("admin", "Admin health-check for XP role mappings and hierarchy"),
    new Command(
      "admin-test-claude",
      "Admin: test Claude API connectivity and challenge generation",
    ),
    new Command(
      "admin-test-generate",
      "Admin: generate this month's challenges and preview (no public post)",
    ),
    new Command(
      "admin-test-notify",
      "Admin: post the selected lifecycle notification template here (public, no extra channel post)",
    ).options(
      new Option("type", "Which notification to preview", "String")
        .required(true)
        .choices(
          { name: "Challenges live", value: "challenges-live" },
          { name: "Deadline warning", value: "deadline-warning" },
          { name: "Submissions closed", value: "submissions-closed" },
          { name: "Voting open", value: "voting-open" },
          { name: "Results published", value: "results-published" },
        ),
    ),
    new Command(
      "admin-reset-month",
      "Admin: reset current month's challenges and submissions for testing",
    ),
    new Command(
      "admin-sync-roles",
      "Admin: manually sync all member Discord roles based on current XP",
    ),
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
