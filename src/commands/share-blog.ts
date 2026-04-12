import { Modal, TextInput } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import { $channels$_$messages } from "discord-hono";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { awardPoints, XP } from "../points";
import { extractModalFields, getDiscordUserId } from "./helpers";
import { getCommandAttachment, validateBlogFileAttachment } from "../discord-attachments";
import { putPendingAttachment, takePendingAttachment } from "../pending-attachment";
import { syncDiscordIdentity } from "../discord-identity";
import {
  validateShareBlogArticleUrl,
  titleFromMediumOrArticleUrl,
  titleFromMarkdownFirstHeading,
  humanizeFilenameBase,
} from "../validate";

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

const MAX_FETCH_BYTES = 500 * 1024;

export function registerShareBlog(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("share-blog", async (c) => {
      const discordId = getDiscordUserId(c.interaction);
      if (!discordId) return c.res("Could not detect your Discord ID.");

      const prisma0 = getPrisma(c.env.DB);
      await syncDiscordIdentity(prisma0, discordId, c.interaction);

      const fileAtt = getCommandAttachment(c.interaction, "file");
      if (fileAtt) {
        const ferr = validateBlogFileAttachment(fileAtt);
        if (ferr) return c.flags("EPHEMERAL").res(ferr);
        const prisma = getPrisma(c.env.DB);
        await putPendingAttachment(prisma, discordId, "share_blog", {
          url: fileAtt.url,
          filename: fileAtt.filename,
          contentType: fileAtt.content_type,
          size: fileAtt.size,
        });
      }

      return c.resModal(
        new Modal("share-blog-modal", "Share a Blog Post or Article")
          .row(new TextInput("title", "Article Title").max_length(200))
          .row(
            new TextInput("url", "Article URL (optional if you uploaded a file)")
              .max_length(500)
              .placeholder("https://dev.to/you/article or Medium link"),
          )
          .row(
            new TextInput("summary", "One-line summary (optional)", "Multi")
              .max_length(300)
              .placeholder("What's this article about?"),
          ),
      );
    })

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

        await syncDiscordIdentity(prisma, discordId, ctx.interaction);

        const pending = await takePendingAttachment(prisma, discordId, "share_blog");

        const fields = extractModalFields(ctx.interaction);
        let title = fields.title?.trim() || "";
        const urlInput = fields.url?.trim() || "";
        const summary = fields.summary?.trim() || null;

        if (pending) {
          const res = await fetch(pending.url);
          if (!res.ok) {
            await blogFollowup(ctx, {
              content: "Could not download your uploaded file from Discord. Try again.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          const buf = await res.arrayBuffer();
          if (buf.byteLength > MAX_FETCH_BYTES) {
            await blogFollowup(ctx, {
              content: "Uploaded file is too large after download (max 500 KB).",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          const text = new TextDecoder("utf-8").decode(buf);
          const fallbackTitle = humanizeFilenameBase(pending.filename ?? "article.txt");
          if (!title) {
            title = titleFromMarkdownFirstHeading(text, fallbackTitle);
          }
          if (!title) title = fallbackTitle;

          const user = await prisma.user.upsert({
            where: { discordId },
            create: { discordId },
            update: {},
          });

          try {
            const blog = await prisma.blog.create({
              data: {
                userId: user.id,
                title: title.slice(0, 200),
                url: pending.url,
                content: text,
              },
            });

            await awardPoints(prisma, user.id, XP.BLOG_POSTED);

            if (channelConfigured) {
              await ctx.rest("POST", $channels$_$messages, [blogChannelId!], {
                embeds: [
                  {
                    title: `📝 ${blog.title}`,
                    description: summary ?? undefined,
                    url: blog.url,
                    color: 0x57f287,
                    fields: [
                      { name: "Shared by", value: `<@${discordId}>`, inline: true },
                      { name: "Format", value: "📄 Uploaded article", inline: true },
                      { name: "XP Earned", value: `+${XP.BLOG_POSTED}`, inline: true },
                    ],
                    footer: {
                      text: `ID: ${blog.id} • Discord CDN link may expire — mirror to stable hosting for archives`,
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
          return;
        }

        if (!urlInput) {
          await blogFollowup(ctx, {
            content: "Enter an article URL, or run `/share-blog` again with a `.txt` / `.md` file attached.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const urlErr = validateShareBlogArticleUrl(urlInput);
        if (urlErr) {
          await blogFollowup(ctx, { content: urlErr.message, flags: MessageFlags.Ephemeral });
          return;
        }

        let finalTitle = title;
        if (!finalTitle) {
          try {
            finalTitle = titleFromMediumOrArticleUrl(urlInput) ?? "Article";
          } catch {
            finalTitle = "Article";
          }
        }

        try {
          const user = await prisma.user.upsert({
            where: { discordId },
            create: { discordId },
            update: {},
          });

          const blog = await prisma.blog.create({
            data: {
              userId: user.id,
              title: finalTitle.slice(0, 200),
              url: urlInput,
            },
          });

          await awardPoints(prisma, user.id, XP.BLOG_POSTED);

          if (channelConfigured) {
            await ctx.rest("POST", $channels$_$messages, [blogChannelId!], {
              embeds: [
                {
                  title: `📝 ${blog.title}`,
                  description: summary ?? undefined,
                  url: blog.url,
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
