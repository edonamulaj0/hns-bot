/** Minimal Discord REST helpers (Workers). */

import type { WorkerBindings } from "./worker-env";

/**
 * Post to the blog-sharing Discord channel. Use this instead of raw `sendChannelMessage`
 * when the target is `BLOG_CHANNEL_ID` (e.g. article announcements).
 */
export async function sendBlogChannelMessage(
  env: WorkerBindings,
  payload: Record<string, unknown>,
): Promise<{ id: string } | null> {
  if (!env.BLOG_CHANNEL_ID) {
    console.error("BLOG_CHANNEL_ID is not set — skipping blog channel post");
    return null;
  }
  return sendChannelMessage(env.DISCORD_TOKEN, env.BLOG_CHANNEL_ID, payload);
}

export async function discordApi(
  botToken: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`https://discord.com/api/v10${path}`, {
    method,
    headers: {
      Authorization: `Bot ${botToken}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export async function sendChannelMessage(
  botToken: string,
  channelId: string,
  payload: Record<string, unknown>,
): Promise<{ id: string } | null> {
  const res = await discordApi(
    botToken,
    "POST",
    `/channels/${channelId}/messages`,
    payload,
  );
  if (!res.ok) {
    console.error("sendChannelMessage:", res.status, await res.text());
    return null;
  }
  return (await res.json()) as { id: string };
}

export async function startPublicThreadOnMessage(
  botToken: string,
  channelId: string,
  messageId: string,
  name: string,
): Promise<{ id: string } | null> {
  const res = await discordApi(
    botToken,
    "POST",
    `/channels/${channelId}/messages/${messageId}/threads`,
    {
      name: name.slice(0, 100),
      auto_archive_duration: 10080,
      type: 11,
    },
  );
  if (!res.ok) {
    console.error("startPublicThreadOnMessage:", res.status, await res.text());
    return null;
  }
  return (await res.json()) as { id: string };
}

export async function sendDirectMessage(
  botToken: string,
  recipientDiscordId: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  const dmRes = await discordApi(botToken, "POST", `/users/@me/channels`, {
    recipient_id: recipientDiscordId,
  });
  if (!dmRes.ok) {
    console.error("create DM:", dmRes.status, await dmRes.text());
    return false;
  }
  const dm = (await dmRes.json()) as { id: string };
  const msgRes = await discordApi(
    botToken,
    "POST",
    `/channels/${dm.id}/messages`,
    payload,
  );
  return msgRes.ok;
}
