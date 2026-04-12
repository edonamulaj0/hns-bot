import type { PrismaClient } from "@prisma/client/edge";

const TTL_MS = 15 * 60 * 1000;

export type PendingAttachmentKind = "submit" | "share_blog";

export async function putPendingAttachment(
  prisma: PrismaClient,
  discordUserId: string,
  kind: PendingAttachmentKind,
  data: {
    url: string;
    filename?: string | null;
    contentType?: string | null;
    size?: number | null;
  },
): Promise<void> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await prisma.pendingDiscordAttachment.upsert({
    where: { discordUserId_kind: { discordUserId, kind } },
    create: {
      discordUserId,
      kind,
      url: data.url,
      filename: data.filename ?? null,
      contentType: data.contentType ?? null,
      size: data.size ?? null,
      expiresAt,
    },
    update: {
      url: data.url,
      filename: data.filename ?? null,
      contentType: data.contentType ?? null,
      size: data.size ?? null,
      expiresAt,
    },
  });
}

export async function takePendingAttachment(
  prisma: PrismaClient,
  discordUserId: string,
  kind: PendingAttachmentKind,
) {
  const row = await prisma.pendingDiscordAttachment.findUnique({
    where: { discordUserId_kind: { discordUserId, kind } },
  });
  if (!row) return null;
  await prisma.pendingDiscordAttachment.delete({
    where: { discordUserId_kind: { discordUserId, kind } },
  });
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}
