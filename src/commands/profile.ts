import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { mergedPublicDisplayName } from "../display-name";
import { formatTechStackList } from "./helpers";
import { resolveProfileAvatarUrl } from "../profile-avatar";

function profileUrl(url: string | null | undefined, kind: "github" | "linkedin"): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (kind === "github") return `https://github.com/${t}`;
  return `https://linkedin.com/in/${t}`;
}

function framerSiteUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (t.startsWith("https://")) return t;
  if (t.startsWith("http://")) return t;
  return `https://${t.replace(/^\/+/, "")}`;
}

export function registerProfile(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("profile", async (c) => {
    const prisma = getPrisma(c.env.DB);
    const callerId = c.interaction?.member?.user?.id ?? c.interaction?.user?.id;
    if (!callerId) {
      return c.flags("EPHEMERAL").res("Could not detect your Discord ID.");
    }

    const optUser = (c.var as { user?: string }).user;
    const discordId =
      optUser && String(optUser).trim() !== "" ? String(optUser) : callerId;

    const row = await prisma.user.findUnique({
      where: { discordId },
      select: {
        id: true,
        displayName: true,
        discordUsername: true,
        avatarHash: true,
        profileAvatarSource: true,
        bio: true,
        github: true,
        linkedin: true,
        framer: true,
        techStack: true,
        points: true,
        rank: true,
        profileCompletedAt: true,
        _count: { select: { blogs: true } },
      },
    });

    if (!row?.profileCompletedAt) {
      return c
        .flags("EPHEMERAL")
        .res("This user hasn't set up a profile yet. Profiles are edited on the website.");
    }

    const approvedProjects = await prisma.submission.count({
      where: {
        userId: row.id,
        OR: [
          { submissionStatus: "PUBLISHED" },
          { submissionStatus: "APPROVED" },
          { AND: [{ submissionStatus: null }, { isApproved: true }] },
        ],
      },
    });

    const stack = formatTechStackList(row.techStack);
    const stackShow = stack.slice(0, 8).join(", ") || "—";
    const iconUrl = resolveProfileAvatarUrl({
      discordId,
      github: row.github,
      avatarHash: row.avatarHash,
      profileAvatarSource: row.profileAvatarSource,
      size: 128,
    });

    const ghLine = row.github ? `GitHub: ${row.github}` : "";
    const liLine = row.linkedin ? `LinkedIn: ${row.linkedin}` : "";
    const frLine = row.framer ? `Framer: ${row.framer}` : "";
    const footerParts = [ghLine, liLine, frLine].filter(Boolean);
    const memberSince = new Date(row.profileCompletedAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const titleName =
      mergedPublicDisplayName(row.displayName, row.discordUsername) || "Member";

    const embed: Record<string, unknown> = {
      title: titleName,
      color: 0xccff00,
      fields: [
        { name: "🏆 Rank", value: `#${row.rank}`, inline: true },
        { name: "⚡ Total XP", value: `${row.points} XP`, inline: true },
        { name: "📦 Projects", value: `${approvedProjects}`, inline: true },
        { name: "📝 Articles", value: `${row._count.blogs}`, inline: true },
        { name: "🛠 Tech Stack", value: stackShow.slice(0, 1024), inline: true },
      ],
      footer: {
        text: `${footerParts.join(" · ")}${footerParts.length ? " · " : ""}Member since ${memberSince}`.slice(
          0,
          2048,
        ),
      },
    };

    embed.author = {
      name: titleName,
      icon_url: iconUrl,
    };

    if (row.bio?.trim()) {
      (embed.fields as object[]).push({
        name: "📖 About",
        value: row.bio.trim().slice(0, 4096),
        inline: false,
      });
    }

    embed.thumbnail = { url: iconUrl };

    const ghUrl = profileUrl(row.github, "github");
    const liUrl = profileUrl(row.linkedin, "linkedin");
    const frUrl = framerSiteUrl(row.framer);

    const linkButtons: object[] = [];
    if (ghUrl) {
      linkButtons.push({
        type: 2,
        style: 5,
        label: "GitHub",
        emoji: { name: "🐙" },
        url: ghUrl,
      });
    }
    if (liUrl) {
      linkButtons.push({
        type: 2,
        style: 5,
        label: "LinkedIn",
        emoji: { name: "💼" },
        url: liUrl,
      });
    }
    if (frUrl) {
      linkButtons.push({
        type: 2,
        style: 5,
        label: "Framer",
        emoji: { name: "✨" },
        url: frUrl,
      });
    }

    const payload: Record<string, unknown> = { embeds: [embed] };
    if (linkButtons.length > 0) {
      payload.components = [{ type: 1, components: linkButtons }];
    }

    return c.res(payload);
  });
}
