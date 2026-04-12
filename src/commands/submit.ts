import { Modal, TextInput, Button, Components } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import { $channels$_$messages } from "discord-hono";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey } from "../time";
import { extractModalFields, getDiscordUserId } from "./helpers";
import { validateChallengeType, validateUrl } from "../validate";
import { getCommandAttachment, validateSubmitAttachment } from "../discord-attachments";
import { putPendingAttachment, takePendingAttachment } from "../pending-attachment";
import { syncDiscordIdentity } from "../discord-identity";

export function registerSubmit(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("submit", async (c) => {
      const discordId = getDiscordUserId(c.interaction);
      if (!discordId) return c.res("Could not detect your Discord ID.");

      const prisma = getPrisma(c.env.DB);
      await syncDiscordIdentity(prisma, discordId, c.interaction);

      const cmdAtt = getCommandAttachment(c.interaction, "attachment");
      if (cmdAtt) {
        const attErr = validateSubmitAttachment(cmdAtt);
        if (attErr) return c.flags("EPHEMERAL").res(attErr);
        await putPendingAttachment(prisma, discordId, "submit", {
          url: cmdAtt.url,
          filename: cmdAtt.filename,
          content_type: cmdAtt.content_type,
          size: cmdAtt.size,
        });
      }

      if (getMonthlyPhase() !== "BUILD") {
        return c.res(
          "Submissions are closed. The build window is **days 1–21** (UTC) each month. Use `/enroll` during BUILD.",
        );
      }

      const user = await prisma.user.upsert({
        where: { discordId },
        create: { discordId },
        update: {},
      });

      const currentMonth = monthKey();
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: user.id,
          challenge: { month: currentMonth },
        },
        include: { challenge: true },
      });

      if (!enrollment?.challenge) {
        return c.flags("EPHEMERAL").res(
          "You're not enrolled in a challenge for this month. Run `/enroll` first.",
        );
      }

      const tr = enrollment.challenge.track;
      if (tr === "HACKER") {
        return c.resModal(buildHackerModal());
      }
      return c.resModal(buildDevModal());
    })

    .modal("submit-project-modal", async (c) =>
      c.flags("EPHEMERAL").resDefer(async (ctx) => {
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

        await syncDiscordIdentity(prisma, discordId, ctx.interaction);

        const user = await prisma.user.findUnique({ where: { discordId } });
        if (!user) {
          await ctx.followup({
            content: "User record missing. Try `/setup-profile` first.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const currentMonth = monthKey();
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            userId: user.id,
            challenge: { month: currentMonth },
          },
          include: { challenge: true },
        });

        if (!enrollment?.challenge || enrollment.challenge.track !== "DEVELOPER") {
          await ctx.followup({
            content: "You're not enrolled in a Developer challenge for this month. Run `/enroll`.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const ch = enrollment.challenge;
        const fields = extractModalFields(ctx.interaction);

        const repoError = validateUrl(fields.repo_url, "repo_url");
        if (repoError) {
          await ctx.followup({ content: repoError.message, flags: MessageFlags.Ephemeral });
          return;
        }

        const pending = await takePendingAttachment(prisma, discordId, "submit");
        let attachmentUrl: string | null = null;
        if (pending) {
          const reErr = validateSubmitAttachment({
            id: "",
            url: pending.url,
            filename: pending.filename ?? undefined,
            content_type: pending.contentType ?? undefined,
            size: pending.size ?? undefined,
          });
          if (reErr) {
            await ctx.followup({ content: reErr, flags: MessageFlags.Ephemeral });
            return;
          }
          attachmentUrl = pending.url;
        }

        try {
          const submission = await prisma.submission.create({
            data: {
              userId: user.id,
              month: ch.month,
              tier: ch.tier,
              title: (fields.title ?? "Untitled").trim(),
              description: (fields.description ?? "").trim(),
              repoUrl: (fields.repo_url ?? "").trim(),
              demoUrl: fields.demo_url?.trim() || null,
              track: "DEVELOPER",
              challengeId: ch.id,
              isApproved: false,
              votes: 0,
              attachmentUrl,
            },
          });

          const embedFields: object[] = [
            { name: "Track", value: "🛠 Developer", inline: true },
            { name: "Challenge", value: ch.title, inline: true },
            { name: "Month", value: submission.month, inline: true },
            { name: "Tier", value: submission.tier, inline: true },
            { name: "Repository", value: submission.repoUrl, inline: false },
            { name: "Demo", value: submission.demoUrl ?? "N/A", inline: false },
          ];
          if (submission.attachmentUrl) {
            embedFields.push({
              name: "Document",
              value: submission.attachmentUrl.slice(0, 1024),
              inline: false,
            });
          }

          await ctx.rest("POST", $channels$_$messages, [adminChannelId], {
            content: `📬 New submission pending review from <@${discordId}>`,
            embeds: [
              {
                title: submission.title,
                description: submission.description,
                color: 0x5865f2,
                fields: embedFields,
                footer: { text: `ID: ${submission.id}` },
              },
            ],
            components: new Components().row(
              new Button(`review:approve:${submission.id}`, "✅ Approve", "Success"),
              new Button(`review:reject:${submission.id}`, "❌ Reject", "Danger"),
            ),
          });

          await ctx.followup({
            content: "📬 Submission received! It's pending admin review.",
            flags: MessageFlags.Ephemeral,
          });
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
      c.flags("EPHEMERAL").resDefer(async (ctx) => {
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

        await syncDiscordIdentity(prisma, discordId, ctx.interaction);

        const user = await prisma.user.findUnique({ where: { discordId } });
        if (!user) {
          await ctx.followup({
            content: "User record missing. Try `/setup-profile` first.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const currentMonth = monthKey();
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            userId: user.id,
            challenge: { month: currentMonth },
          },
          include: { challenge: true },
        });

        if (!enrollment?.challenge || enrollment.challenge.track !== "HACKER") {
          await ctx.followup({
            content: "You're not enrolled in a Hacker challenge for this month. Run `/enroll`.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const ch = enrollment.challenge;
        const fields = extractModalFields(ctx.interaction);

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

        const pending = await takePendingAttachment(prisma, discordId, "submit");
        let attachmentUrl: string | null = null;
        if (pending) {
          const reErr = validateSubmitAttachment({
            id: "",
            url: pending.url,
            filename: pending.filename ?? undefined,
            content_type: pending.contentType ?? undefined,
            size: pending.size ?? undefined,
          });
          if (reErr) {
            await ctx.followup({ content: reErr, flags: MessageFlags.Ephemeral });
            return;
          }
          attachmentUrl = pending.url;
        }

        try {
          const title = (fields.summary ?? "Untitled").trim().slice(0, 100);

          const submission = await prisma.submission.create({
            data: {
              userId: user.id,
              month: ch.month,
              tier: ch.tier,
              title,
              description: (fields.summary ?? "").trim(),
              repoUrl: (fields.writeup_url ?? "").trim(),
              demoUrl: fields.repo_url?.trim() || null,
              track: "HACKER",
              challengeType,
              challengeId: ch.id,
              isApproved: false,
              votes: 0,
              attachmentUrl,
            },
          });

          const typeLabels: Record<string, string> = {
            CTF_WRITEUP: "🏴 CTF Writeup",
            TOOL_BUILD: "🔧 Tool Build",
            VULN_RESEARCH: "🔍 Vulnerability Research",
            REDTEAM: "🎯 Red Team Simulation",
          };

          const hFields: object[] = [
            { name: "Track", value: "🔒 Hacker", inline: true },
            { name: "Challenge", value: ch.title, inline: true },
            { name: "Month", value: submission.month, inline: true },
            { name: "Tier", value: submission.tier, inline: true },
            { name: "Type", value: typeLabels[challengeType] ?? challengeType, inline: true },
            { name: "Writeup", value: submission.repoUrl, inline: false },
            ...(submission.demoUrl ? [{ name: "Repo", value: submission.demoUrl, inline: false }] : []),
          ];
          if (submission.attachmentUrl) {
            hFields.push({
              name: "Document",
              value: submission.attachmentUrl.slice(0, 1024),
              inline: false,
            });
          }

          await ctx.rest("POST", $channels$_$messages, [adminChannelId], {
            content: `📬 New **Hacker** submission pending review from <@${discordId}>`,
            embeds: [
              {
                title: submission.title,
                description: submission.description,
                color: 0xed4245,
                fields: hFields,
                footer: { text: `ID: ${submission.id}` },
              },
            ],
            components: new Components().row(
              new Button(`review:approve:${submission.id}`, "✅ Approve", "Success"),
              new Button(`review:reject:${submission.id}`, "❌ Reject", "Danger"),
            ),
          });

          await ctx.followup({
            content: "📬 Hacker submission received! It's pending admin review.",
            flags: MessageFlags.Ephemeral,
          });
        } catch (err: any) {
          console.error(err);
          if (err?.code === "P2002") {
            await ctx.followup({
              content: "You've already submitted with this title for this month.",
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
