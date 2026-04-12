import { Modal, TextInput, Button, Components } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import { $channels$_$messages } from "discord-hono";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey, getHackerPhase, isHackerSubmissionOpen } from "../time";
import { extractModalFields, getDiscordUserId } from "./helpers";
import { validateTier, validateChallengeType, validateUrl } from "../validate";

export function registerSubmit(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("submit", async (c) => {
      const devPhase = getMonthlyPhase();
      const hackerOpen = isHackerSubmissionOpen();
      const devOpen = devPhase === "BUILD";

      if (!devOpen && !hackerOpen) {
        return c.res(
          "Submissions are closed for both tracks right now.\n" +
          "• Developer track: days 1–21 (UTC)\n" +
          "• Hacker track: days 1–11 (Cycle A) or 15–25 (Cycle B)"
        );
      }

      if (devOpen && hackerOpen) {
        return c.resModal(
          new Modal("submit-track-select", "Choose Your Track")
            .row(
              new TextInput("track", "Track: DEVELOPER or HACKER")
                .required()
                .placeholder("DEVELOPER or HACKER"),
            ),
        );
      }

      if (devOpen) {
        return c.resModal(buildDevModal());
      }

      return c.resModal(buildHackerModal());
    })

    .modal("submit-track-select", async (c) => {
      const fields = extractModalFields(c.interaction);
      const track = (fields.track ?? "").trim().toUpperCase();

      if (track === "HACKER") {
        return c.resModal(buildHackerModal());
      }
      return c.resModal(buildDevModal());
    })

    .modal("submit-project-modal", async (c) =>
      c.resDefer(async (ctx) => {
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

        const tierError = validateTier(fields.tier);
        if (tierError) {
          await ctx.followup({ content: tierError.message, flags: MessageFlags.Ephemeral });
          return;
        }

        const repoError = validateUrl(fields.repo_url, "repo_url");
        if (repoError) {
          await ctx.followup({ content: repoError.message, flags: MessageFlags.Ephemeral });
          return;
        }

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
              track: "DEVELOPER",
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
                  { name: "Track", value: "🛠 Developer", inline: true },
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
            await ctx.followup({
              content: "You've already submitted a project with this title this month.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await ctx.followup({
            content: "Something went wrong. Please try again.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }),
    )

    .modal("submit-hacker-modal", async (c) =>
      c.resDefer(async (ctx) => {
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
        const hackerState = getHackerPhase();

        const typeError = validateChallengeType(fields.challenge_type);
        if (typeError) {
          await ctx.followup({ content: typeError.message, flags: MessageFlags.Ephemeral });
          return;
        }

        const writeupError = validateUrl(fields.writeup_url, "writeup_url");
        if (writeupError) {
          await ctx.followup({ content: writeupError.message, flags: MessageFlags.Ephemeral });
          return;
        }

        const challengeType = (fields.challenge_type ?? "").trim().toUpperCase();
        const cycleKey = `${currentMonth}-${hackerState.cycle}`;

        try {
          const user = await prisma.user.upsert({
            where: { discordId },
            create: { discordId },
            update: {},
          });

          const title = (fields.summary ?? "Untitled").trim().slice(0, 100);

          const submission = await prisma.submission.create({
            data: {
              userId: user.id,
              month: cycleKey,
              tier: "Hacker",
              title,
              description: (fields.summary ?? "").trim(),
              repoUrl: (fields.writeup_url ?? "").trim(),
              demoUrl: fields.repo_url?.trim() || null,
              track: "HACKER",
              challengeType,
              isApproved: false,
              votes: 0,
            },
          });

          const typeLabels: Record<string, string> = {
            CTF_WRITEUP: "🏴 CTF Writeup",
            TOOL_BUILD: "🔧 Tool Build",
            VULN_RESEARCH: "🔍 Vulnerability Research",
            REDTEAM: "🎯 Red Team Simulation",
          };

          await ctx.rest("POST", $channels$_$messages, [adminChannelId], {
            content: `📬 New **Hacker** submission pending review from <@${discordId}>`,
            embeds: [
              {
                title: submission.title,
                description: submission.description,
                color: 0xed4245,
                fields: [
                  { name: "Track", value: "🔒 Hacker", inline: true },
                  { name: "Cycle", value: `${currentMonth} Cycle ${hackerState.cycle}`, inline: true },
                  { name: "Type", value: typeLabels[challengeType] ?? challengeType, inline: true },
                  { name: "Writeup", value: submission.repoUrl, inline: false },
                  ...(submission.demoUrl ? [{ name: "Repo", value: submission.demoUrl, inline: false }] : []),
                ],
                footer: { text: `ID: ${submission.id}` },
              },
            ],
            components: new Components().row(
              new Button(`review:approve:${submission.id}`, "✅ Approve", "Success"),
              new Button(`review:reject:${submission.id}`, "❌ Reject", "Danger"),
            ),
          });

          await ctx.followup("📬 Hacker submission received! It's pending admin review.");
        } catch (err: any) {
          console.error(err);
          if (err?.code === "P2002") {
            await ctx.followup({
              content: "You've already submitted a writeup with this title for this cycle.",
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          await ctx.followup({
            content: "Something went wrong. Please try again.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }),
    );
}

function buildDevModal() {
  return new Modal("submit-project-modal", "Submit Monthly Challenge Project")
    .row(new TextInput("tier", "Tier (Beginner / Intermediate / Advanced)").required())
    .row(new TextInput("title", "Project Title").required().max_length(100))
    .row(new TextInput("description", "Project Description", "Multi").required().max_length(1000))
    .row(
      new TextInput("repo_url", "Repository URL")
        .required()
        .placeholder("https://github.com/you/project"),
    )
    .row(
      new TextInput("demo_url", "Demo URL (optional)").placeholder("https://your-demo.com"),
    );
}

function buildHackerModal() {
  return new Modal("submit-hacker-modal", "Submit Hacker Challenge")
    .row(
      new TextInput("challenge_type", "Type: CTF_WRITEUP / TOOL_BUILD / VULN_RESEARCH / REDTEAM")
        .required()
        .placeholder("CTF_WRITEUP"),
    )
    .row(
      new TextInput("writeup_url", "Writeup URL (required)")
        .required()
        .placeholder("https://your-writeup.com/post"),
    )
    .row(
      new TextInput("repo_url", "Repository URL (optional)")
        .placeholder("https://github.com/you/tool"),
    )
    .row(
      new TextInput("summary", "Summary / Title", "Multi")
        .required()
        .max_length(500)
        .placeholder("Brief description of your submission"),
    );
}
