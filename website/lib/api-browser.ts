/**
 * Browser calls against same-origin `/hns-api/*` (Next rewrites to the bot Worker).
 * Sends session cookies for authenticated routes.
 */
const H = "/hns-api";

export async function fetchMe(): Promise<Response> {
  return fetch(`${H}/me`, { credentials: "include", cache: "no-store" });
}

export async function patchProfile(body: {
  displayName?: string | null;
  bio?: string | null;
  github?: string | null;
  linkedin?: string | null;
  techStack?: string[];
}): Promise<Response> {
  return fetch(`${H}/profile`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteProfile(): Promise<Response> {
  return fetch(`${H}/profile`, { method: "DELETE", credentials: "include" });
}

export async function postEnroll(challengeId: string): Promise<Response> {
  return fetch(`${H}/enroll`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challengeId }),
  });
}

export async function postSubmit(body: Record<string, unknown>): Promise<Response> {
  return fetch(`${H}/submit`, {
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
  return fetch(`${H}/submit/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function deleteSubmit(id: string): Promise<Response> {
  return fetch(`${H}/submit/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
}

export async function fetchVoteQueue(month: string): Promise<Response> {
  return fetch(
    `${H}/vote/queue?month=${encodeURIComponent(month)}`,
    { credentials: "include", cache: "no-store" },
  );
}

export async function fetchVoteStatus(month: string): Promise<Response> {
  return fetch(
    `${H}/vote/status?month=${encodeURIComponent(month)}`,
    { credentials: "include", cache: "no-store" },
  );
}

export async function postVote(submissionId: string): Promise<Response> {
  return fetch(`${H}/vote`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submissionId }),
  });
}
