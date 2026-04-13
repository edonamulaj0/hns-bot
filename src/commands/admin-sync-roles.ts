import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { syncAllRoles } from "../role-manager";
import { isAdmin } from "./admin";

export function registerAdminSyncRoles(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-sync-roles", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized." });
        return;
      }

      const prisma = getPrisma(ctx.env.DB);
      const processed = await syncAllRoles(ctx, prisma);
      await ctx.followup({
        content: `✅ Role sync complete. ${processed} members processed.`,
      });
    }),
  );
}
