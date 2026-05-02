import type { MessageBatch } from "@cloudflare/workers-types";
import type { PrismaClient } from "@prisma/client/edge";
import type { WorkerBindings, ChallengeGenQueueMessage } from "./worker-env";
import { getPrisma } from "./db";
import { generateChallenges, type GeneratedChallengesResult } from "./challenge-generator";

function previewFields(list: GeneratedChallengesResult["challenges"]) {
  return list.map((ch) => ({
    name: `${ch.track} — ${ch.tier}`,
    value: `**${ch.title}**\n${ch.description.slice(0, 150)}${ch.description.length > 150 ? "…" : ""}`,
    inline: false,
  }));
}

/** PATCH deferred slash interaction response (no Bot `Authorization` header). */
export async function patchDiscordDeferredOriginal(
  applicationId: string,
  interactionToken: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const text = await res.text();
  return { ok: res.ok, status: res.status, text: text.slice(0, 500) };
}

function previewDiscordPayload(generated: GeneratedChallengesResult): Record<string, unknown> {
  const basePayload = {
    embeds: [
      {
        title: `🧪 Challenge generation preview — ${generated.month}`,
        color: 0xf59e0b,
        fields: previewFields(generated.challenges),
      },
    ],
  };

  if (generated.usedFallback) {
    const err = generated.error ?? "";
    const overloaded = /overloaded|529|rate_limit|503|unavailable/i.test(err);
    const content = overloaded
      ? "⚠️ **Claude is overloaded or rate-limited** (retries were already attempted). Showing **fallback** challenges — you can still post them, or run the command again later."
      : `❌ Generation failed. Error: ${err || "Unknown error"}\nShowing fallback challenges that would have been used.`;
    return { ...basePayload, content };
  }

  return {
    ...basePayload,
    content:
      "Preview below — **Post for real** clears this month’s challenges + related enrollments/submissions/votes in the database, posts fresh embeds to the challenge channels, then edits this message.",
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: "Post for real",
            custom_id: `admin:confirm-post-challenges:${generated.month}`,
          },
          {
            type: 2,
            style: 2,
            label: "Discard",
            custom_id: "admin:discard-challenges",
          },
        ],
      },
    ],
  };
}

async function persistPreview(prisma: PrismaClient, discordUserId: string, generated: GeneratedChallengesResult) {
  await prisma.challengeGenPreview.upsert({
    where: { discordUserId },
    create: {
      discordUserId,
      month: generated.month,
      payloadJson: JSON.stringify(generated),
    },
    update: {
      month: generated.month,
      payloadJson: JSON.stringify(generated),
    },
  });
}

async function runAdminTestPreviewJob(env: WorkerBindings, job: ChallengeGenQueueMessage): Promise<void> {
  const prisma = getPrisma(env.DB);
  let generated: GeneratedChallengesResult;
  try {
    generated = await generateChallenges({ env }, prisma, new Date());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("challenge-gen-queue generateChallenges:", err);
    await patchDiscordDeferredOriginal(job.applicationId, job.interactionToken, {
      content: `❌ Challenge generation crashed before Claude finished: ${msg.slice(0, 500)}`,
      embeds: [],
      components: [],
    });
    return;
  }

  try {
    await persistPreview(prisma, job.discordUserId, generated);
  } catch (err) {
    console.error("challenge-gen-queue persistPreview:", err);
    await patchDiscordDeferredOriginal(job.applicationId, job.interactionToken, {
      content: `❌ Could not save preview to database: ${err instanceof Error ? err.message : String(err)}`,
      embeds: [],
      components: [],
    });
    return;
  }

  const payload = previewDiscordPayload(generated);
  const patch = await patchDiscordDeferredOriginal(job.applicationId, job.interactionToken, payload);
  if (!patch.ok) {
    console.error("challenge-gen-queue PATCH @original:", patch.status, patch.text);
    throw new Error(`Discord PATCH failed: HTTP ${patch.status} ${patch.text}`);
  }
}

export async function processChallengeGenQueueBatch(
  batch: MessageBatch<ChallengeGenQueueMessage>,
  env: WorkerBindings,
): Promise<void> {
  for (const msg of batch.messages) {
    const body = msg.body;
    if (!body || body.kind !== "admin-test-preview") {
      msg.ack();
      continue;
    }
    try {
      await runAdminTestPreviewJob(env, body);
      msg.ack();
    } catch (e) {
      console.error("challenge-gen-queue job error:", e);
      msg.retry();
    }
  }
}
