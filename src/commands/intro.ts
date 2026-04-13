import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { isAdmin } from "./admin";
import { getDiscordUserId } from "./helpers";

export function registerIntro(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("intro", async (c) =>
    c.resDefer(async (ctx) => {
      const callerId = getDiscordUserId(ctx.interaction);
      if (!callerId) {
        await ctx.followup({
          content: "Could not detect your Discord ID.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const adminRoleId = (ctx.env.ADMIN_ROLE_ID ?? "").trim();
      if (!adminRoleId || !isAdmin(ctx.interaction, adminRoleId)) {
        await ctx.followup({
          content: "⛔ Only moderators (server **ADMIN_ROLE_ID**) can post `/intro`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const base = ctx.env.BASE_URL?.replace(/\/$/, "") || "https://h4cknstack.com";

      await ctx.followup({
        embeds: [
          {
            title: "🚀 H4ck&Stack — site is live",
            description: [
              "Welcome! **H4ck&Stack** runs **monthly challenges**: a **Developer** track for shipping software and a **Hacker** track for security work (writeups, tools, research).",
              "",
              "Submit through the **website**, vote when the vote window opens, and earn **XP** that powers the **leaderboard** and your **Discord role** progression.",
            ].join("\n"),
            color: 0x57f287,
          },
          {
            title: "Sign in & get started",
            color: 0x5865f2,
            fields: [
              {
                name: "Website",
                value: `[**${base}**](${base})`,
                inline: false,
              },
              {
                name: "Sign in",
                value:
                  "Open the site and click **Sign in** → authorize with **Discord**. You must be a member of this server.",
                inline: false,
              },
              {
                name: "Profile",
                value: `Complete your profile at [**${base}/profile**](${base}/profile) (GitHub URL, bio, links, tech stack).`,
                inline: false,
              },
              {
                name: "Enroll & submit",
                value:
                  `During the **build window**, run \`/enroll\` here to pick your **track** and **tier**, then submit at [**${base}/submit**](${base}/submit).`,
                inline: false,
              },
              {
                name: "Voting & pulse",
                value:
                  `Vote on the site when voting opens (links are announced here). Use \`/pulse\` anytime for a **GitHub activity preview** (no XP from the command).`,
                inline: false,
              },
            ],
          },
          {
            title: "Discord commands",
            description: [
              "**`/help`** — full command list (ephemeral).",
              "**`/profile`** — see a member portfolio card.",
              "**`/submit`** — submission link.",
              "**`/enroll`** — choose challenge track/tier.",
              "**`/leaderboard`** — top XP this month.",
              "**`/pulse`** — GitHub stats + estimated month-end pulse XP (preview).",
              "**`/link-github`** / **`/unlink-github`** — OAuth for private repo counts in `/pulse`.",
              "**`/delete-account`** — remove your H4ck&Stack account.",
            ].join("\n"),
            color: 0xfee75c,
            footer: { text: "Mods: /intro posts this announcement · anyone: /help for details" },
          },
        ],
      });
    }),
  );
}
