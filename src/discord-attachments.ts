/**
 * Read a slash-command Attachment option from the interaction payload.
 * Resolved attachment objects live on data.resolved.attachments[id].
 */

export type ResolvedAttachment = {
  id: string;
  url: string;
  filename?: string;
  content_type?: string;
  size?: number;
};

function flattenCommandOptions(options: any[] | undefined): any[] {
  if (!options?.length) return [];
  const out: any[] = [];
  for (const o of options) {
    if (o.type === 1 || o.type === 2) {
      out.push(...flattenCommandOptions(o.options));
    } else {
      out.push(o);
    }
  }
  return out;
}

export function getCommandAttachment(
  interaction: any,
  optionName: string,
): ResolvedAttachment | null {
  const options = interaction?.data?.options;
  const flat = flattenCommandOptions(options);
  const opt = flat.find((o) => o.name === optionName && o.type === 11);
  if (!opt?.value) return null;
  const id = String(opt.value);
  const att = interaction?.data?.resolved?.attachments?.[id];
  if (!att?.url) return null;
  return {
    id,
    url: att.url,
    filename: att.filename,
    content_type: att.content_type,
    size: att.size,
  };
}

/** Submit: PDF, .txt, or .md — max 5MB */
export function validateSubmitAttachment(att: ResolvedAttachment): string | null {
  const max = 5 * 1024 * 1024;
  const name = (att.filename ?? "").toLowerCase();
  const ct = (att.content_type ?? "").toLowerCase();
  const pdf = ct === "application/pdf" || name.endsWith(".pdf");
  const txt = ct === "text/plain" || name.endsWith(".txt");
  const md =
    ct === "text/plain" ||
    ct === "text/markdown" ||
    name.endsWith(".md") ||
    name.endsWith(".markdown");
  if (!pdf && !txt && !md) {
    return "Attachment must be a PDF, `.txt`, or `.md` file.";
  }
  if (att.size != null && att.size > max) {
    return "Attachment must be **5 MB** or smaller.";
  }
  return null;
}

/** Share-blog upload: plain text / markdown — max 500KB */
export function validateBlogFileAttachment(att: ResolvedAttachment): string | null {
  const max = 500 * 1024;
  const name = (att.filename ?? "").toLowerCase();
  const ct = (att.content_type ?? "").toLowerCase();
  const ok =
    ct === "text/plain" ||
    ct === "text/markdown" ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown");
  if (!ok) {
    return "File must be `.txt` or `.md` (or `text/plain` / `text/markdown`).";
  }
  if (att.size != null && att.size > max) {
    return "Uploaded article must be **500 KB** or smaller.";
  }
  return null;
}
