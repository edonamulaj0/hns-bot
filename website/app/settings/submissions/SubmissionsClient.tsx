"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { browserApiUrl, deleteSubmit, fetchMe, patchSubmit } from "@/lib/api-browser";
import { getSessionClientWithRetry, loginUrl } from "@/lib/auth-client";
import type { PortfolioResponse } from "@/lib/api";

type MePayload = {
  user: { discordId: string };
  submission: SubmissionItem | null;
  submissions?: SubmissionItem[];
};

type SubmissionItem = {
  id: string;
  month: string;
  tier: string;
  track?: string;
  title: string;
  description: string;
  repoUrl: string;
  demoUrl: string | null;
  attachmentUrl?: string | null;
  votes: number;
  isApproved?: boolean;
  isLocked?: boolean;
  createdAt?: string;
  user?: { discordId: string };
};

type EditDraft = {
  title: string;
  description: string;
  repoUrl: string;
  demoUrl: string;
  attachmentUrl: string;
};

export function SubmissionsClient({ backHref = "/profile" }: { backHref?: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteSecondStep, setDeleteSecondStep] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authIssue, setAuthIssue] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const session = await getSessionClientWithRetry();
        if (!session) {
          if (alive) {
            setAuthIssue(null);
            setNeedsSignIn(true);
          }
          return;
        }
        if (alive) setNeedsSignIn(false);
        const meRes = await fetchMe();
        if (!meRes.ok) {
          if (alive) {
            setAuthIssue(
              "You're signed in, but your app session could not be verified. Try signing out and signing in again.",
            );
          }
          return;
        }
        if (alive) setAuthIssue(null);
        const me = (await meRes.json()) as MePayload;
        let sorted: SubmissionItem[];

        if (Array.isArray(me.submissions) && me.submissions.length > 0) {
          sorted = [...me.submissions].map((s) => ({
            ...s,
            user: { discordId: me.user.discordId },
          }));
          sorted.sort((a, b) => {
            if (a.month !== b.month) return b.month.localeCompare(a.month);
            return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
          });
        } else {
          const portfolioRes = await fetch(browserApiUrl("/portfolio"), { cache: "no-store" });
          const portfolio = portfolioRes.ok ? ((await portfolioRes.json()) as PortfolioResponse) : null;
          const fromPortfolio = Object.values(portfolio?.published ?? {})
            .flatMap((arr) => arr as SubmissionItem[])
            .filter((s) => s.user?.discordId === me.user.discordId)
            .map((s) => ({ ...s, isApproved: true }));
          const combined: SubmissionItem[] = [...fromPortfolio];
          if (me.submission) combined.push(me.submission);
          const deduped = new Map<string, SubmissionItem>();
          for (const s of combined) deduped.set(s.id, s);
          sorted = [...deduped.values()].sort((a, b) => {
            if (a.month !== b.month) return b.month.localeCompare(a.month);
            return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
          });
        }
        if (alive) setItems(sorted);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  const empty = useMemo(
    () => !loading && !needsSignIn && !authIssue && items.length === 0,
    [loading, needsSignIn, authIssue, items.length],
  );

  const startEdit = (s: SubmissionItem) => {
    setEditId(s.id);
    setEditDraft({
      title: s.title,
      description: s.description,
      repoUrl: s.repoUrl,
      demoUrl: s.demoUrl ?? "",
      attachmentUrl: s.attachmentUrl ?? "",
    });
    setError(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await patchSubmit(id, {
        title: editDraft.title,
        description: editDraft.description,
        repoUrl: editDraft.repoUrl,
        demoUrl: editDraft.demoUrl || null,
        attachmentUrl: editDraft.attachmentUrl || null,
      });
      if (!res.ok) {
        setError("Could not save changes.");
        return;
      }
      setItems((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                title: editDraft.title,
                description: editDraft.description,
                repoUrl: editDraft.repoUrl,
                demoUrl: editDraft.demoUrl || null,
                attachmentUrl: editDraft.attachmentUrl || null,
              }
            : s,
        ),
      );
      setEditId(null);
      setEditDraft(null);
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async (id: string) => {
    if (!deleteSecondStep) {
      setDeleteSecondStep(true);
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await deleteSubmit(id);
      if (!res.ok) {
        setError("Could not delete submission.");
        return;
      }
      setItems((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirmId(null);
      setDeleteSecondStep(false);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)]">
      <div className="container max-w-4xl">
        <div className="mb-6">
          <Link href={backHref} className="btn text-sm mb-3 inline-flex">
            ← Profile
          </Link>
          <h1 className="text-3xl font-bold">My Submissions</h1>
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="skeleton h-36 rounded" />
            <div className="skeleton h-36 rounded" />
          </div>
        )}

        {!loading && needsSignIn && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-8 text-center">
            {authIssue && <p className="text-sm text-[var(--danger)] max-w-md">{authIssue}</p>}
            <a href={loginUrl()} className="btn btn-primary">
              Sign in to view submissions
            </a>
          </div>
        )}

        {empty && (
          <div className="empty-state">
            <p>No submissions yet. Enroll in a challenge and submit your work.</p>
          </div>
        )}

        {error && <p className="text-sm text-[var(--danger)] mb-3">{error}</p>}
        {authIssue && <p className="text-sm text-[var(--danger)] mb-3">{authIssue}</p>}

        <AnimatePresence>
          {items.map((s) => {
            const editable = !s.isLocked;
            const approved = Boolean(s.isApproved);
            const isEditing = editId === s.id;
            const isExpanded = expanded[s.id] ?? false;
            const confirmingDelete = deleteConfirmId === s.id;
            return (
              <motion.article
                key={s.id}
                className="card p-4 sm:p-5 mb-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="tag">{s.month}</span>
                  <span className="tag tag-accent">{s.tier}</span>
                  <span className="tag">{(s.track ?? "DEVELOPER").toLowerCase()}</span>
                </div>

                <h2 className="text-xl font-bold mb-2">{s.title}</h2>

                <p className={`text-sm text-white/60 ${isExpanded ? "" : "line-clamp-2"}`}>
                  {s.description}
                </p>
                <button
                  type="button"
                  className="mono text-[0.7rem] text-[var(--accent)] mt-1"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [s.id]: !isExpanded }))
                  }
                >
                  {isExpanded ? "Show less" : "Show more"}
                </button>

                <div className="mt-3 text-sm">
                  {approved ? (
                    <span className="text-green-400">Approved ✓</span>
                  ) : s.isLocked ? (
                    <span className="text-white/45">Locked 🔒</span>
                  ) : (
                    <span className="text-white/45">Pending</span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={s.repoUrl} target="_blank" rel="noopener noreferrer" className="btn text-xs py-1.5">
                    Repo
                  </a>
                  {s.demoUrl && (
                    <a href={s.demoUrl} target="_blank" rel="noopener noreferrer" className="btn text-xs py-1.5">
                      Demo
                    </a>
                  )}
                </div>

                <div className="mt-4 border-t border-[var(--border)] pt-3 flex gap-2">
                  {editable ? (
                    <button
                      type="button"
                      className="btn p-2"
                      onClick={() => startEdit(s)}
                      aria-label="Edit"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn p-2 opacity-40 cursor-not-allowed"
                      disabled
                      title={s.isLocked ? "This submission is locked" : "Editing unavailable"}
                      aria-label="Edit disabled"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn p-2"
                    onClick={() => {
                      setDeleteConfirmId(s.id);
                      setDeleteSecondStep(false);
                    }}
                    aria-label="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>

                {isEditing && editDraft && (
                  <div className="mt-4 border-t border-[var(--border)] pt-4 space-y-3">
                    <input
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
                      value={editDraft.title}
                      onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                      placeholder="Title"
                    />
                    <textarea
                      className="w-full min-h-[120px] rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
                      value={editDraft.description}
                      onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                      placeholder="Description"
                    />
                    <input
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
                      value={editDraft.repoUrl}
                      onChange={(e) => setEditDraft({ ...editDraft, repoUrl: e.target.value })}
                      placeholder="Repo URL"
                    />
                    <input
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
                      value={editDraft.demoUrl}
                      onChange={(e) => setEditDraft({ ...editDraft, demoUrl: e.target.value })}
                      placeholder="Demo URL"
                    />
                    <input
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
                      value={editDraft.attachmentUrl}
                      onChange={(e) => setEditDraft({ ...editDraft, attachmentUrl: e.target.value })}
                      placeholder="Attachment URL"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => saveEdit(s.id)}
                        disabled={busyId === s.id}
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditId(null);
                          setEditDraft(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {confirmingDelete && (
                  <div
                    className="mt-4 rounded p-4"
                    style={{
                      background: "rgba(237, 66, 69, 0.06)",
                      border: "1px solid rgba(237, 66, 69, 0.3)",
                    }}
                  >
                    <p className="text-sm text-white/75 leading-relaxed">
                      Are you sure you want to delete "{s.title}"? This removes your submission,
                      votes received, and XP earned from this submission.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn flex-1 justify-center"
                        onClick={() => {
                          setDeleteConfirmId(null);
                          setDeleteSecondStep(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn flex-1 justify-center"
                        style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
                        onClick={() => confirmDelete(s.id)}
                        disabled={busyId === s.id}
                      >
                        {busyId === s.id
                          ? "Deleting..."
                          : deleteSecondStep
                            ? "Delete"
                            : "Click again to confirm"}
                      </button>
                    </div>
                  </div>
                )}
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
