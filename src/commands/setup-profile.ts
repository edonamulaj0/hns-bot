import { Modal, TextInput } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import {
  extractModalFields,
  getDiscordUserId,
  truncatePrefill,
  formatTechStackForModal,
  profilePayloadFromModal,
} from "./helpers";

export function registerSetupProfile(app: DiscordHono<HonoWorkerEnv>) {
  return app
    .command("setup-profile", async (c) => {
      const userId = getDiscordUserId(c.interaction);
      if (!userId) return c.res("Could not detect your Discord ID.");

      let existing: {
        bio: string | null;
        github: string | null;
        linkedin: string | null;
        techStack: any | null;
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
          await ctx.followup({
            content: "Could not detect your Discord ID.",
            flags: MessageFlags.Ephemeral,
          });
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
          await ctx.followup({
            content: "Could not save your profile. Please try again.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }),
    );
}
