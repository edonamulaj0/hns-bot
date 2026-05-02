/**
 * Browser calls against same-origin `/hns-api/*` (Next rewrites to the bot Worker).
 * Sends session cookies for authenticated routes.
 */
function browserWorkerBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "";
  const base = raw.replace(/\/$/, "");
  if (!base || base.includes("YOUR_SUBDOMAIN")) return "";
  return base;
}

const LOCAL_API_PREFIX = "/hns-api";

export function browserApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // Same-origin only in the browser so session cookies (scoped to this site) are always sent.
  // Middleware proxies `/hns-api/*` to the bot Worker at runtime.
  if (typeof window !== "undefined") {
    return `${LOCAL_API_PREFIX}${normalized}`;
  }
  const worker = browserWorkerBase();
  if (worker) return `${worker}/api${normalized}`;
  return `${LOCAL_API_PREFIX}${normalized}`;
}

export async function fetchMe(): Promise<Response> {
  return fetch(browserApiUrl("/me"), { credentials: "include", cache: "no-store" });
}

export async function fetchUserPublicProfile(discordId: string): Promise<Response> {
  if (!/^\d{17,20}$/.test(discordId)) {
    return new Response(JSON.stringify({ error: "invalid_discord_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  return fetch(browserApiUrl(`/users/${discordId}`), { cache: "no-store" });
}

export async function patchProfile(body: {
  displayName?: string | null;
  bio?: string | null;
  github?: string | null;
  linkedin?: string | null;
  framer?: string | null;
  techStack?: string[];
  profileAvatarSource?: string | null;
}): Promise<Response> {
  return fetch(browserApiUrl("/profile"), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteProfile(): Promise<Response> {
  return fetch(browserApiUrl("/profile"), { method: "DELETE", credentials: "include" });
}

export async function postEnroll(challengeId: string): Promise<Response> {
  return fetch(browserApiUrl("/enroll"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  });
}

export async function postSubmit(body: Record<string, unknown>): Promise<Response> {
  return fetch(browserApiUrl("/submit"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchSubmit(
  id: string,
  body: Record<string, unknown>,
): Promise<Response> {
  return fetch(browserApiUrl(`/submit/${encodeURIComponent(id)}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteSubmit(id: string): Promise<Response> {
  return fetch(browserApiUrl(`/submit/${encodeURIComponent(id)}`), {
    method: "DELETE",
    credentials: "include",
  });
}

export async function postBlog(body: {
  kind: "ARTICLE" | "PROJECT";
  title: string;
  /** Required for projects; optional for articles (hosted body is primary). */
  url?: string;
  content?: string | null;
}): Promise<Response> {
  return fetch(browserApiUrl("/blog"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function patchBlog(
  id: string,
  body: { title?: string; url?: string; content?: string | null },
): Promise<Response> {
  return fetch(browserApiUrl(`/blog/${encodeURIComponent(id)}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteBlog(id: string): Promise<Response> {
  return fetch(browserApiUrl(`/blog/${encodeURIComponent(id)}`), {
    method: "DELETE",
    credentials: "include",
  });
}

export async function fetchSubmission(id: string): Promise<Response> {
  return fetch(browserApiUrl(`/submission/${encodeURIComponent(id)}`), {
    cache: "no-store",
  });
}

export async function fetchVoteQueue(month: string): Promise<Response> {
  return fetch(
    browserApiUrl(`/vote/queue?month=${encodeURIComponent(month)}`),
    { credentials: "include", cache: "no-store" },
  );
}

export async function fetchVoteStatus(month: string): Promise<Response> {
  return fetch(
    browserApiUrl(`/vote/status?month=${encodeURIComponent(month)}`),
    { credentials: "include", cache: "no-store" },
  );
}

export async function postVote(submissionId: string, month: string): Promise<Response> {
  return fetch(browserApiUrl("/vote"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submissionId, month }),
  });
}

export async function fetchActivitySubmissions(
  limit: number,
  offset: number,
): Promise<Response> {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return fetch(browserApiUrl(`/activity/submissions?${qs}`), {
    cache: "no-store",
  });
}

export async function postBlogLike(blogId: string): Promise<Response> {
  return fetch(browserApiUrl(`/blogs/${encodeURIComponent(blogId)}/like`), {
    method: "POST",
    credentials: "include",
  });
}

export async function fetchMyBlogLikes(): Promise<Response> {
  return fetch(browserApiUrl("/blogs/likes/mine"), {
    credentials: "include",
    cache: "no-store",
  });
}

export async function fetchAdminSubmissions(): Promise<Response> {
  return fetch(browserApiUrl("/admin/submissions"), {
    credentials: "include",
    cache: "no-store",
  });
}

export async function patchAdminSubmission(
  id: string,
  body: { action: "approve" | "reject" },
): Promise<Response> {
  return fetch(browserApiUrl(`/admin/submissions/${encodeURIComponent(id)}`), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function postDesignImageUpload(file: File): Promise<Response> {
  const fd = new FormData();
  fd.set("file", file);
  return fetch(browserApiUrl("/upload/design-image"), {
    method: "POST",
    credentials: "include",
    body: fd,
  });
}
