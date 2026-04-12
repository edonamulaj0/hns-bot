import { Modal, TextInput } from "discord-hono";
import { MessageFlags } from "discord-api-types/v10";
import type { DiscordHono } from "discord-hono";
import type { PrismaClient } from "@prisma/client/edge";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { validateGitHubUrl, validateLinkedInUrl } from "../validate";
import {
  extractModalFields,
  getDiscordUserId,
  truncatePrefill,
  formatTechStackForModal,
  profilePayloadFromModal,
} from "./helpers";
import { syncDiscordIdentity } from "../discord-identity";

type ProfileSaveCtx = {
  interaction: { data?: { custom_value?: string } };
  followup: (data: object | string) => Promise<unknown>;
};

function buildProfileModal(
  title: string,
  mode: "setup" | "update",
  existing: {
    bio: string | null;
    github: string | null;
    linkedin: string | null;
    techStack: unknown | null;
  } | null,
) {
  return new Modal("setup-profile-modal", title)
    .custom_value(mode)
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
    );
}

/**
 * Shared modal submit for /setup-profile and /update-profile (custom_id suffix ;setup | ;update).
 */
export async function handleProfileSave(ctx: ProfileSaveCtx, prisma: PrismaClient): Promise<void> {
  const rawMode = ctx.interaction?.data?.custom_value;
  const mode = rawMode === "update" ? "update" : "setup";

  const userId = getDiscordUserId(ctx.interaction as any);
  if (!userId) {
    await ctx.followup({
      content: "Could not detect your Discord ID.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await syncDiscordIdentity(prisma, userId, ctx.interaction as any);

  const fields = extractModalFields(ctx.interaction as any);
  const payload = profilePayloadFromModal(fields);

  const ghErr = validateGitHubUrl(payload.github ?? undefined);
  if (ghErr) {
    await ctx.followup({ content: ghErr.message, flags: MessageFlags.Ephemeral });
    return;
  }
  const liErr = validateLinkedInUrl(payload.linkedin ?? undefined);
  if (liErr) {
    await ctx.followup({ content: liErr.message, flags: MessageFlags.Ephemeral });
    return;
  }

  try {
    if (mode === "update") {
      const u = await prisma.user.findUnique({
        where: { discordId: userId },
        select: { profileCompletedAt: true },
      });
      if (!u?.profileCompletedAt) {
        await ctx.followup({
          content: "You haven't set up a profile yet. Use `/setup-profile` to get started.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      await prisma.user.update({
        where: { discordId: userId },
        data: payload,
      });
      await ctx.followup({
        content: "✅ Profile updated.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const prev = await prisma.user.findUnique({
      where: { discordId: userId },
      select: { profileCompletedAt: true },
    });

    await prisma.user.upsert({
      where: { discordId: userId },
      create: { discordId: userId, ...payload, profileCompletedAt: new Date() },
      update: {
        ...payload,
        ...(prev && prev.profileCompletedAt == null ? { profileCompletedAt: new Date() } : {}),
      },
    });

    await ctx.followup({
      content: "✅ Profile saved. Your portfolio identity is now updated.",
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    console.error(err);
    await ctx.followup({
      content: "Could not save your profile. Please try again.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

export function registerSetupProfile(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("setup-profile", async (c) => {
    const userId = getDiscordUserId(c.interaction);
    if (!userId) return c.res("Could not detect your Discord ID.");

    try {
      const prisma = getPrisma(c.env.DB);
      await syncDiscordIdentity(prisma, userId, c.interaction);
    } catch (e) {
      console.error(e);
    }

    let existing: {
      bio: string | null;
      github: string | null;
      linkedin: string | null;
      techStack: unknown | null;
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

    return c.resModal(buildProfileModal("Setup Portfolio Profile", "setup", existing));
  });
}

export function registerUpdateProfile(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("update-profile", async (c) => {
    const userId = getDiscordUserId(c.interaction);
    if (!userId) {
      return c.flags("EPHEMERAL").res("Could not detect your Discord ID.");
    }

    try {
      const prisma = getPrisma(c.env.DB);
      await syncDiscordIdentity(prisma, userId, c.interaction);
      const u = await prisma.user.findUnique({
        where: { discordId: userId },
        select: {
          profileCompletedAt: true,
          bio: true,
          github: true,
          linkedin: true,
          techStack: true,
        },
      });

      if (!u?.profileCompletedAt) {
        return c.flags("EPHEMERAL").res(
          "You haven't set up a profile yet. Use `/setup-profile` to get started.",
        );
      }

      return c.resModal(
        buildProfileModal("Update Your Profile", "update", {
          bio: u.bio,
          github: u.github,
          linkedin: u.linkedin,
          techStack: u.techStack,
        }),
      );
    } catch (err) {
      console.error(err);
      return c.res("Could not load your profile. Please try again.");
    }
  });
}

export function registerProfileModal(app: DiscordHono<HonoWorkerEnv>) {
  return app.modal("setup-profile-modal", async (c) =>
    c.flags("EPHEMERAL").resDefer(async (ctx) => {
      const prisma = getPrisma(ctx.env.DB);
      await handleProfileSave(ctx as ProfileSaveCtx, prisma);
    }),
  );
}
