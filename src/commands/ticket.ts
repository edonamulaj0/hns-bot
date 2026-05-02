import type { DiscordHono } from "discord-hono";
import { Modal, TextInput } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { HonoWorkerEnv } from "../worker-env";
import { sendDirectMessage } from "../discord-api";
import { extractModalFields, getDiscordUserId } from "./helpers";

const TICKET_MODAL_ID = "hns_ticket";

function resolveTicketRecipientDiscordId(env: HonoWorkerEnv["Bindings"]): string | null {
  const explicit = env.TICKET_ADMIN_DISCORD_ID?.trim();
  if (explicit && /^\d{17,20}$/.test(explicit)) return explicit;
  const raw = (env.ADMIN_DISCORD_IDS ?? "").trim();
  const first = raw.split(",")[0]?.trim();
  if (first && /^\d{17,20}$/.test(first)) return first;
  return null;
}

export function registerTicket(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("ticket", async (c) => {
      const discordId = getDiscordUserId(c.interaction);
      if (!discordId) {
        return c.flags("EPHEMERAL").res("Could not detect your Discord ID.");
      }

      if (!resolveTicketRecipientDiscordId(c.env)) {
        return c.flags("EPHEMERAL").res(
          "Feedback inbox isn’t configured. Ask an admin to set **TICKET_ADMIN_DISCORD_ID** on the bot Worker (or add your Discord user id as the first entry in **ADMIN_DISCORD_IDS**).",
        );
      }

      return c.resModal(
        new Modal(TICKET_MODAL_ID, "Bug report · feedback · anything")
          .row(
            new TextInput("ticket_title", "Title", "Single")
              .placeholder("Short summary")
              .min_length(4)
              .max_length(100)
              .required(true),
          )
          .row(
            new TextInput("ticket_body", "Details", "Multi")
              .placeholder("What happened? URLs, steps, browser…")
              .min_length(10)
              .max_length(3900)
              .required(true),
          ),
      );
    })
    .modal(TICKET_MODAL_ID, async (c) => {
      const recipientId = resolveTicketRecipientDiscordId(c.env);
      if (!recipientId) {
        return c.flags("EPHEMERAL").res("Feedback inbox isn’t configured.");
      }

      const fields = extractModalFields(c.interaction);
      const title = (fields.ticket_title ?? "").trim();
      const body = (fields.ticket_body ?? "").trim();
      if (title.length < 4 || body.length < 10) {
        return c.flags("EPHEMERAL").res("Please fill in both fields.");
      }

      const safeTitle = title.replace(/\*\*/g, "‖").slice(0, 200);
      const safeBody = body.slice(0, 3800);
      const content = `**New ticket — ${safeTitle}**\n\n${safeBody}`;

      return c.flags("EPHEMERAL").resDefer(async (ctx) => {
        const ok = await sendDirectMessage(ctx.env.DISCORD_TOKEN, recipientId, { content });
        if (!ok) {
          await ctx.followup({
            content:
              "Couldn’t deliver your ticket (DM failed). The recipient may need to share a server with the bot and allow direct messages.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        await ctx.followup({
          content:
            "Thanks — your message was sent. It doesn’t include your name so it stays anonymous on their side.",
          flags: MessageFlags.Ephemeral,
        });
      });
    });
}
