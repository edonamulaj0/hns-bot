import { Modal, TextInput } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import { $channels$_$messages } from "discord-hono";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { awardPoints, XP } from "../points";
import { extractModalFields, getDiscordUserId } from "./helpers";

export function registerShareBlog(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("share-blog", async (c) => {
      // Runtime guard: BLOG_CHANNEL_ID must be set
      if (!c.env.BLOG_CHANNEL_ID || c.env.BLOG_CHANNEL_ID === "") {
        return c.res("Blog sharing is not configured. Please contact the bot administrator.");
      }
      return c.resModal(
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
      );
    })

    .modal("share-blog-modal", async (c) =>
      c.resDefer(async (ctx) => {
        const prisma = getPrisma(ctx.env.DB);
        const blogChannelId = ctx.env.BLOG_CHANNEL_ID;
        const discordId = getDiscordUserId(ctx.interaction);

        // Runtime guard: BLOG_CHANNEL_ID must be set (defense in depth)
        if (!blogChannelId || blogChannelId === "") {
          await ctx.followup({
            content: "Blog sharing is not configured. Please contact the bot administrator.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        if (!discordId) {
          await ctx.followup({
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
          await ctx.followup({
            content: "Title and URL are required.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        // Basic URL validation
        try {
          new URL(url);
        } catch {
          await ctx.followup({
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

          // Award XP for sharing
          await awardPoints(prisma, user.id, XP.BLOG_POSTED);

          // Post to blog channel
          await ctx.rest("POST", $channels$_$messages, [blogChannelId], {
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
                footer: { text: `ID: ${blog.id} • This article is archived in the portfolio database` },
              },
            ],
          });

          await ctx.followup(
            `✅ Article shared and archived! +${XP.BLOG_POSTED} XP earned.`,
          );
        } catch (err) {
          console.error(err);
          await ctx.followup({
            content: "Could not save your blog post. Please try again.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }),
    );
}
