import { Modal, TextInput } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { monthKey } from "../time";
import { extractModalFields, getDiscordUserId } from "./helpers";
import { syncDiscordIdentity } from "../discord-identity";
import {
  sendChannelMessage,
  startPublicThreadOnMessage,
} from "../discord-api";

const MONTH_RE = /^\d{4}-\d{2}$/;

function hasAdminRole(
  interaction: { member?: { roles?: string[] } },
  roleId: string,
): boolean {
  const roles = interaction.member?.roles;
  if (!roleId || !Array.isArray(roles)) return false;
  return roles.includes(roleId);
}

function trackLabel(track: string): string {
  return track === "HACKER" ? "Hacker" : "Developer";
}

export function registerPostChallenge(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("post-challenge", async (c) => {
      const roleId = c.env.ADMIN_ROLE_ID?.trim() ?? "";
      if (!hasAdminRole(c.interaction, roleId)) {
        return c.flags("EPHEMERAL").res("Unauthorized.");
      }
      const v = c.var as { track?: string; tier?: string };
      const track = (v.track ?? "").trim();
      const tier = (v.tier ?? "").trim();
      if (!track || !tier) {
        return c.flags("EPHEMERAL").res("Missing track or tier.");
      }
      return c.resModal(
        new Modal("post-challenge-modal", "Post monthly challenge")
          .custom_value(`${track}|${tier}`)
          .row(new TextInput("title", "Title").required().max_length(100))
          .row(
            new TextInput("description", "Description (markdown)", "Multi")
              .required()
              .max_length(2000),
          )
          .row(
            new TextInput("resources", "Resources (optional markdown)", "Multi").max_length(
              1000,
            ),
          )
          .row(
            new TextInput("month", "Month YYYY-MM")
              .required()
              .max_length(7)
              .value(monthKey()),
          ),
      );
    })
    .modal("post-challenge-modal", (c) =>
      c.flags("EPHEMERAL").resDefer(async (ctx) => {
        const roleId = ctx.env.ADMIN_ROLE_ID?.trim() ?? "";
        if (!hasAdminRole(ctx.interaction, roleId)) {
          await ctx.followup({ content: "Unauthorized.", flags: MessageFlags.Ephemeral });
          return;
        }

        const prisma = getPrisma(ctx.env.DB);
        const discordId = getDiscordUserId(ctx.interaction);
        if (discordId) await syncDiscordIdentity(prisma, discordId, ctx.interaction);

        const rawCv = ctx.interaction?.data?.custom_value ?? "";
        const [trackRaw, tierRaw] = rawCv.split("|");
        const track = (trackRaw ?? "").trim();
        const tier = (tierRaw ?? "").trim();
        if (!track || !tier) {
          await ctx.followup({
            content: "Invalid challenge context. Run the command again.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const fields = extractModalFields(ctx.interaction);
        const title = (fields.title ?? "").trim();
        const description = (fields.description ?? "").trim();
        const resources = (fields.resources ?? "").trim() || null;
        const month = (fields.month ?? "").trim();

        if (!MONTH_RE.test(month)) {
          await ctx.followup({
            content: "Month must be YYYY-MM.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const channelId =
          track === "HACKER"
            ? ctx.env.HACKER_CHALLENGES_CHANNEL_ID?.trim()
            : ctx.env.DEVELOPER_CHALLENGES_CHANNEL_ID?.trim();
        if (!channelId) {
          await ctx.followup({
            content: "Challenge channel ID is not configured for this track.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        try {
          const challenge = await prisma.challenge.upsert({
            where: {
              month_track_tier: { month, track, tier },
            },
            create: {
              month,
              track,
              tier,
              title,
              description,
              resources,
            },
            update: {
              title,
              description,
              resources,
              threadId: null,
            },
          });

          const msg = await sendChannelMessage(ctx.env.DISCORD_TOKEN, channelId, {
            embeds: [
              {
                title: `📌 ${title}`,
                description: description.slice(0, 4096),
                color: track === "HACKER" ? 0xed4245 : 0x5865f2,
                fields: [
                  { name: "Track", value: trackLabel(track), inline: true },
                  { name: "Tier", value: tier, inline: true },
                  { name: "Month", value: month, inline: true },
                  ...(resources
                    ? [{ name: "Resources", value: resources.slice(0, 1024), inline: false }]
                    : []),
                ],
              },
            ],
          });

          if (!msg?.id) {
            await ctx.followup({
              content: "Posted to Discord but could not read message id.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const threadName = `${month} ${tier} Submissions`;
          const thread = await startPublicThreadOnMessage(
            ctx.env.DISCORD_TOKEN,
            channelId,
            msg.id,
            threadName,
          );

          if (thread?.id) {
            await prisma.challenge.update({
              where: { id: challenge.id },
              data: { threadId: thread.id },
            });
            await sendChannelMessage(ctx.env.DISCORD_TOKEN, thread.id, {
              content:
                `📬 **${tier}** ${trackLabel(track)} Challenge — **${month}**\n` +
                `Use \`/submit\` to submit your project for this challenge.\n` +
                `All submissions are reviewed before appearing here.\n` +
                `Once approved, submissions will be posted in this thread as embeds.`,
            });
          }

          await ctx.followup({
            content: `✅ Challenge posted for **${month}** — ${trackLabel(track)} **${tier}**.`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (e) {
          console.error(e);
          await ctx.followup({
            content: "Failed to save or post challenge.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }),
    );
}
