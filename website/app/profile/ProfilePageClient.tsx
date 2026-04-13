"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getSessionClientWithRetry, loginUrl } from "@/lib/auth-client";
import {
  normalizeProfileAvatarSource,
  userProfileAvatarUrl,
  type ProfileAvatarPreference,
} from "@/lib/api";
import {
  deleteProfile,
  fetchMe,
  patchProfile,
} from "@/lib/api-browser";
import {
  joinPublicDisplayName,
  mergedPublicDisplayName,
  splitPublicDisplayName,
  validatePublicDisplayName,
} from "@/lib/display-name";

type MeUser = {
  id: string;
  discordId: string;
  displayName: string | null;
  discordUsername: string | null;
  avatarHash: string | null;
  profileAvatarSource?: string | null;
  bio: string | null;
  github: string | null;
  linkedin: string | null;
  techStack: unknown;
  points: number;
  rank: number;
  profileCompletedAt: string | null;
  stats: { submissions: number; blogs: number; votesCast: number };
};

export function ProfilePageClient() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [delConfirm, setDelConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarSource, setAvatarSource] = useState<ProfileAvatarPreference>("auto");

  const load = useCallback(async () => {
    setSessionLoading(true);
    try {
      const session = await getSessionClientWithRetry();
      if (!session) {
        setUser(null);
        return;
      }

      const res = await fetchMe();
      if (res.status === 401) {
        const { first, last } = splitPublicDisplayName(session.displayName);
        setFirstName(first || "");
        setLastName(last);
        setUser({
          id: "",
          discordId: session.discordId,
          displayName: session.displayName,
          discordUsername: null,
          avatarHash: session.avatarHash,
          profileAvatarSource: session.profileAvatarSource ?? null,
          bio: null,
          github: null,
          linkedin: null,
          techStack: [],
          points: 0,
          rank: 0,
          profileCompletedAt: null,
          stats: { submissions: 0, blogs: 0, votesCast: 0 },
        });
        setAvatarSource(normalizeProfileAvatarSource(session.profileAvatarSource));
        return;
      }
      if (!res.ok) {
        const { first, last } = splitPublicDisplayName(session.displayName);
        setFirstName(first || "");
        setLastName(last);
        setUser({
          id: "",
          discordId: session.discordId,
          displayName: session.displayName,
          discordUsername: null,
          avatarHash: session.avatarHash,
          profileAvatarSource: session.profileAvatarSource ?? null,
          bio: null,
          github: null,
          linkedin: null,
          techStack: [],
          points: 0,
          rank: 0,
          profileCompletedAt: null,
          stats: { submissions: 0, blogs: 0, votesCast: 0 },
        });
        setAvatarSource(normalizeProfileAvatarSource(session.profileAvatarSource));
        return;
      }
      const data = (await res.json()) as { user: MeUser };
      setUser(data.user);
      setAvatarSource(normalizeProfileAvatarSource(data.user.profileAvatarSource));
      const { first, last } = splitPublicDisplayName(data.user.displayName);
      setFirstName(first || data.user.discordUsername || "");
      setLastName(last);
      setBio((data.user.bio ?? "").slice(0, 500));
      setGithub(data.user.github ?? "");
      setLinkedin(data.user.linkedin ?? "");
      const ts = data.user.techStack;
      setTags(Array.isArray(ts) ? (ts as string[]) : []);
    } catch {
      const session = await getSessionClientWithRetry();
      if (!session) {
        setUser(null);
      } else {
        const { first, last } = splitPublicDisplayName(session.displayName);
        setFirstName(first || "");
        setLastName(last);
        setUser({
          id: "",
          discordId: session.discordId,
          displayName: session.displayName,
          discordUsername: null,
          avatarHash: session.avatarHash,
          profileAvatarSource: session.profileAvatarSource ?? null,
          bio: null,
          github: null,
          linkedin: null,
          techStack: [],
          points: 0,
          rank: 0,
          profileCompletedAt: null,
          stats: { submissions: 0, blogs: 0, votesCast: 0 },
        });
        setAvatarSource(normalizeProfileAvatarSource(session.profileAvatarSource));
      }
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTag = () => {
    const t = tagInput.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!t.length) return;
    setTags((prev) => [...new Set([...prev, ...t])]);
    setTagInput("");
  };

  const save = async () => {
    setSaving(true);
    setErr(null);
    setMsg(null);
    const fullName = joinPublicDisplayName(firstName, lastName);
    const nameToSend = fullName || null;
    if (nameToSend) {
      const nameErr = validatePublicDisplayName(nameToSend);
      if (nameErr) {
        setSaving(false);
        setErr(nameErr);
        return;
      }
    }
    const res = await patchProfile({
      displayName: nameToSend,
      bio: (bio || "").slice(0, 500) || null,
      github: github || null,
      linkedin: linkedin || null,
      techStack: tags,
      profileAvatarSource: avatarSource === "auto" ? null : avatarSource,
    });
    setSaving(false);
    if (res.status === 403) {
      const j = await res.json().catch(() => ({}));
      setErr(
        (j as { joinUrl?: string }).joinUrl
          ? "You left the Discord server. Rejoin to save your profile."
          : "Could not save (forbidden).",
      );
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const msg =
        (j as { message?: string; field?: string }).field === "displayName" &&
        (j as { message?: string }).message
          ? (j as { message: string }).message
          : "Save failed.";
      setErr(msg);
      return;
    }
    setMsg("Profile saved.");
    load();
  };

  const removeAccount = async () => {
    if (delConfirm !== "DELETE") return;
    const res = await deleteProfile();
    if (res.ok) {
      window.location.href = "/";
    } else {
      setErr("Could not delete account.");
    }
  };

  if (sessionLoading) {
    return (
      <section className="section px-[clamp(1rem,4vw,2rem)]">
        <div className="container max-w-5xl grid gap-10 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit space-y-4">
            <div className="skeleton h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-3 w-40" />
              <div className="skeleton h-3 w-28" />
            </div>
          </aside>
          <div className="space-y-4">
            <div className="skeleton h-[120px] w-full rounded border border-[var(--border)]" />
            <div className="skeleton h-10 w-full rounded border border-[var(--border)]" />
            <div className="skeleton h-10 w-full rounded border border-[var(--border)]" />
            <div className="skeleton h-10 w-full rounded border border-[var(--border)]" />
            <div className="skeleton h-11 w-40 rounded border border-[var(--border)]" />
          </div>
        </div>
      </section>
    );
  }

  if (user === null) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-white/60 text-center max-w-md">
          Sign in with Discord to view and edit your profile.
        </p>
        <a href={loginUrl()} className="btn btn-primary">
          Sign in with Discord
        </a>
      </section>
    );
  }

  const avatar = userProfileAvatarUrl(
    {
      discordId: user.discordId,
      github: user.github,
      avatarHash: user.avatarHash,
      profileAvatarSource: avatarSource === "auto" ? null : avatarSource,
    },
    128,
  );

  const shownName =
    mergedPublicDisplayName(user.displayName, user.discordUsername) ||
    "Add your name";

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)]">
      <div className="container max-w-5xl grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block lg:sticky lg:top-24 h-fit space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar}
            alt=""
            width={128}
            height={128}
            className="rounded-lg border border-[var(--border)]"
          />
          <div>
            <p className="font-bold text-lg">{shownName}</p>
          </div>
          <p className="text-sm text-[var(--accent)]">
            Rank #{user.rank} · {user.points} XP
          </p>
          <p className="text-xs text-white/45">
            Submissions: {user.stats.submissions} · Articles: {user.stats.blogs} · Votes cast:{" "}
            {user.stats.votesCast}
          </p>
          {user.profileCompletedAt && (
            <p className="text-xs text-white/40">
              Member since {new Date(user.profileCompletedAt).toLocaleDateString()}
            </p>
          )}
          <Link href="/settings/submissions" className="btn text-sm">
            My submissions →
          </Link>
        </aside>

        <div className="space-y-8">
          <div className="lg:hidden rounded border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="flex flex-col items-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar}
                alt=""
                width={72}
                height={72}
                className="rounded-full border border-[var(--border)]"
              />
              <p className="mt-3 text-xl font-bold">{shownName}</p>
              <p className="mt-1 text-sm text-[var(--accent)]">
                Rank #{user.rank} · {user.points} XP
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-2">
                <p className="mono text-[0.65rem] text-white/45">Submissions</p>
                <p className="font-bold text-sm">{user.stats.submissions}</p>
              </div>
              <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-2">
                <p className="mono text-[0.65rem] text-white/45">Articles</p>
                <p className="font-bold text-sm">{user.stats.blogs}</p>
              </div>
              <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-2">
                <p className="mono text-[0.65rem] text-white/45">Votes cast</p>
                <p className="font-bold text-sm">{user.stats.votesCast}</p>
              </div>
              <div className="rounded border border-[var(--border)] bg-[var(--bg)] p-2">
                <p className="mono text-[0.65rem] text-white/45">Member since</p>
                <p className="font-bold text-sm">
                  {user.profileCompletedAt
                    ? new Date(user.profileCompletedAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2">Edit profile</h1>
            {msg && <p className="text-sm text-[var(--success)] mb-2">{msg}</p>}
            {err && <p className="text-sm text-[var(--danger)] mb-2">{err}</p>}
            <p className="text-xs text-white/45 mb-3">
              Shown on the site. First name defaults to your Discord login name; last name is
              optional.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">First name</label>
                <input
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  maxLength={40}
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">
                  Last name <span className="text-white/40">(optional)</span>
                </label>
                <input
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  maxLength={40}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <label className="block text-sm text-white/60 mb-1">Bio</label>
            <textarea
              className="w-full min-h-[120px] rounded border border-[var(--border)] bg-[var(--bg-card)] p-3 text-sm"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
            />
            <label className="block text-sm text-white/60 mt-4 mb-1">GitHub URL or username</label>
            <input
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
            />
            <fieldset className="mt-4 border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-card)]/50">
              <legend className="text-sm text-white/60 px-1">Profile picture</legend>
              <p className="text-xs text-white/40 mb-3">
                Discord updates when you sign in. GitHub uses your profile URL above. If one is missing,
                we use the other.
              </p>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="avatarSource"
                    checked={avatarSource === "auto"}
                    onChange={() => setAvatarSource("auto")}
                  />
                  <span>Auto — GitHub first when linked, else Discord</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="avatarSource"
                    checked={avatarSource === "github"}
                    onChange={() => setAvatarSource("github")}
                  />
                  <span>Always GitHub (if linked)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="avatarSource"
                    checked={avatarSource === "discord"}
                    onChange={() => setAvatarSource("discord")}
                  />
                  <span>Always Discord</span>
                </label>
              </div>
            </fieldset>
            <label className="block text-sm text-white/60 mt-4 mb-1">LinkedIn URL or handle</label>
            <input
              className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
            />
            <label className="block text-sm text-white/60 mt-4 mb-1">Tech stack</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="tag text-xs"
                  onClick={() => setTags((s) => s.filter((x) => x !== t))}
                >
                  {t} ×
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border border-[var(--border)] bg-[var(--bg-card)] p-2 text-sm"
                placeholder="Type a tech, comma or Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button type="button" className="btn text-sm" onClick={addTag}>
                Add
              </button>
            </div>
            <button
              type="button"
              className="btn btn-primary mt-6 w-full sm:w-auto min-h-12"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>

          <div className="border-t border-[var(--border)] mt-10 pt-8">
            <div className="border border-[var(--danger)]/40 rounded p-6 bg-[rgba(237,66,69,0.06)]">
            <h2 className="text-lg font-bold text-[var(--danger)] mb-2">Danger zone</h2>
            <p className="text-sm text-white/60 mb-4">
              Permanently delete your account and all submissions, votes, and enrollments. Type{" "}
              <span className="mono">DELETE</span> to confirm.
            </p>
            <input
              className="w-full max-w-xs rounded border border-[var(--border)] bg-[var(--bg)] p-2 text-sm mb-3"
              value={delConfirm}
              onChange={(e) => setDelConfirm(e.target.value)}
            />
            <button
              type="button"
              className="btn text-sm border-[var(--danger)] text-[var(--danger)]"
              onClick={removeAccount}
              disabled={delConfirm !== "DELETE"}
            >
              Delete my account
            </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
