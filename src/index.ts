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
import { handleAdminReview } from "./review-handler";
import type { HonoWorkerEnv, WorkerBindings } from "./worker-env";

type Phase = "BUILD" | "VOTE" | "PUBLISH" | "POST_PUBLISH";

function getPrisma(db: WorkerBindings["DB"]) {
  return new PrismaClient({ adapter: new PrismaD1(db) });
}

function monthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthlyPhase(date = new Date()): Phase {
  const day = date.getUTCDate();

  if (day >= 1 && day <= 21) return "BUILD";
  if (day >= 22 && day <= 29) return "VOTE";
  if (day === 30) return "PUBLISH";
  return "POST_PUBLISH";
}

function parseTechStack(input?: string): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Stored Json → comma-separated text for modal pre-fill (Discord text inputs). */
function formatTechStackForModal(stored: Prisma.JsonValue | null | undefined): string {
  if (stored == null) return "";
  if (Array.isArray(stored)) {
    return stored
      .map((item) => (typeof item === "string" ? item : String(item)))
      .join(", ");
  }
  if (typeof stored === "string") return stored;
  return "";
}

function truncatePrefill(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen);
}

/** Optional string fields: trim; empty → null so we don’t persist misleading "". */
function normalizeProfileString(raw: string | undefined): string | null {
  const t = (raw ?? "").trim();
  return t === "" ? null : t;
}

/**
 * Maps modal custom_ids to Prisma User fields. techStack is a JSON array in the DB.
 */
function profilePayloadFromModal(fields: Record<string, string>): {
  bio: string | null;
  github: string | null;
  linkedin: string | null;
  techStack: Prisma.InputJsonValue | typeof Prisma.DbNull;
} {
  const bio = normalizeProfileString(fields.about_me);
  const github = normalizeProfileString(fields.github);
  const linkedin = normalizeProfileString(fields.linkedin);
  const techStackList = parseTechStack(fields.tech_stack);
  const techStack: Prisma.InputJsonValue | typeof Prisma.DbNull =
    techStackList.length > 0 ? [...techStackList] : Prisma.DbNull;

  return { bio, github, linkedin, techStack };
}

function extractModalFields(interaction: any): Record<string, string> {
  const rows = interaction?.data?.components ?? [];
  const values: Record<string, string> = {};

  for (const row of rows) {
    for (const component of row?.components ?? []) {
      const customId = component?.custom_id;
      const value = component?.value;
      if (customId && typeof value === "string") {
        values[customId] = value;
      }
    }
  }

  return values;
}

function getDiscordUserId(interaction: any): string | null {
  return interaction?.member?.user?.id ?? interaction?.user?.id ?? null;
}

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

  await c.rest("POST", $channels$_$messages, [votingChannelId], {
    content: `Voting phase is live for **${targetMonth}**. Vote on approved projects below!`,
    embeds: approved.slice(0, 10).map((item) => ({
      title: item.title,
      description: item.description,
      color: 0xfee75c,
      fields: [
        { name: "Builder", value: `<@${item.user.discordId}>`, inline: true },
        { name: "Tier", value: item.tier, inline: true },
        { name: "Repository", value: item.repoUrl, inline: false },
        { name: "Demo", value: item.demoUrl ?? "N/A", inline: false },
      ],
    })),
  });
}

async function postPublishAnnouncement(
  c: any,
  votingChannelId: string,
  targetMonth: string,
) {
  await c.rest("POST", $channels$_$messages, [votingChannelId], {
    content: `Day 30 reached for **${targetMonth}**. This month is now published to the portfolio website feed.`,
  });
}

const app = new DiscordHono<HonoWorkerEnv>()
  .command("setup-profile", async (c) => {
    const userId = getDiscordUserId(c.interaction);
    if (!userId) {
      return c.res("Could not detect your Discord ID.");
    }

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
        select: {
          bio: true,
          github: true,
          linkedin: true,
          techStack: true,
        },
      });
    } catch (err) {
      console.error(err);
      return c.res(
        "Could not load your saved profile. Please try again in a moment.",
      );
    }

    const aboutPrefill = truncatePrefill(existing?.bio ?? "", 500);
    const linkedinPrefill = truncatePrefill(existing?.linkedin ?? "", 500);
    const githubPrefill = truncatePrefill(existing?.github ?? "", 500);
    const techStackPrefill = truncatePrefill(
      formatTechStackForModal(existing?.techStack),
      1000,
    );

    return c.resModal(
      new Modal("setup-profile-modal", "Setup Portfolio Profile")
        .row(
          new TextInput("about_me", "About Me", "Multi")
            .required()
            .max_length(500)
            .value(aboutPrefill),
        )
        .row(
          new TextInput("linkedin", "LinkedIn URL")
            .required()
            .max_length(500)
            .placeholder("https://linkedin.com/in/username")
            .value(linkedinPrefill),
        )
        .row(
          new TextInput("github", "GitHub URL")
            .required()
            .max_length(500)
            .placeholder("https://github.com/username")
            .value(githubPrefill),
        )
        .row(
          new TextInput("tech_stack", "Tech Stack (comma separated)", "Multi")
            .required()
            .max_length(1000)
            .placeholder("TypeScript, React, Prisma, Cloudflare Workers")
            .value(techStackPrefill),
        ),
    );
  })
  .modal("setup-profile-modal", async (c) => {
    return c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const userId = getDiscordUserId(ctx.interaction);
      if (!userId) {
        await ctx.followup({
          content: "Could not detect your Discord ID.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const fields = extractModalFields(ctx.interaction);

      try {
        const { bio, github, linkedin, techStack } =
          profilePayloadFromModal(fields);

        await prisma.user.upsert({
          where: { discordId: userId },
          create: {
            discordId: userId,
            bio,
            github,
            linkedin,
            techStack,
          },
          update: {
            bio,
            github,
            linkedin,
            techStack,
          },
        });

        await ctx.followup(
          "Profile saved. Your portfolio identity is now updated.",
        );
      } catch (err) {
        console.error(err);
        await ctx.followup({
          content: "Could not save your profile. Please try again.",
          flags: MessageFlags.Ephemeral,
        });
      }
    });
  })
  .command("submit", async (c) => {
    const phase = getMonthlyPhase();
    if (phase !== "BUILD") {
      return c.res(
        "Submissions are closed right now. `/submit` is only active from day 1 to 21 (UTC).",
      );
    }

    // Modal responses must be the first interaction reply; defer would block opening the form.
    return c.resModal(
      new Modal("submit-project-modal", "Submit Monthly Challenge Project")
        .row(new TextInput("tier", "Tier (e.g. Beginner / Intermediate)").required())
        .row(new TextInput("title", "Project Title").required().max_length(100))
        .row(
          new TextInput("description", "Project Description", "Multi")
            .required()
            .max_length(1000),
        )
        .row(
          new TextInput("repo_url", "Repository URL")
            .required()
            .placeholder("https://github.com/you/project"),
        )
        .row(
          new TextInput("demo_url", "Demo URL (optional)").placeholder(
            "https://your-demo-url.com",
          ),
        ),
    );
  })
  .command("share-blog", async (c) =>
    c.resDefer(async (ctx) => {
      await ctx.followup({
        content:
          "Blog sharing is not wired up yet. Check back soon — we deferred this reply so Discord does not time out.",
      });
    }),
  )
  .command("pulse", async (c) =>
    c.resDefer(async (ctx) => {
      await ctx.followup({
        content:
          "GitHub pulse is not wired up yet. This command uses a deferred reply so the worker can finish within Discord’s 3s limit once implemented.",
      });
    }),
  )
  .modal("submit-project-modal", async (c) => {
    return c.resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      const adminChannelId = ctx.env.ADMIN_CHANNEL_ID;
      const discordId = getDiscordUserId(ctx.interaction);
      if (!discordId) {
        await ctx.followup({
          content: "Could not detect your Discord ID.",
          flags: MessageFlags.Ephemeral,
        });
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
            tier: fields.tier ?? "General",
            title: fields.title ?? "Untitled",
            description: fields.description ?? "",
            repoUrl: fields.repo_url ?? "",
            demoUrl: fields.demo_url || null,
            isApproved: false,
            votes: 0,
          },
        });

        await ctx.rest("POST", $channels$_$messages, [adminChannelId], {
          content: `New submission pending review from <@${discordId}>`,
          embeds: [
            {
              title: submission.title,
              description: submission.description,
              color: 0x5865f2,
              fields: [
                { name: "Month", value: submission.month, inline: true },
                { name: "Tier", value: submission.tier, inline: true },
                {
                  name: "Repository",
                  value: submission.repoUrl,
                  inline: false,
                },
                {
                  name: "Demo",
                  value: submission.demoUrl ?? "N/A",
                  inline: false,
                },
              ],
            },
          ],
          components: new Components().row(
            new Button(`review:approve:${submission.id}`, "Approve", "Success"),
            new Button(`review:reject:${submission.id}`, "Reject", "Danger"),
          ),
        });

        await ctx.followup(
          "Submission received. Waiting for admin review.",
        );
      } catch (err) {
        console.error(err);
        await ctx.followup({
          content:
            "Something went wrong while saving your submission. Please try again.",
          flags: MessageFlags.Ephemeral,
        });
      }
    });
  })
  .component("", async (c) => {
    const customId: string | undefined = c.interaction?.data?.custom_id;
    if (!customId?.startsWith("review:")) {
      return c.res("Component received.");
    }

    return c.update().resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      await handleAdminReview(ctx, prisma, ctx.env.ADMIN_CHANNEL_ID);
    });
  })
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

async function buildPortfolioResponse(env: WorkerBindings): Promise<Response> {
  const prisma = getPrisma(env.DB);
  const now = new Date();
  const phase = getMonthlyPhase(now);
  const currentMonth = monthKey(now);

  const approved = await prisma.submission.findMany({
    where: {
      isApproved: true,
      month:
        phase === "PUBLISH" || phase === "POST_PUBLISH"
          ? { lte: currentMonth }
          : { lt: currentMonth },
    },
    include: {
      user: {
        select: {
          discordId: true,
          bio: true,
          github: true,
          linkedin: true,
          techStack: true,
          points: true,
          rank: true,
        },
      },
    },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
  });

  const grouped = approved.reduce<Record<string, unknown[]>>((acc, item) => {
    const bucket = acc[item.month] ?? [];
    bucket.push({
      id: item.id,
      tier: item.tier,
      title: item.title,
      description: item.description,
      repoUrl: item.repoUrl,
      demoUrl: item.demoUrl,
      votes: item.votes,
      user: item.user,
    });
    acc[item.month] = bucket;
    return acc;
  }, {});

  return Response.json({
    phase,
    month: currentMonth,
    published: grouped,
  });
}

export default {
  fetch: async (
    request: Request,
    env: WorkerBindings,
    executionCtx?: ExecutionContext,
  ) => {
    if (
      request.method === "GET" &&
      new URL(request.url).pathname === "/api/portfolio"
    ) {
      return buildPortfolioResponse(env);
    }

    return app.fetch(request, env, executionCtx);
  },
  scheduled: app.scheduled,
};
