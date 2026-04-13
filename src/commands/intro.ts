import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { isAdmin } from "./admin";
import { getDiscordUserId } from "./helpers";

function introMessage(base: string): string {
  return [
    "Hey — quick note from the team.",
    "",
    "If you just got here (or you’ve been lurking): welcome. We’re glad you’re around.",
    "",
    "H4ck&Stack is a pretty simple loop once you’re in it: each month there’s a **Developer** track (ship a project) and a **Hacker** track (security stuff — writeups, tools, research). You build during the window, put it on the site, then when voting opens people vote and you earn **XP** that feeds the leaderboard and your Discord role. Nothing revolutionary — just a reason to finish something and show it off.",
    "",
    "The website is live: **" + base + "**",
    "",
    "Whenever you’re ready, open it and hit **Sign in** with Discord (you’re already in this server, so that part’s easy). After that, poke **/profile** on the site and add GitHub, a short bio, whatever — it’s how people find you on the members page.",
    "",
    "When the **build window** is open: run **`/enroll`** here to pick your track and tier, then **`/submit`** will point you at the right place on the web. Voting happens on the site when we say so; we’ll shout in here.",
    "",
    "**`/pulse`** is optional — it’s just a peek at your GitHub activity for the month and a rough “if the month ended now” pulse number. It doesn’t add XP; think of it as a dashboard, not a reward.",
    "",
    "Want the full list of slash commands with short descriptions? Run **`/help`** — only you see that reply.",
    "",
    "The ones people use most: **`/profile`**, **`/submit`**, **`/enroll`**, **`/leaderboard`**, **`/pulse`**, **`/link-github`** / **`/unlink-github`**, **`/delete-account`** (nuclear option, same as the site).",
    "",
    "Don't forget to call your friends, their friends and their mothers to join!",
    "",
    "_This was posted with `/intro`. Questions? Drop them in chat._"
  ].join("\n");
}

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
      const text = introMessage(base);

      if (text.length > 2000) {
        await ctx.followup({
          content: text.slice(0, 1997) + "…",
        });
        return;
      }

      await ctx.followup({ content: text });
    }),
  );
}
