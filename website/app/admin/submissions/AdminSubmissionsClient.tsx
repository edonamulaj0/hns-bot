"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchAdminSubmissions, patchAdminSubmission } from "@/lib/api-browser";

type Row = {
  id: string;
  title: string;
  description: string;
  track: string;
  tier: string;
  month: string;
  submissionStatus: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  attachmentUrl: string | null;
  author?: string | null;
};

export function AdminSubmissionsClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    fetchAdminSubmissions()
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { submissions?: Row[]; error?: string; message?: string };
        if (!r.ok) {
          setErr(j.message ?? j.error ?? `HTTP ${r.status}`);
          setRows([]);
          return;
        }
        setRows(j.submissions ?? []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    setErr(null);
    const r = await patchAdminSubmission(id, { action });
    const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!r.ok) {
      setErr(j.message ?? j.error ?? `HTTP ${r.status}`);
      return;
    }
    load();
  };

  if (loading) {
    return (
      <section className="section flex min-h-[30vh] items-center justify-center">
        <p className="text-white/50">Loading queue…</p>
      </section>
    );
  }

  if (err) {
    return (
      <section className="section max-w-xl mx-auto px-4 space-y-4">
        <h1 className="text-2xl font-bold">Admin · Submissions</h1>
        <p className="text-[var(--danger)]">{err}</p>
        <Link href="/" className="btn inline-block">
          ← Home
        </Link>
      </section>
    );
  }

  return (
    <section className="section container max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Moderation</p>
          <h1 className="text-2xl font-bold">Pending submissions</h1>
          <p className="text-sm text-white/50 mt-1">Approve to add to the vote pool; reject to send back to the author.</p>
        </div>
        <button type="button" className="btn text-sm" onClick={() => load()}>
          Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <p>No pending submissions.</p>
        </div>
      ) : (
        <ul className="space-y-6">
          {rows.map((s) => (
            <li key={s.id} className="card p-4 sm:p-6 flex flex-col lg:flex-row gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="tag text-xs">{s.track}</span>
                  <span className="tag text-xs">{s.tier}</span>
                  <span className="mono text-xs text-white/40">{s.month}</span>
                </div>
                <h2 className="text-lg font-bold">{s.title}</h2>
                <p className="text-sm text-white/60 line-clamp-4">{s.description}</p>
                <p className="text-xs text-white/40">
                  {s.author ?? "Member"} · <span className="mono">{s.id}</span>
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" className="btn btn-primary text-sm" onClick={() => void act(s.id, "approve")}>
                    Approve
                  </button>
                  <button type="button" className="btn text-sm border-[var(--danger)]/50" onClick={() => void act(s.id, "reject")}>
                    Reject
                  </button>
                </div>
              </div>
              {s.track === "DESIGNERS" && s.attachmentUrl && (
                <div className="shrink-0 w-full lg:w-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.attachmentUrl}
                    alt=""
                    className="w-full max-h-48 rounded border border-[var(--border)] object-contain bg-black/30"
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
