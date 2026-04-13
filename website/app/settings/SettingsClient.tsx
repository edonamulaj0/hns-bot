"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteProfile, fetchMe, patchProfile } from "@/lib/api-browser";
import { getSessionClient, loginUrl } from "@/lib/auth-client";
import {
  joinPublicDisplayName,
  splitPublicDisplayName,
  validatePublicDisplayName,
} from "@/lib/display-name";

type MeUser = {
  displayName: string | null;
  discordUsername: string | null;
  bio: string | null;
  github: string | null;
  linkedin: string | null;
  techStack: unknown;
};

function normalizeTag(v: string) {
  return v.trim().slice(0, 30);
}

export function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubErr, setGithubErr] = useState<string | null>(null);
  const [linkedinErr, setLinkedinErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [authIssue, setAuthIssue] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const session = await getSessionClient();
        if (!session) {
          if (alive) {
            setAuthIssue(null);
            setSignedIn(false);
          }
          return;
        }
        const res = await fetchMe();
        if (!res.ok) {
          if (alive) {
            setAuthIssue(
              "You're signed in, but your app session could not be verified. Try signing out and signing in again.",
            );
            setSignedIn(false);
          }
          return;
        }
        if (alive) {
          setAuthIssue(null);
          setSignedIn(true);
        }
        const data = (await res.json()) as { user: MeUser };
        if (!alive) return;
        const { first, last } = splitPublicDisplayName(data.user.displayName);
        setFirstName(first || data.user.discordUsername || "");
        setLastName(last);
        setAbout(data.user.bio ?? "");
        setGithub(data.user.github ?? "");
        setLinkedin(data.user.linkedin ?? "");
        setTags(Array.isArray(data.user.techStack) ? (data.user.techStack as string[]).slice(0, 15) : []);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const aboutCount = useMemo(() => about.length, [about]);

  const addTagFromInput = () => {
    const split = tagInput.split(/[,\n]/g).map(normalizeTag).filter(Boolean);
    if (!split.length) return;
    setTags((prev) => {
      const merged = [...prev];
      for (const t of split) {
        if (merged.length >= 15) break;
        if (!merged.some((x) => x.toLowerCase() === t.toLowerCase())) merged.push(t);
      }
      return merged;
    });
    setTagInput("");
  };

  const onGithubBlur = () => {
    if (!github.trim()) {
      setGithubErr(null);
      return true;
    }
    const ok =
      github.startsWith("https://github.com/") ||
      github.startsWith("https://gitlab.com/");
    setGithubErr(ok ? null : "Must start with https://github.com/ or https://gitlab.com/");
    return ok;
  };

  const onLinkedinBlur = () => {
    if (!linkedin.trim()) {
      setLinkedinErr(null);
      return true;
    }
    const ok = linkedin.startsWith("https://linkedin.com/");
    setLinkedinErr(ok ? null : "Must start with https://linkedin.com/");
    return ok;
  };

  const save = async () => {
    setError(null);
    const ghOk = onGithubBlur();
    const liOk = onLinkedinBlur();
    if (!ghOk || !liOk) return;
    const fullName = joinPublicDisplayName(firstName, lastName);
    const nameToSend = fullName || null;
    if (nameToSend) {
      const nameErr = validatePublicDisplayName(nameToSend);
      if (nameErr) {
        setError(nameErr);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await patchProfile({
        displayName: nameToSend,
        bio: about || null,
        github: github || null,
        linkedin: linkedin || null,
        techStack: tags,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg =
          (j as { field?: string; message?: string }).field === "displayName" &&
          (j as { message?: string }).message
            ? (j as { message: string }).message
            : "Could not save settings.";
        setError(msg);
        return;
      }
      setSaveOk(true);
      window.setTimeout(() => setSaveOk(false), 2000);
    } catch {
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleteBusy(true);
    setError(null);
    try {
      const res = await deleteProfile();
      if (!res.ok) {
        setError("Could not delete account.");
        return;
      }
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      }).catch(() => undefined);
      window.location.href = "/?deleted=1";
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!loading && !signedIn) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        {authIssue && <p className="text-sm text-[var(--danger)] max-w-md text-center">{authIssue}</p>}
        <a href={loginUrl()} className="btn btn-primary">
          Sign in to manage settings
        </a>
      </section>
    );
  }

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)]">
      <div className="container max-w-[640px] mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-white/60 mb-8">Manage your H4ck&Stack account.</p>

        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-10 w-full rounded" />
            <div className="skeleton h-28 w-full rounded" />
            <div className="skeleton h-10 w-full rounded" />
            <div className="skeleton h-10 w-full rounded" />
            <div className="skeleton h-10 w-40 rounded" />
          </div>
        ) : (
          <>
            <div className="card p-5 sm:p-6">
              <h2 className="text-xl font-bold mb-5">Profile</h2>

              <p className="text-xs text-white/45 mb-3">
                How you appear on the site. First name defaults to your Discord login name; last
                name is optional. Discord usernames are not shown as @handles.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">First name</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">
                    Last name <span className="text-white/40">(optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <label className="block text-sm text-white/70 mb-1">About me</label>
              <div className="relative mb-4">
                <textarea
                  maxLength={500}
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm pr-16"
                />
                <span className="absolute bottom-2 right-2 mono text-[0.65rem] text-white/45">
                  {aboutCount}/500
                </span>
              </div>

              <label className="block text-sm text-white/70 mb-1">GitHub URL</label>
              <input
                type="url"
                placeholder="https://github.com/username"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                onBlur={onGithubBlur}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
              />
              {githubErr && <p className="text-xs text-[var(--danger)] mt-1 mb-3">{githubErr}</p>}

              <label className="block text-sm text-white/70 mb-1 mt-4">LinkedIn URL</label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                onBlur={onLinkedinBlur}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
              />
              {linkedinErr && <p className="text-xs text-[var(--danger)] mt-1 mb-3">{linkedinErr}</p>}

              <label className="block text-sm text-white/70 mb-1 mt-4">Tech Stack</label>
              <div className="mb-2 flex flex-wrap gap-2">
                {tags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                    className="tag tag-accent text-xs"
                  >
                    {t} <span aria-hidden>×</span>
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTagFromInput();
                  }
                }}
                placeholder="Type and press Enter or comma"
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
              />
              <p className="text-xs text-white/45 mt-1">Up to 15 tags, 30 chars each.</p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  className="btn btn-primary min-h-12"
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <span
                  className={`text-sm text-[var(--accent)] transition-opacity duration-300 ${
                    saveOk ? "opacity-100" : "opacity-0"
                  }`}
                  aria-live="polite"
                >
                  Saved ✓
                </span>
              </div>
              {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
            </div>

            <div className="card p-5 sm:p-6 mt-6">
              <h2 className="text-xl font-bold mb-4">My Submissions</h2>
              <Link href="/settings/submissions" className="btn w-full justify-between">
                <span>Manage my submissions</span>
                <span aria-hidden>→</span>
              </Link>
            </div>

            <div
              className="mt-8"
              style={{
                borderLeft: "3px solid var(--danger)",
                paddingLeft: "1.25rem",
                marginTop: "2rem",
              }}
            >
              <h2 className="text-xl font-bold mb-3">Danger Zone</h2>
              <button
                type="button"
                className="btn"
                style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                onClick={() => {
                  setConfirmDelete(true);
                  setDeleteInput("");
                }}
              >
                Delete my account
              </button>

              {confirmDelete && (
                <div
                  className="mt-4 rounded p-4"
                  style={{
                    background: "rgba(237, 66, 69, 0.06)",
                    border: "1px solid rgba(237, 66, 69, 0.3)",
                    borderRadius: "2px",
                    padding: "1rem",
                  }}
                >
                  <p className="text-sm leading-relaxed text-white/80 whitespace-pre-line">
                    This will permanently delete your account, all your submissions,
                    all your XP, and all your personal data from H4ck&Stack.
                    {"\n\n"}⚠ You will not be removed from the Discord server. Your Discord
                    account is unaffected - only your H4ck&Stack data will be deleted.
                    {"\n\n"}This action cannot be undone.
                  </p>

                  <label className="block text-sm text-white/70 mt-4 mb-1">Type DELETE to confirm</label>
                  <input
                    type="text"
                    placeholder="DELETE"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
                  />

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="btn flex-1 justify-center"
                      onClick={() => {
                        setConfirmDelete(false);
                        setDeleteInput("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn flex-1 justify-center"
                      style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                      onClick={confirmDeleteAccount}
                      disabled={deleteInput !== "DELETE" || deleteBusy}
                    >
                      {deleteBusy ? "Deleting..." : "Delete my account"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
