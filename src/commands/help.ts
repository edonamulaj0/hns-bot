import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { isAdmin } from "./admin";
import { getDiscordUserId } from "./helpers";

const MEMBER_ROWS: { name: string; value: string }[] = [
  {
    name: "/help",
    value: "Show this command list (only you see it).",
  },
  {
    name: "/profile [user]",
    value: "Portfolio-style profile (defaults to you). Edit fields on the website.",
  },
  {
    name: "/enroll",
    value: "Pick Developer or Hacker track + tier during the build window before submitting.",
  },
  {
    name: "/leaderboard",
    value: "Top members by XP for the current month.",
  },
  {
    name: "/pulse",
    value: "Award monthly GitHub activity XP and show a month-end estimate.",
  },
  {
    name: "/link-github · /unlink-github",
    value: "Connect or remove GitHub OAuth so `/pulse` can include private repos.",
  },
  {
    name: "/delete-account",
    value: "Permanently delete your H4ck&Stack account (same as the website danger zone).",
  },
];

const ADMIN_ROWS: { name: string; value: string }[] = [
  {
    name: "/admin",
    value: "Health check: XP role mappings vs Discord hierarchy.",
  },
  {
    name: "/admin-test-claude",
    value: "Test Anthropic API connectivity for challenge generation.",
  },
  {
    name: "/admin-test-generate",
    value:
      "Generate this month’s challenges as a channel preview; **Post for real** replaces DB rows for the month and posts to challenge channels.",
  },
  {
    name: "/admin-test-notify",
    value: "Post a lifecycle notification template here for preview.",
  },
  {
    name: "/admin-reset-month",
    value: "Reset current month challenges & submissions (testing).",
  },
  {
    name: "/admin-sync-roles",
    value: "Re-sync all member Discord roles from current XP.",
  },
  {
    name: "/admin-sync-github-xp",
    value: "Backfill GitHub activity XP from Jul 2025 through May 2026.",
  },
];

export function registerHelp(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("help", async (c) => {
    const callerId = getDiscordUserId(c.interaction);
    if (!callerId) {
      return c.flags("EPHEMERAL").res("Could not detect your Discord ID.");
    }

    const base = c.env.BASE_URL?.replace(/\/$/, "") || "https://h4cknstack.com";
    const adminRoleId = (c.env.ADMIN_ROLE_ID ?? "").trim();
    const showAdmin = adminRoleId && isAdmin(c.interaction, adminRoleId);

    const embeds: object[] = [
      {
        title: "H4ck&Stack bot — commands",
        description: `Website: **${base}** · Use **Sign in** on the site (Discord OAuth) to manage your profile, submit, and vote.`,
        color: 0x5865f2,
        fields: MEMBER_ROWS,
      },
    ];

    if (showAdmin) {
      embeds.push({
        title: "Admin commands",
        description: "These require the configured **ADMIN_ROLE_ID** role.",
        color: 0xed4245,
        fields: ADMIN_ROWS,
      });
    }

    return c.flags("EPHEMERAL").res({ embeds });
  });
}
