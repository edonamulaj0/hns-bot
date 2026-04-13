import { Command, Option } from "discord-hono";
import dotenv from "dotenv";
import process from "node:process";

dotenv.config();

const DISCORD_API = "https://discord.com/api/v10";

/** Slash names that should only appear for members with ADMIN_ROLE_ID (guild command permissions). */
const ADMIN_SLASH_NAMES = new Set([
  "intro",
  "admin",
  "admin-test-claude",
  "admin-test-generate",
  "admin-test-notify",
  "admin-reset-month",
  "admin-sync-roles",
]);

async function main() {
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.DISCORD_TEST_GUILD_ID;
  const adminRoleId = process.env.ADMIN_ROLE_ID?.trim() ?? "";

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
    new Command("intro", "Post a plain-text welcome in this channel (mods only)"),
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

  const jsonBody = commands.map((c) => c.toJSON());

  const putRes = await fetch(
    `${DISCORD_API}/applications/${applicationId}/guilds/${guildId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(jsonBody),
    },
  );

  if (!putRes.ok) {
    const errText = await putRes.text();
    console.error("===== ⚠️ Error registering commands =====");
    console.error(`${putRes.status} ${putRes.statusText}\n${errText}`);
    process.exitCode = 1;
    return;
  }

  console.info("===== ✅ Slash commands registered =====");

  const registered = (await putRes.json()) as Array<{ id: string; name: string }>;

  if (!adminRoleId) {
    console.warn(
      "ADMIN_ROLE_ID is not set — admin slash commands are visible to everyone in this guild.",
      "Set ADMIN_ROLE_ID in .env and run `npm run register` again to restrict them.",
    );
    return;
  }

  const payload = registered.map((cmd) => {
    if (ADMIN_SLASH_NAMES.has(cmd.name)) {
      return {
        id: cmd.id,
        permissions: [
          { id: guildId, type: 1, permission: false },
          { id: adminRoleId, type: 1, permission: true },
        ],
      };
    }
    return { id: cmd.id, permissions: [] as { id: string; type: number; permission: boolean }[] };
  });

  const permRes = await fetch(
    `${DISCORD_API}/applications/${applicationId}/guilds/${guildId}/commands/permissions`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!permRes.ok) {
    const errText = await permRes.text();
    console.error("===== ⚠️ Error setting command visibility (permissions) =====");
    console.error(`${permRes.status} ${permRes.statusText}\n${errText}`);
    process.exitCode = 1;
    return;
  }

  console.info(
    `===== ✅ Admin-only visibility applied (${ADMIN_SLASH_NAMES.size} commands → role ${adminRoleId}) =====`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
