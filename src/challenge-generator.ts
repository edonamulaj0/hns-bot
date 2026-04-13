import type { PrismaClient } from "@prisma/client/edge";
import { sendChannelMessage } from "./discord-api";
import type { WorkerBindings } from "./worker-env";
import { monthKey } from "./time";

type GenChallenge = {
  track: string;
  tier: string;
  title: string;
  description: string;
  resources: string;
  deliverables: string;
};

export type GeneratedChallengesResult = {
  month: string;
  challenges: GenChallenge[];
  usedFallback: boolean;
  error: string | null;
};

const FALLBACK: GenChallenge[] = [
  {
    track: "DEVELOPER",
    tier: "Beginner",
    title: "CLI habit tracker",
    description:
      "## Goal\nBuild a **command-line** habit tracker that stores data locally (SQLite or JSON).\n\n## Requirements\n- Add / list / mark habits\n- Persist between runs\n- README with install + usage",
    resources: "- [Node fs](https://nodejs.org/api/fs.html)\n- SQLite or JSON file storage",
    deliverables: "- Public repo URL\n- Short demo (GIF or video)\n- README",
  },
  {
    track: "DEVELOPER",
    tier: "Intermediate",
    title: "REST API + deploy",
    description:
      "## Goal\nShip a small **REST API** with auth or rate limiting and deploy it (Workers, Fly, Railway, etc.).\n\n## Requirements\n- At least 3 endpoints\n- Input validation\n- Deployed URL",
    resources: "- OpenAPI / Zod\n- Your host's docs",
    deliverables: "- Repo + live URL\n- API description\n- README",
  },
  {
    track: "DEVELOPER",
    tier: "Advanced",
    title: "Realtime collaboration mini-app",
    description:
      "## Goal\nBuild a **realtime** web app (WebSockets or SSE) with presence or live cursors.\n\n## Requirements\n- Working deploy\n- Clear architecture notes\n- Basic tests or load notes",
    resources: "- Socket.io / Partykit / Durable Objects",
    deliverables: "- Repo + demo\n- Architecture writeup\n- Threats / limits you considered",
  },
  {
    track: "HACKER",
    tier: "Beginner",
    title: "CTF writeup: crypto 101",
    description:
      "## Goal\nSolve a **public beginner crypto challenge** and document every step.\n\n## Requirements\n- Flag or full walkthrough\n- Explain the mistake that made it solvable",
    resources: "- Cryptopals\n- picoCTF crypto",
    deliverables: "- Writeup (markdown/PDF)\n- References",
  },
  {
    track: "HACKER",
    tier: "Intermediate",
    title: "Security tool: dependency scanner",
    description:
      "## Goal\nBuild a small **tool** that flags risky dependency patterns in a repo.\n\n## Requirements\n- CLI or script\n- Clear rules documented\n- Sample run on an OSS repo",
    resources: "- npm audit / OSV\n- Semgrep intro",
    deliverables: "- Repo\n- Example output\n- Limitations",
  },
  {
    track: "HACKER",
    tier: "Advanced",
    title: "Vuln research memo",
    description:
      "## Goal\nPick an **open-source component**, audit a narrow surface, and write a professional memo.\n\n## Requirements\n- Hypothesis, methodology, result\n- Responsible disclosure stance even if no bug",
    resources: "- OWASP Testing Guide\n- CVE database",
    deliverables: "- Memo PDF/markdown\n- Timeline\n- Tooling/scripts if any",
  },
];

function trackLabel(track: string): string {
  return track === "HACKER" ? "Hacker" : "Developer";
}

function parseClaudeJson(text: string): GenChallenge[] | null {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence) t = fence[1]!.trim();
  try {
    const arr = JSON.parse(t) as unknown;
    if (!Array.isArray(arr) || arr.length !== 6) return null;
    const out: GenChallenge[] = [];
    for (const row of arr) {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      if (
        typeof r.track !== "string" ||
        typeof r.tier !== "string" ||
        typeof r.title !== "string" ||
        typeof r.description !== "string" ||
        typeof r.resources !== "string" ||
        typeof r.deliverables !== "string"
      ) {
        return null;
      }
      out.push({
        track: r.track,
        tier: r.tier,
        title: r.title,
        description: r.description,
        resources: r.resources,
        deliverables: r.deliverables,
      });
    }
    return out;
  } catch {
    return null;
  }
}

async function callClaude(
  apiKey: string,
  month: string,
  recentTitles: string[],
): Promise<{ list: GenChallenge[] | null; error: string | null }> {
  const recent =
    recentTitles.length > 0 ? recentTitles.join("; ") : "(none yet)";
  const user = `Current month: ${month}
Do not repeat recent topics: ${recent}
Respond ONLY with a JSON array of 6 objects. No markdown fences.
Each object: track (DEVELOPER|HACKER), tier (Beginner|Intermediate|Advanced), title, description (markdown string), resources (markdown bullets), deliverables (markdown bullets).`;

  const system = `You are the challenge designer for H4ck&Stack. Generate 6 unique monthly challenges: 3 Developer (shipped software) and 3 Hacker (security research, tools, CTF, vuln writeups, red team methodology). Each completable solo in 21 days. No paid APIs required.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error("Claude API:", res.status, raw);
      return { list: null, error: `Claude API HTTP ${res.status}: ${raw.slice(0, 200)}` };
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    let parsed = parseClaudeJson(text);
    if (!parsed) {
      parsed = parseClaudeJson(text.replace(/^[\s\S]*?(\[[\s\S]*\])[\s\S]*$/, "$1"));
    }
    if (!parsed) {
      return { list: null, error: "Claude returned non-parseable JSON challenge list." };
    }
    return { list: parsed, error: null };
  } catch (err) {
    return { list: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function generateChallenges(
  c: { env: WorkerBindings },
  prisma: PrismaClient,
  now: Date,
): Promise<GeneratedChallengesResult> {
  const month = monthKey(now);
  const recent = await prisma.challenge.findMany({
    where: { month: { not: month } },
    orderBy: { createdAt: "desc" },
    take: 18,
    select: { title: true },
  });
  const recentTitles = recent.map((r) => r.title);

  let list: GenChallenge[] | null = null;
  let errMsg: string | null = null;

  if (c.env.CLAUDE_API_KEY?.trim()) {
    const first = await callClaude(c.env.CLAUDE_API_KEY.trim(), month, recentTitles);
    list = first.list;
    errMsg = first.error;
    if (!list) {
      const second = await callClaude(c.env.CLAUDE_API_KEY.trim(), month, recentTitles);
      list = second.list;
      errMsg = second.error ?? errMsg;
    }
  } else {
    errMsg = "Missing CLAUDE_API_KEY.";
  }

  if (!list) {
    return {
      month,
      challenges: FALLBACK,
      usedFallback: true,
      error: errMsg ?? "Claude generation failed; used fallback challenges.",
    };
  }

  return { month, challenges: list, usedFallback: false, error: null };
}

export async function postChallengesToDiscord(
  c: { env: WorkerBindings },
  prisma: PrismaClient,
  month: string,
  list: GenChallenge[],
): Promise<void> {
  const token = c.env.DISCORD_TOKEN;
  const base = c.env.BASE_URL?.replace(/\/$/, "") || "https://h4cknstack.com";

  for (const ch of list) {
    const track = ch.track === "HACKER" ? "HACKER" : "DEVELOPER";
    const challenge = await prisma.challenge.upsert({
      where: {
        month_track_tier: { month, track, tier: ch.tier },
      },
      create: {
        month,
        track,
        tier: ch.tier,
        title: ch.title,
        description: ch.description,
        resources: ch.resources,
        deliverables: ch.deliverables,
      },
      update: {
        title: ch.title,
        description: ch.description,
        resources: ch.resources,
        deliverables: ch.deliverables,
        messageId: null,
        threadId: null,
      },
    });

    const channelId =
      track === "HACKER"
        ? c.env.HACKER_CHALLENGES_CHANNEL_ID?.trim()
        : c.env.DEVELOPER_CHALLENGES_CHANNEL_ID?.trim();

    if (!channelId) {
      console.error("Missing challenge channel for", track);
      continue;
    }

    const msg = await sendChannelMessage(token, channelId, {
      embeds: [
        {
          title: `📌 ${ch.title}`,
          description: ch.description.slice(0, 4096),
          color: track === "HACKER" ? 0xed4245 : 0x5865f2,
          fields: [
            { name: "Track", value: trackLabel(track), inline: true },
            { name: "Tier", value: ch.tier, inline: true },
            { name: "Month", value: month, inline: true },
            {
              name: "Deliverables",
              value: ch.deliverables.slice(0, 1024),
              inline: false,
            },
            ...(ch.resources
              ? [{ name: "Resources", value: ch.resources.slice(0, 1024), inline: false }]
              : []),
          ],
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "Enroll",
              custom_id: `enroll:${challenge.id}`,
            },
          ],
        },
      ],
    });

    if (msg?.id) {
      await prisma.challenge.update({
        where: { id: challenge.id },
        data: { messageId: msg.id },
      });
    }
  }

  const announce = `📅 **${month}** challenges are live! Enroll with the button on each post or on **${base}/challenges/developers** / **${base}/challenges/hackers**. Build window: **days 1–21**.`;

  const devCh = c.env.DEVELOPER_CHALLENGES_CHANNEL_ID?.trim();
  const hackCh = c.env.HACKER_CHALLENGES_CHANNEL_ID?.trim();
  if (devCh) await sendChannelMessage(token, devCh, { content: announce });
  if (hackCh && hackCh !== devCh) {
    await sendChannelMessage(token, hackCh, { content: announce });
  }
}

export async function generateAndPostChallenges(
  c: { env: WorkerBindings },
  prisma: PrismaClient,
  now: Date,
): Promise<void> {
  const generated = await generateChallenges(c, prisma, now);
  let cfg = await prisma.config.findFirst();
  if (!cfg) cfg = await prisma.config.create({ data: {} });
  if (generated.usedFallback && generated.error) {
    await prisma.config.update({
      where: { id: cfg.id },
      data: { lastChallengeGenError: generated.error.slice(0, 500) },
    });
  }
  await postChallengesToDiscord(c, prisma, generated.month, generated.challenges);
}
