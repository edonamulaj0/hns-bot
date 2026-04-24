import type { DiscordHono } from "discord-hono";
import type { HonoWorkerEnv } from "../worker-env";
import { getPrisma } from "../db";
import { getMonthlyPhase, monthKey } from "../time";
import { getDiscordUserId } from "./helpers";
import { DELIVERABLE_IMAGE_EXPORT, normalizeTrackParam, trackLabel } from "../tracks";
import { syncLegacyApprovalFields } from "../submission-lifecycle";
import { imageUrlLooksValid } from "../rest-handlers";
import type { PrismaClient } from "@prisma/client/edge";

function slugChars(): string {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const buf = new Uint8Array(10);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 8; i++) s += c[buf[i]! % c.length];
  return s;
}

async function uniqueRedirectSlug(prisma: PrismaClient): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const s = slugChars();
    const clash = await prisma.submission.findUnique({
      where: { redirectSlug: s },
      select: { id: true },
    });
    if (!clash) return s;
  }
  throw new Error("Could not allocate redirect slug");
}

export function registerSubmit(app: DiscordHono<HonoWorkerEnv>) {
  return app.command("submit", async (c) => {
    const discordId = getDiscordUserId(c.interaction);
    if (!discordId) {
      return c.flags("EPHEMERAL").res("Could not detect your Discord ID.");
    }

    const base = c.env.BASE_URL?.replace(/\/$/, "") || "https://h4cknstack.com";
    const vars = c.var as {
      track?: string;
      title?: string;
      description?: string;
      image_url?: string;
    };
    const track = normalizeTrackParam((vars.track ?? "").trim());
    const title = (vars.title ?? "").trim();
    const description = (vars.description ?? "").trim();
    const imageUrl = (vars.image_url ?? "").trim();

    if (!track || track === "DEVELOPER" || track === "HACKER") {
      return c.flags("EPHEMERAL").res(
        `Submit **Developer** and **Hacker** work on the site: **${base}/submit**\n\n` +
          `For **Designer**, use \`track: Designer\` with \`title\`, \`description\` (100+ chars), and \`image_url\` (direct PNG/JPG/WebP).`,
      );
    }

    if (track !== "DESIGNERS") {
      return c.flags("EPHEMERAL").res("Unknown track.");
    }

    if (!title || !description || !imageUrl) {
      return c.flags("EPHEMERAL").res(
        "Designer Discord submit requires **title**, **description** (100+ characters), and **image_url** (HTTPS, image).",
      );
    }

    if (title.length < 5 || title.length > 100) {
      return c.flags("EPHEMERAL").res("Title must be 5–100 characters.");
    }
    if (description.length < 100 || description.length > 2000) {
      return c.flags("EPHEMERAL").res("Description must be 100–2000 characters.");
    }

    const phase = getMonthlyPhase();
    if (phase !== "BUILD") {
      return c.flags("EPHEMERAL").res("Submissions are closed — the build window has ended.");
    }

    const prisma = getPrisma(c.env.DB);
    const user = await prisma.user.findUnique({
      where: { discordId },
      select: { id: true, profileCompletedAt: true },
    });
    if (!user?.profileCompletedAt) {
      return c.flags("EPHEMERAL").res(`Complete your profile first at ${base}/profile`);
    }

    const m = monthKey();
    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, challenge: { month: m, track: "DESIGNERS" } },
      include: { challenge: true },
    });
    if (!enrollment) {
      return c.flags("EPHEMERAL").res(
        "You haven't enrolled yet. Use `/enroll` to pick your track and tier first.",
      );
    }

    const existing = await prisma.submission.findFirst({
      where: { userId: user.id, month: m, challengeId: enrollment.challengeId },
    });
    if (existing) {
      return c.flags("EPHEMERAL").res(
        `You already submitted for this challenge. Edit on **${base}/submit** while the build window is open.`,
      );
    }

    const imgOk = await imageUrlLooksValid(imageUrl);
    if (!imgOk) {
      return c.flags("EPHEMERAL").res(
        "That image URL doesn't look valid. Use a direct HTTPS link; the server should return an image content-type or use a .png / .jpg / .webp path.",
      );
    }

    const slug = await uniqueRedirectSlug(prisma);
    const pending = syncLegacyApprovalFields("PENDING");
    const sub = await prisma.submission.create({
      data: {
        userId: user.id,
        month: m,
        tier: enrollment.challenge.tier,
        track: "DESIGNERS",
        title,
        description,
        repoUrl: `${base}/challenges/designers`,
        demoUrl: null,
        attachmentUrl: imageUrl,
        deliverableType: DELIVERABLE_IMAGE_EXPORT,
        challengeId: enrollment.challengeId,
        ...pending,
        isLocked: false,
        redirectSlug: slug,
      },
    });

    return c.res({
      content: `✅ **${trackLabel("DESIGNERS")} submission received** — pending review before voting.`,
      embeds: [
        {
          title: sub.title,
          description: sub.description.slice(0, 350),
          color: 0xd85a30,
          image: { url: imageUrl },
          fields: [
            { name: "Tier", value: sub.tier, inline: true },
            { name: "Month", value: sub.month, inline: true },
            { name: "Vote page", value: `${base}/vote/${m}`, inline: false },
          ],
        },
      ],
    });
  });
}
