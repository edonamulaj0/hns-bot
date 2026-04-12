import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";

/** Discord shortcut: primary submission path is the website. */
export function registerSubmit(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("submit", async (c) => {
    const base = c.env.BASE_URL?.replace(/\/$/, "") || "https://h4cknstack.com";
    return c.flags("EPHEMERAL").res(`Submit your project at **${base}/submit**`);
  });
}
