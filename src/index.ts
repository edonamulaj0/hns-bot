import {
  $channels$_$messages,
  Button,
  Components,
  DiscordHono,
  Modal,
  TextInput,
} from "discord-hono";
import { Prisma, PrismaClient } from "@prisma/client/edge";
import { PrismaD1 } from "@prisma/adapter-d1";
import { MessageFlags } from "discord-api-types/v10";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { handleAdminReview, handleVote } from "./review-handler";
import type { HonoWorkerEnv, WorkerBindings } from "./worker-env";
import { awardPoints, XP, formatLeaderboardEmbed } from "./points";
import { extractGithubUsername, fetchMonthlyPulse } from "./github";
import { getMonthlyPhase, monthKey } from "./time";
import { handleApiRequest } from "./api";

// ─── Prisma helper ───────────────────────────────────────────────────────────

function getPrisma(db: WorkerBindings["DB"]) {
  return new PrismaClient({ adapter: new PrismaD1(db) });
}

// ─── Modal field helpers ──────────────────────────────────────────────────────

function extractModalFields(interaction: any): Record<string, string> {
  const rows = interaction?.data?.components ?? [];
  const values: Record<string, string> = {};
  for (const row of rows) {
    for (const component of row?.components ?? []) {
      const customId = component?.custom_id;
      const value = component?.value;
      if (customId && typeof value === "string") values[customId] = value;
    }
  }
  return values;
}

function getDiscordUserId(interaction: any): string | null {
  return interaction?.member?.user?.id ?? interaction?.user?.id ?? null;
}

function parseTechStack(input?: string): string[] {
  if (!input) return [];
  return input.split(",").map((s) => s.trim()).filter(Boolean);
}

function formatTechStackForModal(stored: Prisma.JsonValue | null | undefined): string {
  if (stored == null) return "";
  if (Array.isArray(stored)) return stored.map(String).join(", ");
  if (typeof stored === "string") return stored;
  return "";
}

function truncatePrefill(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : text.slice(0, maxLen);
}

function normalizeProfileString(raw: string | undefined): string | null {
  const t = (raw ?? "").trim();
  return t === "" ? null : t;
}

function profilePayloadFromModal(fields: Record<string, string>) {
  const bio = normalizeProfileString(fields.about_me);
  const github = normalizeProfileString(fields.github);
  const linkedin = normalizeProfileString(fields.linkedin);
  const techStackList = parseTechStack(fields.tech_stack);
  const techStack: Prisma.InputJsonValue | typeof Prisma.DbNull =
    techStackList.length > 0 ? [...techStackList] : Prisma.DbNull;
  return { bio, github, linkedin, techStack };
}

// ─── Vote-phase feed ──────────────────────────────────────────────────────────

async function postVotePhaseFeed(
  c: any,
  prisma: PrismaClient,
  votingChannelId: string,
  targetMonth: string,
) {
  const approved = await prisma.submission.findMany({
    where: { month: targetMonth, isApproved: true },
    include: { user: { select: { discordId: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (approved.length === 0) return;

  // Post a header message
  await c.rest("POST", $channels$_$messages, [votingChannelId], {
    content: `🗳️ **Voting is now open for ${targetMonth}!** Cast your votes on the projects below. You have one vote per project.`,
  });

  // Post each approved submission as its own message with a Vote button
  for (const item of approved) {
    await c.rest("POST", $channels$_$messages, [votingChannelId], {
      embeds: [
        {
          title: item.title,
          description: item.description,
          color: 0x5865f2,
          fields: [
            { name: "Builder", value: `<@${item.user.discordId}>`, inline: true },
            { name: "Tier", value: item.tier, inline: true },
            { name: "Votes", value: `${item.votes}`, inline: true },
            { name: "Repository", value: item.repoUrl, inline: false },
            ...(item.demoUrl ? [{ name: "Demo", value: item.demoUrl, inline: false }] : []),
          ],
          footer: { text: `Submission ID: ${item.id}` },
        },
      ],
      components: new Components().row(
        new Button(`vote:${item.id}`, "🗳️ Vote", "Primary"),
      ),
    });
  }
}

async function postPublishAnnouncement(
  c: any,
  votingChannelId: string,
  targetMonth: string,
) {
  await c.rest("POST", $channels$_$messages, [votingChannelId], {
    content: `🎉 **${targetMonth} is now published!** The results are live on the portfolio website. Congrats to everyone who shipped something this month.`,
  });
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new DiscordHono<HonoWorkerEnv>()

  // ── /setup-profile ──────────────────────────────────────────────────────────
  .command("setup-profile", async (c) => {
    const userId = getDiscordUserId(c.interaction);
    if (!userId) return c.res("Could not detect your Discord ID.");

    let existing: {
      bio: string | null;
      github: string | null;
      linkedin: string | null;
      techStack: Prisma.JsonValue | null;
    } | null = null;

    try {
      const prisma = getPrisma(c.env.DB);
      existing = await prisma.user.findUnique({
        where: { discordId: userId },
        select: { bio: true, github: true, linkedin: true, techStack: true },
      });
    } catch (err) {
      console.error(err);
      return c.res("Could not load your saved profile. Please try again.");
    }

    return c.resModal(
      new Modal("setup-profile-modal", "Setup Portfolio Profile")
        .row(
          new TextInput("about_me", "About Me", "Multi")
            .required()
            .max_length(500)
            .value(truncatePrefill(existing?.bio ?? "", 500)),
        )
        .row(
          new TextInput("linkedin", "LinkedIn URL")
            .required()
            .max_length(500)
            .placeholder("https://linkedin.com/in/username")
            .value(truncatePrefill(existing?.linkedin ?? "", 500)),
        )
        .row(
          new TextInput("github", "GitHub URL")
            .required()
            .max_length(500)
            .placeholder("https://github.com/username")
            .value(truncatePrefill(existing?.github ?? "", 500)),
        )
        .row(
          new TextInput("tech_stack", "Tech Stack (comma separated)", "Multi")
            .required()
            .max_length(1000)
            .placeholder("TypeScript, React, Prisma, Cloudflare Workers")
            .value(truncatePrefill(formatTechStackForModal(existing?.techStack), 1000)),
        ),
    );
  })

  .modal("setup-profile-modal", async (c) =>
    c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const userId = getDiscordUserId(ctx.interaction);
      if (!userId) {
        await ctx.followup({ content: "Could not detect your Discord ID.", flags: MessageFlags.Ephemeral });
        return;
      }

      const fields = extractModalFields(ctx.interaction);
      try {
        const payload = profilePayloadFromModal(fields);
        await prisma.user.upsert({
          where: { discordId: userId },
          create: { discordId: userId, ...payload },
          update: payload,
        });
        await ctx.followup("✅ Profile saved. Your portfolio identity is now updated.");
      } catch (err) {
        console.error(err);
        await ctx.followup({ content: "Could not save your profile. Please try again.", flags: MessageFlags.Ephemeral });
      }
    }),
  )

  // ── /submit ──────────────────────────────────────────────────────────────────
  .command("submit", async (c) => {
    const phase = getMonthlyPhase();
    if (phase !== "BUILD") {
      return c.res("Submissions are closed. `/submit` is only active from day 1–21 (UTC).");
    }

    return c.resModal(
      new Modal("submit-project-modal", "Submit Monthly Challenge Project")
        .row(new TextInput("tier", "Tier (Beginner / Intermediate / Advanced)").required())
        .row(new TextInput("title", "Project Title").required().max_length(100))
        .row(new TextInput("description", "Project Description", "Multi").required().max_length(1000))
        .row(new TextInput("repo_url", "Repository URL").required().placeholder("https://github.com/you/project"))
        .row(new TextInput("demo_url", "Demo URL (optional)").placeholder("https://your-demo.com")),
    );
  })

  .modal("submit-project-modal", async (c) =>
    c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const adminChannelId = ctx.env.ADMIN_CHANNEL_ID;
      const discordId = getDiscordUserId(ctx.interaction);

      if (!discordId) {
        await ctx.followup({ content: "Could not detect your Discord ID.", flags: MessageFlags.Ephemeral });
        return;
      }

      const fields = extractModalFields(ctx.interaction);
      const currentMonth = monthKey();

      try {
        const user = await prisma.user.upsert({
          where: { discordId },
          create: { discordId },
          update: {},
        });

        const submission = await prisma.submission.create({
          data: {
            userId: user.id,
            month: currentMonth,
            tier: (fields.tier ?? "General").trim(),
            title: (fields.title ?? "Untitled").trim(),
            description: (fields.description ?? "").trim(),
            repoUrl: (fields.repo_url ?? "").trim(),
            demoUrl: fields.demo_url?.trim() || null,
            isApproved: false,
            votes: 0,
          },
        });

        await ctx.rest("POST", $channels$_$messages, [adminChannelId], {
          content: `📬 New submission pending review from <@${discordId}>`,
          embeds: [
            {
              title: submission.title,
              description: submission.description,
              color: 0x5865f2,
              fields: [
                { name: "Month", value: submission.month, inline: true },
                { name: "Tier", value: submission.tier, inline: true },
                { name: "Repository", value: submission.repoUrl, inline: false },
                { name: "Demo", value: submission.demoUrl ?? "N/A", inline: false },
              ],
              footer: { text: `ID: ${submission.id}` },
            },
          ],
          components: new Components().row(
            new Button(`review:approve:${submission.id}`, "✅ Approve", "Success"),
            new Button(`review:reject:${submission.id}`, "❌ Reject", "Danger"),
          ),
        });

        await ctx.followup("📬 Submission received! It's pending admin review.");
      } catch (err: any) {
        console.error(err);
        if (err?.code === "P2002") {
          await ctx.followup({ content: "You've already submitted a project with this title this month.", flags: MessageFlags.Ephemeral });
          return;
        }
        await ctx.followup({ content: "Something went wrong. Please try again.", flags: MessageFlags.Ephemeral });
      }
    }),
  )

  // ── /share-blog ───────────────────────────────────────────────────────────────
  .command("share-blog", async (c) =>
    c.resModal(
      new Modal("share-blog-modal", "Share a Blog Post or Article")
        .row(new TextInput("title", "Article Title").required().max_length(200))
        .row(new TextInput("url", "Article URL").required().placeholder("https://dev.to/you/article"))
        .row(new TextInput("summary", "One-line summary (optional)", "Multi").max_length(300).placeholder("What's this article about?")),
    ),
  )

  .modal("share-blog-modal", async (c) =>
    c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const blogChannelId = ctx.env.BLOG_CHANNEL_ID;
      const discordId = getDiscordUserId(ctx.interaction);

      if (!discordId) {
        await ctx.followup({ content: "Could not detect your Discord ID.", flags: MessageFlags.Ephemeral });
        return;
      }

      const fields = extractModalFields(ctx.interaction);
      const title = fields.title?.trim();
      const url = fields.url?.trim();
      const summary = fields.summary?.trim() || null;

      if (!title || !url) {
        await ctx.followup({ content: "Title and URL are required.", flags: MessageFlags.Ephemeral });
        return;
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        await ctx.followup({ content: "Please enter a valid URL.", flags: MessageFlags.Ephemeral });
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

        await ctx.followup(`✅ Article shared and archived! +${XP.BLOG_POSTED} XP earned.`);
      } catch (err) {
        console.error(err);
        await ctx.followup({ content: "Could not save your blog post. Please try again.", flags: MessageFlags.Ephemeral });
      }
    }),
  )

  // ── /pulse ───────────────────────────────────────────────────────────────────
  .command("pulse", async (c) =>
    c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const discordId = getDiscordUserId(ctx.interaction);

      if (!discordId) {
        await ctx.followup({ content: "Could not detect your Discord ID.", flags: MessageFlags.Ephemeral });
        return;
      }

      const currentMonth = monthKey();

      const user = await prisma.user.findUnique({
        where: { discordId },
        select: { id: true, github: true, lastPulseMonth: true },
      });

      if (!user?.github) {
        await ctx.followup({
          content: "You haven't set a GitHub URL yet. Run `/setup-profile` first.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (user.lastPulseMonth === currentMonth) {
        await ctx.followup({
          content: `You've already run \`/pulse\` for **${currentMonth}**. Come back next month!`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const username = extractGithubUsername(user.github);
      if (!username) {
        await ctx.followup({
          content: "Could not parse a GitHub username from your profile URL. Check `/setup-profile`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      try {
        const pulse = await fetchMonthlyPulse(username, currentMonth, ctx.env.GITHUB_TOKEN);

        // Update user: award XP, mark pulse as run this month
        await prisma.user.update({
          where: { id: user.id },
          data: { lastPulseMonth: currentMonth },
        });

        if (pulse.xpEarned > 0) {
          await awardPoints(prisma, user.id, pulse.xpEarned);
        }

        const noActivity = pulse.commits === 0 && pulse.prsOpened === 0 && pulse.prsMerged === 0;

        await ctx.followup({
          embeds: [
            {
              title: `⚡ GitHub Pulse — ${currentMonth}`,
              description: noActivity
                ? `No public GitHub activity found for **@${username}** this month. Keep shipping!`
                : undefined,
              color: pulse.xpEarned > 0 ? 0x57f287 : 0x99aab5,
              fields: noActivity
                ? []
                : [
                    { name: "GitHub", value: `[@${username}](${user.github})`, inline: true },
                    { name: "Commits", value: `${pulse.commits}`, inline: true },
                    { name: "PRs Opened", value: `${pulse.prsOpened}`, inline: true },
                    { name: "PRs Merged", value: `${pulse.prsMerged}`, inline: true },
                    { name: "XP Earned", value: `**+${pulse.xpEarned}**`, inline: true },
                    ...(pulse.repoCount > 0 ? [{ name: "Repos Active", value: `${pulse.repoCount}`, inline: true }] : []),
                  ],
              footer: { text: "Pulse can only be run once per month. Max 100 XP." },
            },
          ],
        });
      } catch (err) {
        console.error("pulse error:", err);
        await ctx.followup({
          content: "Could not fetch GitHub activity. Make sure your profile URL is correct.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }),
  )

  // ── /leaderboard ─────────────────────────────────────────────────────────────
  .command("leaderboard", async (c) =>
    c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const currentMonth = monthKey();

      const top = await prisma.user.findMany({
        where: { points: { gt: 0 } },
        select: { discordId: true, points: true, rank: true },
        orderBy: [{ points: "desc" }, { rank: "asc" }],
        take: 10,
      });

      await ctx.followup({
        embeds: [formatLeaderboardEmbed(top, currentMonth) as any],
      });
    }),
  )

  // ── Component handlers ────────────────────────────────────────────────────────
  .component("", async (c) => {
    const customId: string = c.interaction?.data?.custom_id ?? "";

    if (customId.startsWith("review:")) {
      return c.update().resDefer(async (ctx) => {
        const prisma = getPrisma(ctx.env.DB);
        await handleAdminReview(ctx, prisma, ctx.env.ADMIN_CHANNEL_ID);
      });
    }

    if (customId.startsWith("vote:")) {
      return c.resDefer(async (ctx) => {
        const prisma = getPrisma(ctx.env.DB);
        await handleVote(ctx, prisma);
      });
    }

    return c.res("Unknown component.");
  })

  // ── Cron ──────────────────────────────────────────────────────────────────────
  .cron("5 0 * * *", async (c) => {
    const prisma = getPrisma(c.env.DB);
    const now = new Date();
    const phase = getMonthlyPhase(now);
    const currentMonth = monthKey(now);

    if (phase === "VOTE") {
      await postVotePhaseFeed(c, prisma, c.env.VOTING_CHANNEL_ID, currentMonth);
    }

    if (phase === "PUBLISH") {
      await postPublishAnnouncement(c, c.env.VOTING_CHANNEL_ID, currentMonth);
    }
  });

// ─── Worker export ────────────────────────────────────────────────────────────

export default {
  fetch: async (request: Request, env: WorkerBindings, executionCtx?: ExecutionContext) => {
    // REST API routes
    const apiResponse = await handleApiRequest(request, env);
    if (apiResponse) return apiResponse;

    // Discord interaction handler
    return app.fetch(request, env, executionCtx);
  },
  scheduled: app.scheduled,
};
