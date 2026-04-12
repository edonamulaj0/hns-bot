import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { formatTechStackList } from "./helpers";
import { syncDiscordIdentity } from "../discord-identity";

function githubUsernameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/?#\s]+)/i);
  return m?.[1] ?? null;
}

function profileUrl(url: string | null | undefined, kind: "github" | "linkedin"): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (kind === "github") return `https://github.com/${t}`;
  return `https://linkedin.com/in/${t}`;
}

export function registerProfile(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("profile", async (c) => {
    const prisma = getPrisma(c.env.DB);
    const callerId = c.interaction?.member?.user?.id ?? c.interaction?.user?.id;
    if (!callerId) {
      return c.flags("EPHEMERAL").res("Could not detect your Discord ID.");
    }

    await syncDiscordIdentity(prisma, callerId, c.interaction);

    const optUser = (c.var as { user?: string }).user;
    const discordId =
      optUser && String(optUser).trim() !== "" ? String(optUser) : callerId;

    const row = await prisma.user.findUnique({
      where: { discordId },
      select: {
        id: true,
        discordUsername: true,
        displayName: true,
        bio: true,
        github: true,
        linkedin: true,
        techStack: true,
        points: true,
        rank: true,
        profileCompletedAt: true,
        _count: { select: { blogs: true } },
      },
    });

    if (!row?.profileCompletedAt) {
      return c.flags("EPHEMERAL").res("This user hasn't set up a profile yet.");
    }

    const approvedProjects = await prisma.submission.count({
      where: { userId: row.id, isApproved: true },
    });

    const stack = formatTechStackList(row.techStack);
    const stackShow = stack.slice(0, 8).join(", ") || "—";
    const ghUser = githubUsernameFromUrl(row.github);
    const iconUrl = ghUser
      ? `https://avatars.githubusercontent.com/${ghUser}?size=64`
      : undefined;

    const ghLine = row.github ? `GitHub: ${row.github}` : "";
    const liLine = row.linkedin ? `LinkedIn: ${row.linkedin}` : "";
    const footerParts = [ghLine, liLine].filter(Boolean);
    const memberSince = new Date(row.profileCompletedAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const handle = row.discordUsername ? `@${row.discordUsername}` : `@${discordId.slice(-8)}`;
    const titleName =
      row.displayName?.trim() ||
      (row.discordUsername ? `@${row.discordUsername}` : discordId);

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
      name: handle,
      ...(iconUrl ? { icon_url: iconUrl } : {}),
    };

    if (row.bio?.trim()) {
      (embed.fields as object[]).push({
        name: "📖 About",
        value: row.bio.trim().slice(0, 4096),
        inline: false,
      });
    }

    if (iconUrl && ghUser) {
      embed.thumbnail = { url: iconUrl };
    }

    const ghUrl = profileUrl(row.github, "github");
    const liUrl = profileUrl(row.linkedin, "linkedin");

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

    const payload: Record<string, unknown> = { embeds: [embed] };
    if (linkButtons.length > 0) {
      payload.components = [{ type: 1, components: linkButtons }];
    }

    return c.res(payload);
  });
}
