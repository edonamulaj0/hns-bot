import { $channels$_$messages } from "discord-hono";

/**
 * Typed helper for sending Discord messages via REST API.
 * Provides type safety for channel ID and payload parameters.
 */
export async function sendMessage(
  rest: any,
  channelId: string,
  payload: {
    content?: string;
    embeds?: object[];
    components?: object[];
  },
): Promise<void> {
  await rest("POST", $channels$_$messages, [channelId], payload);
}

/**
 * Discord message payload builder for embeds.
 * Provides a clean API for constructing rich embeds.
 */
export function buildEmbed(options: {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  url?: string;
}): object {
  return {
    title: options.title,
    description: options.description,
    url: options.url,
    color: options.color ?? 0x5865f2,
    fields: options.fields ?? [],
    footer: options.footer,
  };
}