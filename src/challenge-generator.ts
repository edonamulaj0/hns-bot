import type { PrismaClient } from "@prisma/client/edge";
import { sendChannelMessage } from "./discord-api";
import type { WorkerBindings } from "./worker-env";
import { monthKey } from "./time";
import { trackLabel } from "./tracks";

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
  {
    track: "DESIGNERS",
    tier: "Beginner",
    title: "Event poster (print or social)",
    description:
      "## Goal\nDesign a **poster** for a fictional tech event or cause.\n\n## Requirements\n- Clear hierarchy (headline, date, CTA)\n- 3–5 color palette\n- Readable at a glance",
    resources: "- Google Fonts\n- Coolors palette generator",
    deliverables:
      "- **PNG, JPG, or WebP** export (min 1080px long edge)\n- 1 paragraph on audience + intent",
  },
  {
    track: "DESIGNERS",
    tier: "Intermediate",
    title: "Mini brand kit",
    description:
      "## Goal\nCreate a **logo + color/type rules + one mock social post** for a product you invent.\n\n## Requirements\n- Logo works on dark and light\n- Show the system applied once",
    resources: "- Penpot / Figma community files",
    deliverables:
      "- **PNG, JPG, or WebP** board export\n- Short rationale (150–300 words)",
  },
  {
    track: "DESIGNERS",
    tier: "Advanced",
    title: "UI flow + motion storyboard",
    description:
      "## Goal\n**High-fidelity UI** for a 3+ screen flow plus a **6–12 frame motion storyboard** (static frames OK).\n\n## Requirements\n- Empty/loading/error states\n- Annotated motion intent",
    resources: "- Material motion\n- WCAG contrast guidance",
    deliverables:
      "- **PNG, JPG, or WebP** export (single board or one combined image)\n- Case study (300–600 words)",
  },
];

function normalizeChallengeTrack(raw: string): "DEVELOPER" | "HACKER" | "DESIGNERS" {
  const u = raw.toUpperCase();
  if (u === "HACKER") return "HACKER";
  if (u === "DESIGNERS" || u === "DESIGNER" || u === "DESIGN" || u === "GRAPHIC") return "DESIGNERS";
  return "DEVELOPER";
}

/** Pull out the outermost `[...]` span with bracket depth, respecting JSON string escapes. */
function extractBalancedJsonArray(src: string): string | null {
  const start = src.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let j = start; j < src.length; j++) {
    const c = src[j]!;
    if (esc) {
      esc = false;
      continue;
    }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return null;
}

function stripJsonTrailingCommas(json: string): string {
  return json.replace(/,(\s*[\]}])/g, "$1");
}

function normalizeJsonishText(text: string): string {
  return text
    .replace(/\uFEFF/g, "")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\u2018|\u2019/g, "'");
}

/** Strip markdown fences (may appear after a short preamble). */
function stripMarkdownFences(text: string): string {
  let t = text.trim();
  for (let i = 0; i < 8; i++) {
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!m) break;
    t = m[1]!.trim();
  }
  return t.trim();
}

function coerceChallengeArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const inner = o.challenges ?? o.items ?? o.results;
    return Array.isArray(inner) ? inner : null;
  }
  return null;
}

function normalizeChallengesFromParsed(arr: unknown[]): GenChallenge[] | null {
  if (arr.length !== 9 && arr.length !== 6) return null;
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
      track: normalizeChallengeTrack(String(r.track)),
      tier: r.tier,
      title: r.title,
      description: r.description,
      resources: r.resources,
      deliverables: r.deliverables,
    });
  }
  return out;
}

function parseClaudeJson(text: string): GenChallenge[] | null {
  let t = normalizeJsonishText(text.trim());
  t = stripMarkdownFences(t);
  const slices: string[] = [t.trim()];
  const extracted = extractBalancedJsonArray(t);
  if (extracted?.trim() && extracted.trim() !== slices[0]) {
    slices.push(extracted.trim());
  }

  const tried = new Set<string>();
  for (const slice of slices) {
    const variants = [slice, stripJsonTrailingCommas(slice)];
    for (const cand of variants) {
      const s = cand.trim();
      if (!s || tried.has(s)) continue;
      tried.add(s);
      try {
        const parsed = JSON.parse(s) as unknown;
        const arr = coerceChallengeArray(parsed);
        if (!arr) continue;
        const ok = normalizeChallengesFromParsed(arr);
        if (ok) return ok;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function claudeErrorShouldRetry(status: number, bodyText: string): boolean {
  if (status === 429 || status === 503 || status === 529) return true;
  try {
    const j = JSON.parse(bodyText) as { error?: { type?: string; message?: string } };
    const t = (j?.error?.type ?? "").toLowerCase();
    const m = (j?.error?.message ?? "").toLowerCase();
    if (t.includes("overloaded") || m.includes("overloaded")) return true;
    if (t === "rate_limit_error") return true;
  } catch {
    /* ignore */
  }
  return false;
}

async function callClaude(
  apiKey: string,
  month: string,
  recentTitles: string[],
): Promise<{ list: GenChallenge[] | null; error: string | null }> {
  const recent =
    recentTitles.length > 0 ? recentTitles.join("; ") : "(none yet)";
  const baseUser = `Current month: ${month}
Do not repeat recent topics: ${recent}
Respond ONLY with a JSON array of 9 objects. No markdown fences.
Each object: track (DEVELOPER|HACKER|DESIGNERS), tier (Beginner|Intermediate|Advanced), title, description (markdown string), resources (markdown bullets), deliverables (markdown bullets).
In descriptions/deliverables, mention relaxed pacing (~10 days part-time for core scope) where natural — avoid implying participants must use the entire build window.`;
  const retrySuffix = `

Your previous answer could not be parsed as JSON. Reply again with ONLY valid JSON: exactly one array of 9 objects (no wrapper object unless it is {"challenges":[...]}). Use ASCII double quotes; escape any double quote inside strings as \\". No trailing commas. No commentary before or after.`;

  const system = `You are the challenge designer for H4ck&Stack. Generate 9 unique monthly challenges:

Developer (3): Focus on small, shippable software — apps, APIs, CLIs, libraries, scripts, or internal tools. Challenges must feel chill and hobby-friendly: aim for a motivated solo builder to finish the core scope in about **10 days** of part-time work (not cramming the full 21-day window). Scope to one clear MVP with 2–4 concrete outcomes in description/deliverables; avoid “production-grade everything,” heavy DevOps, large multi-service architectures, or grindy homework vibes. Prefer free tiers, local/offline options, and fake/stub data over paid APIs.

Hacker (3): Security-flavored work — CTF-style writeups, small tooling or automation, focused vuln research notes, or short methodology/red-team exercises. Same pacing as Developer: **~10 days** relaxed solo effort for the main artifact, not a three-week research paper. One primary deliverable plus clear proof-of-work; no expectation of novel CVEs or enterprise-grade ops.

Designer (3): Visual design briefs — posters, brand kits, UI mockups, motion storyboards. Deliverables must require a **PNG/JPG/WebP image export**, not a GitHub repo as the primary submission.

General: The community month still runs up to ~21 days for build/review; size each brief so finishing early feels normal. No paid APIs or proprietary datasets required. Tone: encouraging and concrete, not intimidating.`;

  const maxAttempts = 5;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
          messages: [
            {
              role: "user",
              content: attempt === 0 ? baseUser : `${baseUser}${retrySuffix}`,
            },
          ],
        }),
      });

      const raw = await res.text();

      if (!res.ok) {
        console.error("Claude API:", res.status, raw.slice(0, 500));
        lastError = `Claude API HTTP ${res.status}: ${raw.slice(0, 200)}`;
        if (claudeErrorShouldRetry(res.status, raw) && attempt < maxAttempts - 1) {
          await sleep(Math.min(12_000, 1500 * 2 ** attempt));
          continue;
        }
        return { list: null, error: lastError };
      }

      const data = JSON.parse(raw) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const text = data.content?.find((c) => c.type === "text")?.text ?? "";
      const parsed = parseClaudeJson(text);
      if (!parsed) {
        console.error(
          "Claude challenge JSON parse failed; response snippet:",
          text.slice(0, 600),
        );
        lastError = "Claude returned non-parseable JSON challenge list.";
        if (attempt < maxAttempts - 1) {
          await sleep(Math.min(12_000, 1500 * 2 ** attempt));
          continue;
        }
        return { list: null, error: lastError };
      }
      return { list: parsed, error: null };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts - 1) {
        await sleep(Math.min(12_000, 1500 * 2 ** attempt));
        continue;
      }
      return { list: null, error: lastError };
    }
  }

  return { list: null, error: lastError ?? "Claude request failed after retries." };
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
    const result = await callClaude(c.env.CLAUDE_API_KEY.trim(), month, recentTitles);
    list = result.list;
    errMsg = result.error;
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
    const track = normalizeChallengeTrack(ch.track);
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
        : track === "DESIGNERS"
          ? c.env.DESIGN_CHALLENGES_CHANNEL_ID?.trim() ||
            c.env.DEVELOPER_CHALLENGES_CHANNEL_ID?.trim()
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
          color:
            track === "HACKER" ? 0xed4245 : track === "DESIGNERS" ? 0xd85a30 : 0x5865f2,
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

  const announce = `📅 **${month}** challenges are live! Enroll with the button on each post or on **${base}/challenges/developers** / **${base}/challenges/hackers** / **${base}/challenges/designer**. Build window: **days 1–21**.`;

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
