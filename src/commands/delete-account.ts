import { Button, Components } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { getDiscordUserId } from "./helpers";

export function registerDeleteAccount(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("delete-account", async (c) => {
      return c.flags("EPHEMERAL").res({
        content:
          "This **permanently** deletes your H4cknStack account and all submissions, votes, enrollments, and blogs. This cannot be undone.\n\nYou can also delete from the website: **Profile → Danger zone**.",
        components: new Components().row(
          new Button("delete_account_confirm", "Yes, delete my account", "Danger"),
        ),
      });
    })
    .component("delete_account_confirm", (c) =>
      c.flags("EPHEMERAL").resDefer(async (ctx) => {
        const prisma = getPrisma(ctx.env.DB);
        const discordId = getDiscordUserId(ctx.interaction);
        if (!discordId) {
          await ctx.followup({
            content: "Could not detect your Discord ID.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        try {
          await prisma.user.delete({ where: { discordId } });
          await ctx.followup({
            content: "Your account and all data have been permanently deleted.",
            flags: MessageFlags.Ephemeral,
          });
        } catch {
          await ctx.followup({
            content: "No account found, or deletion failed.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }),
    );
}
