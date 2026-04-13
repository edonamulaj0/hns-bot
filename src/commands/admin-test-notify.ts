import type { DiscordHono } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "../worker-env";
import { isAdmin } from "./admin";
import {
  buildAdminTestNotifyPayload,
  isAdminNotifyTemplateType,
} from "../notifications";

export function registerAdminTestNotify(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("admin-test-notify", async (c) =>
    c.resDefer(async (ctx) => {
      if (!ctx.env.ADMIN_ROLE_ID || !isAdmin(ctx.interaction, ctx.env.ADMIN_ROLE_ID)) {
        await ctx.followup({ content: "⛔ Unauthorized.", flags: MessageFlags.Ephemeral });
        return;
      }

      const type = String((ctx.var as { type?: string }).type ?? "");
      if (!type || !isAdminNotifyTemplateType(type)) {
        await ctx.followup({
          content: "Missing or invalid **type** option.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        const payload = await buildAdminTestNotifyPayload(ctx.env, type);
        await ctx.followup(payload);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await ctx.followup({
          content: `❌ Could not build notification template: ${msg}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }),
  );
}
