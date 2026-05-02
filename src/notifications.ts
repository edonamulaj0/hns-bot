import { mergedPublicDisplayName } from "./display-name";
import { getPrisma } from "./db";
import { sendChannelMessage } from "./discord-api";
import { monthKey } from "./time";
import type { WorkerBindings } from "./worker-env";

type NotifyOpts = {
  channelsOverride?: string[];
};

/** Single-channel override that is not the dedicated dev/hacker announce channels — e.g. admin testing. */
function singleGenericPreviewChannel(
  env: WorkerBindings,
  opts?: NotifyOpts,
): string | null {
  const o = opts?.channelsOverride;
  if (!o || o.length !== 1) return null;
  const id = o[0].trim();
  if (!id) return null;
  if (id === env.DEVELOPER_CHALLENGES_CHANNEL_ID?.trim()) return null;
  if (id === env.HACKER_CHALLENGES_CHANNEL_ID?.trim()) return null;
  return id;
}

function monthParts(month: string): { year: number; monthIdx: number } {
  const [y, m] = month.split("-").map(Number);
  return { year: y || new Date().getUTCFullYear(), monthIdx: (m || 1) - 1 };
}

function formatUtcDate(month: string, day: number): string {
  const { year, monthIdx } = monthParts(month);
  const d = new Date(Date.UTC(year, monthIdx, day, 0, 0, 0));
  return `${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })} (UTC)`;
}

function firstN(text: string, n: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return `${t.slice(0, n)}${t.length > n ? "…" : ""}`;
}

export function targetChannels(env: WorkerBindings, opts?: NotifyOpts): string[] {
  if (opts?.channelsOverride?.length) return opts.channelsOverride;
  const out = [
    env.DEVELOPER_CHALLENGES_CHANNEL_ID?.trim() || "",
    env.HACKER_CHALLENGES_CHANNEL_ID?.trim() || "",
    env.DESIGN_CHALLENGES_CHANNEL_ID?.trim() || "",
  ].filter(Boolean);
  return [...new Set(out)];
}

export async function notifyChallengesLive(
  c: any,
  env: WorkerBindings,
  opts?: NotifyOpts,
): Promise<void> {
  const prisma = getPrisma(env.DB);
  const month = monthKey();
  const channels = targetChannels(env, opts);

  const byTrack = await prisma.challenge.findMany({
    where: { month },
    select: { track: true, tier: true, title: true, description: true },
    orderBy: [{ track: "asc" }, { tier: "asc" }],
  });

  const genericCh = singleGenericPreviewChannel(env, opts);
  if (genericCh) {
    const embed = {
      title: `📅 ${month} challenges are live! (preview)`,
      color: 0xccff00,
      description:
        "This month's challenges are out. Enroll to claim your spot and get the full brief sent to your DMs.\n\nAll submissions go through the website — head to **h4cknstack.com/challenges** to read the briefs and enroll.",
      fields: byTrack.map((r) => {
        const tr = r.track === "HACKER" ? "Hacker" : "Developer";
        return {
          name: `${tr} · ${r.tier}`,
          value: `**${r.title}**\n${firstN(r.description, 100)}`,
          inline: true,
        };
      }),
      footer: { text: "Use /enroll to sign up · Submissions open until day 21" },
    };
    await sendChannelMessage(env.DISCORD_TOKEN, genericCh, { embeds: [embed] });
    await sendChannelMessage(env.DISCORD_TOKEN, genericCh, {
      content:
        "h4cknstack.com/challenges/developers\nh4cknstack.com/challenges/hackers",
    });
    return;
  }

  const rowsFor = (t: "DEVELOPER" | "HACKER" | "DESIGNERS") =>
    byTrack.filter((r) =>
      t === "HACKER"
        ? r.track === "HACKER"
        : t === "DESIGNERS"
          ? r.track === "DESIGNERS"
          : r.track === "DEVELOPER",
    );

  for (const chId of channels) {
    const track: "DEVELOPER" | "HACKER" | "DESIGNERS" =
      chId === env.HACKER_CHALLENGES_CHANNEL_ID?.trim()
        ? "HACKER"
        : chId === env.DESIGN_CHALLENGES_CHANNEL_ID?.trim()
          ? "DESIGNERS"
          : "DEVELOPER";
    const rows = rowsFor(track);
    const embed = {
      title: `📅 ${month} challenges are live!`,
      color: track === "HACKER" ? 0xed4245 : track === "DESIGNERS" ? 0xd85a30 : 0x5865f2,
      description:
        "This month's challenges are out. Enroll to claim your spot and get the full brief sent to your DMs.\n\nAll submissions go through the website — head to **h4cknstack.com/challenges** to read the briefs and enroll.",
      fields: rows.map((r) => ({
        name: r.tier,
        value: `**${r.title}**\n${firstN(r.description, 100)}`,
        inline: true,
      })),
      footer: { text: "Use /enroll to sign up · Submissions open until day 21" },
    };
    await sendChannelMessage(env.DISCORD_TOKEN, chId, { embeds: [embed] });
    const link =
      track === "HACKER"
        ? "h4cknstack.com/challenges/hackers"
        : track === "DESIGNERS"
          ? "h4cknstack.com/challenges/designer"
          : "h4cknstack.com/challenges/developers";
    await sendChannelMessage(env.DISCORD_TOKEN, chId, {
      content: link,
    });
  }
}

export async function notifyDeadlineWarning(
  c: any,
  env: WorkerBindings,
  opts?: NotifyOpts,
): Promise<void> {
  const month = monthKey();
  const deadline = formatUtcDate(month, 21);
  const channels = targetChannels(env, opts);
  const embed = {
    title: `⏰ 7 days left to submit — ${month}`,
    color: 0xf59e0b,
    description:
      "Submissions close at the end of day 21 (UTC). If you're enrolled but haven't submitted yet, head to **h4cknstack.com/submit** now.\n\nNot enrolled yet? You can still enroll and submit before day 21.",
    fields: [
      { name: "Deadline", value: `Day 21 — ${deadline}`, inline: false },
      { name: "Submissions", value: "h4cknstack.com/submit", inline: false },
    ],
    footer: { text: "Voting opens on day 22 · Results published on day 29" },
  };
  for (const chId of channels) {
    await sendChannelMessage(env.DISCORD_TOKEN, chId, { embeds: [embed] });
  }
}

export async function notifySubmissionsClosed(
  c: any,
  env: WorkerBindings,
  opts?: NotifyOpts,
): Promise<void> {
  const month = monthKey();
  const closes = formatUtcDate(month, 25);
  const channels = targetChannels(env, opts);
  const embed = {
    title: "🗳️ Submissions are closed — voting is open!",
    color: 0x5865f2,
    description:
      "The build window has ended. All submitted projects are now live for community voting.\n\nYou have **3 votes this month** — up to **1 per track** (Developer, Hacker, and Designer). Voting closes on day 25.",
    fields: [
      { name: "Vote now", value: `h4cknstack.com/vote/${month}`, inline: false },
      { name: "Voting closes", value: `Day 25 — ${closes}`, inline: false },
      { name: "Results", value: "Day 29 — published on the website", inline: false },
    ],
    footer: { text: "XP is awarded when results are published on day 29" },
  };
  for (const chId of channels) {
    await sendChannelMessage(env.DISCORD_TOKEN, chId, { embeds: [embed] });
  }
}

export async function notifyVotingOpen(
  c: any,
  env: WorkerBindings,
  opts?: NotifyOpts,
): Promise<void> {
  await notifySubmissionsClosed(c, env, opts);
}

export async function notifyResultsPublished(
  c: any,
  env: WorkerBindings,
  opts?: NotifyOpts,
): Promise<void> {
  const prisma = getPrisma(env.DB);
  const month = monthKey();
  const channels = targetChannels(env, opts);

  const genericCh = singleGenericPreviewChannel(env, opts);
  if (genericCh) {
    const tiers = ["Beginner", "Intermediate", "Advanced"];
    const tracks: ("DEVELOPER" | "HACKER" | "DESIGNERS")[] = [
      "DEVELOPER",
      "HACKER",
      "DESIGNERS",
    ];
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];
    for (const track of tracks) {
      const label =
        track === "HACKER" ? "Hacker" : track === "DESIGNERS" ? "Designer" : "Developer";
      for (const tier of tiers) {
        const top = await prisma.submission.findFirst({
          where: {
            month,
            track,
            tier,
            OR: [
              { submissionStatus: "APPROVED" },
              { AND: [{ submissionStatus: null }, { isApproved: true }] },
            ],
          },
          include: {
            user: { select: { displayName: true, discordUsername: true } },
          },
          orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
        });
        if (!top) continue;
        const who =
          mergedPublicDisplayName(
            top.user.displayName,
            top.user.discordUsername,
          ) || "Member";
        fields.push({
          name: `🥇 ${label} · ${tier}`,
          value: `${top.title} by ${who} · ${top.votes} votes`,
          inline: false,
        });
      }
    }
    const embed = {
      title: `🏆 ${month} results are live! (preview)`,
      color: 0x57f287,
      description:
        "Voting is closed and results have been published to the portfolio. Congratulations to everyone who shipped something this month — XP has been assigned to all participants.",
      fields,
      footer: { text: "View full results at h4cknstack.com/challenges" },
    };
    await sendChannelMessage(env.DISCORD_TOKEN, genericCh, { embeds: [embed] });
    return;
  }

  for (const chId of channels) {
    const track: "DEVELOPER" | "HACKER" | "DESIGNERS" =
      env.HACKER_CHALLENGES_CHANNEL_ID?.trim() === chId
        ? "HACKER"
        : env.DESIGN_CHALLENGES_CHANNEL_ID?.trim() === chId
          ? "DESIGNERS"
          : "DEVELOPER";
    const tiers = ["Beginner", "Intermediate", "Advanced"];
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];
    for (const tier of tiers) {
      const top = await prisma.submission.findFirst({
        where: {
          month,
          track,
          tier,
          OR: [
            { submissionStatus: "APPROVED" },
            { AND: [{ submissionStatus: null }, { isApproved: true }] },
          ],
        },
        include: {
          user: { select: { displayName: true, discordUsername: true } },
        },
        orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
      });
      if (!top) continue;
      const who =
        mergedPublicDisplayName(
          top.user.displayName,
          top.user.discordUsername,
        ) || "Member";
      fields.push({
        name: `🥇 ${tier} winner`,
        value: `${top.title} by ${who} · ${top.votes} votes`,
        inline: false,
      });
    }

    const embed = {
      title: `🏆 ${month} results are live!`,
      color: 0x57f287,
      description:
        "Voting is closed and results have been published to the portfolio. Congratulations to everyone who shipped something this month — XP has been assigned to all participants.",
      fields,
      footer: { text: "View full results at h4cknstack.com/challenges" },
    };
    await sendChannelMessage(env.DISCORD_TOKEN, chId, { embeds: [embed] });
  }
}

export type AdminNotifyTemplateType =
  | "challenges-live"
  | "deadline-warning"
  | "submissions-closed"
  | "voting-open"
  | "results-published";

const ADMIN_TEMPLATE_TYPES: ReadonlySet<string> = new Set([
  "challenges-live",
  "deadline-warning",
  "submissions-closed",
  "voting-open",
  "results-published",
]);

export function isAdminNotifyTemplateType(v: string): v is AdminNotifyTemplateType {
  return ADMIN_TEMPLATE_TYPES.has(v);
}

/**
 * Exact production templates (combined-track preview where applicable) for /admin-test-notify.
 * Does not post to any channel — use the return value as a public interaction followup.
 */
export async function buildAdminTestNotifyPayload(
  env: WorkerBindings,
  type: AdminNotifyTemplateType,
): Promise<{ embeds: Record<string, unknown>[]; content?: string }> {
  const prisma = getPrisma(env.DB);
  const month = monthKey();

  if (type === "challenges-live") {
    const byTrack = await prisma.challenge.findMany({
      where: { month },
      select: { track: true, tier: true, title: true, description: true },
      orderBy: [{ track: "asc" }, { tier: "asc" }],
    });
    const embed = {
      title: `📅 ${month} challenges are live! (preview)`,
      color: 0xccff00,
      description:
        "This month's challenges are out. Enroll to claim your spot and get the full brief sent to your DMs.\n\nAll submissions go through the website — head to **h4cknstack.com/challenges** to read the briefs and enroll.",
      fields: byTrack.map((r) => {
        const tr =
          r.track === "HACKER" ? "Hacker" : r.track === "DESIGNERS" ? "Designer" : "Developer";
        return {
          name: `${tr} · ${r.tier}`,
          value: `**${r.title}**\n${firstN(r.description, 100)}`,
          inline: true,
        };
      }),
      footer: { text: "Use /enroll to sign up · Submissions open until day 21" },
    };
    return {
      embeds: [embed],
      content:
        "h4cknstack.com/challenges/developers\nh4cknstack.com/challenges/hackers\nh4cknstack.com/challenges/designer",
    };
  }

  if (type === "deadline-warning") {
    const deadline = formatUtcDate(month, 21);
    const embed = {
      title: `⏰ 7 days left to submit — ${month}`,
      color: 0xf59e0b,
      description:
        "Submissions close at the end of day 21 (UTC). If you're enrolled but haven't submitted yet, head to **h4cknstack.com/submit** now.\n\nNot enrolled yet? You can still enroll and submit before day 21.",
      fields: [
        { name: "Deadline", value: `Day 21 — ${deadline}`, inline: false },
        { name: "Submissions", value: "h4cknstack.com/submit", inline: false },
      ],
      footer: { text: "Voting opens on day 22 · Results published on day 29" },
    };
    return { embeds: [embed] };
  }

  if (type === "submissions-closed" || type === "voting-open") {
    const closes = formatUtcDate(month, 25);
    const embed = {
      title: "🗳️ Submissions are closed — voting is open!",
      color: 0x5865f2,
      description:
        "The build window has ended. All submitted projects are now live for community voting.\n\nYou have **3 votes this month** — up to **1 per track** (Developer, Hacker, and Designer). Voting closes on day 25.",
      fields: [
        { name: "Vote now", value: `h4cknstack.com/vote/${month}`, inline: false },
        { name: "Voting closes", value: `Day 25 — ${closes}`, inline: false },
        { name: "Results", value: "Day 29 — published on the website", inline: false },
      ],
      footer: { text: "XP is awarded when results are published on day 29" },
    };
    return { embeds: [embed] };
  }

  if (type === "results-published") {
    const tiers = ["Beginner", "Intermediate", "Advanced"];
    const tracks: ("DEVELOPER" | "HACKER" | "DESIGNERS")[] = [
      "DEVELOPER",
      "HACKER",
      "DESIGNERS",
    ];
    const fields: Array<{ name: string; value: string; inline: boolean }> = [];
    for (const track of tracks) {
      const label =
        track === "HACKER" ? "Hacker" : track === "DESIGNERS" ? "Designer" : "Developer";
      for (const tier of tiers) {
        const top = await prisma.submission.findFirst({
          where: {
            month,
            track,
            tier,
            OR: [
              { submissionStatus: "APPROVED" },
              { AND: [{ submissionStatus: null }, { isApproved: true }] },
            ],
          },
          include: {
            user: { select: { displayName: true, discordUsername: true } },
          },
          orderBy: [{ votes: "desc" }, { createdAt: "asc" }],
        });
        if (!top) continue;
        const who =
          mergedPublicDisplayName(
            top.user.displayName,
            top.user.discordUsername,
          ) || "Member";
        fields.push({
          name: `🥇 ${label} · ${tier}`,
          value: `${top.title} by ${who} · ${top.votes} votes`,
          inline: false,
        });
      }
    }
    const embed = {
      title: `🏆 ${month} results are live! (preview)`,
      color: 0x57f287,
      description:
        "Voting is closed and results have been published to the portfolio. Congratulations to everyone who shipped something this month — XP has been assigned to all participants.",
      fields,
      footer: { text: "View full results at h4cknstack.com/challenges" },
    };
    return { embeds: [embed] };
  }

  const _exhaustive: never = type;
  return _exhaustive;
}
