import { Modal, TextInput } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import { $channels$_$messages } from "discord-hono";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { awardPoints, XP } from "../points";
import { extractModalFields, getDiscordUserId } from "./helpers";

async function blogFollowup(
  ctx: { followup: (data: object | string) => Promise<unknown> },
  data: object | string,
) {
  try {
    await ctx.followup(data);
  } catch (e) {
    console.error("share-blog followup failed:", e);
  }
}

export function registerShareBlog(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("share-blog", async (c) =>
      c.resModal(
        new Modal("share-blog-modal", "Share a Blog Post or Article")
          .row(new TextInput("title", "Article Title").required().max_length(200))
          .row(
            new TextInput("url", "Article URL")
              .required()
              .placeholder("https://dev.to/you/article"),
          )
          .row(
            new TextInput("summary", "One-line summary (optional)", "Multi")
              .max_length(300)
              .placeholder("What's this article about?"),
          ),
      )
    )

    .modal("share-blog-modal", async (c) =>
      c.flags("EPHEMERAL").resDefer(async (ctx) => {
        const prisma = getPrisma(ctx.env.DB);
        const blogChannelId = ctx.env.BLOG_CHANNEL_ID?.trim();
        const channelConfigured = Boolean(blogChannelId);
        const discordId = getDiscordUserId(ctx.interaction);

        if (!discordId) {
          await blogFollowup(ctx, {
            content: "Could not detect your Discord ID.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const fields = extractModalFields(ctx.interaction);
        const title = fields.title?.trim();
        const url = fields.url?.trim();
        const summary = fields.summary?.trim() || null;

        if (!title || !url) {
          await blogFollowup(ctx, {
            content: "Title and URL are required.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        try {
          new URL(url);
        } catch {
          await blogFollowup(ctx, {
            content: "Please enter a valid URL.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        try {
          const user = await prisma.user.upsert({
            where: { discordId },
            create: { discordId },
            update: {},
          });

          const blog = await prisma.blog.create({
            data: { userId: user.id, title, url },
          });

          await awardPoints(prisma, user.id, XP.BLOG_POSTED);

          if (channelConfigured) {
            await ctx.rest("POST", $channels$_$messages, [blogChannelId!], {
              embeds: [
                {
                  title: `📝 ${title}`,
                  description: summary ?? undefined,
                  url,
                  color: 0x57f287,
                  fields: [
                    { name: "Shared by", value: `<@${discordId}>`, inline: true },
                    { name: "XP Earned", value: `+${XP.BLOG_POSTED}`, inline: true },
                  ],
                  footer: {
                    text: `ID: ${blog.id} • This article is archived in the portfolio database`,
                  },
                },
              ],
            });
          }

          const extra = channelConfigured
            ? ""
            : "\n\n_Set `BLOG_CHANNEL_ID` on the worker to also announce posts in a channel._";

          await blogFollowup(ctx, {
            content: `✅ Article archived! +${XP.BLOG_POSTED} XP earned.${extra}`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (err) {
          console.error(err);
          await blogFollowup(ctx, {
            content: "Could not save your blog post. Please try again.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }),
    );
}
