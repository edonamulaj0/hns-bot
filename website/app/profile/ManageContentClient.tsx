"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteBlog, fetchMe, patchBlog, postBlog } from "@/lib/api-browser";
import { getSessionClientWithRetry, loginUrl } from "@/lib/auth-client";

type Item = {
  id: string;
  title: string;
  url: string;
  content?: string | null;
  createdAt?: string;
};

type MePayload = {
  blogs?: Item[];
  projects?: Item[];
};

export function ManageContentClient({
  kind,
  title,
}: {
  kind: "ARTICLE" | "PROJECT";
  title: string;
}) {
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ title: "", url: "", content: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const session = await getSessionClientWithRetry();
        if (!session) {
          if (alive) setNeedsSignIn(true);
          return;
        }
        if (alive) setNeedsSignIn(false);
        const res = await fetchMe();
        if (!res.ok) {
          if (alive) setError("Could not load your content.");
          return;
        }
        const data = (await res.json()) as MePayload;
        if (!alive) return;
        setItems(kind === "ARTICLE" ? data.blogs ?? [] : data.projects ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [kind]);

  const submitLabel = useMemo(
    () => (editId ? `Save ${kind === "ARTICLE" ? "article" : "project"}` : `Add ${kind === "ARTICLE" ? "article" : "project"}`),
    [editId, kind],
  );

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        url: form.url,
        content: form.content || null,
      };
      if (editId) {
        const res = await patchBlog(editId, payload);
        if (!res.ok) {
          setError("Could not save changes.");
          return;
        }
        setItems((prev) => prev.map((x) => (x.id === editId ? { ...x, ...payload } : x)));
      } else {
        const res = await postBlog({ kind, ...payload });
        if (!res.ok) {
          setError("Could not add item.");
          return;
        }
        const j = (await res.json()) as { blog?: Item };
        const created = j.blog;
        if (created) setItems((prev) => [created, ...prev]);
      }
      setEditId(null);
      setForm({ title: "", url: "", content: "" });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      url: item.url,
      content: item.content ?? "",
    });
  };

  const remove = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await deleteBlog(id);
      if (!res.ok) {
        setError("Could not delete item.");
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (editId === id) {
        setEditId(null);
        setForm({ title: "", url: "", content: "" });
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="section px-[clamp(1rem,4vw,2rem)]">
        <div className="container max-w-4xl space-y-3">
          <div className="skeleton h-10 w-full rounded" aria-hidden="true" />
          <div className="skeleton h-32 w-full rounded" aria-hidden="true" />
        </div>
      </section>
    );
  }

  if (needsSignIn) {
    return (
      <section className="section flex min-h-[40vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <a href={loginUrl()} className="btn btn-primary">Sign in with Discord</a>
      </section>
    );
  }

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)]">
      <div className="container max-w-4xl space-y-5">
        <Link href="/profile" className="btn text-sm inline-flex">← Profile</Link>
        <h1 className="text-3xl font-bold">{title}</h1>
        <div className="card p-4 sm:p-5 space-y-3">
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <input
            className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
            placeholder={kind === "ARTICLE" ? "Article URL" : "Project URL / repo URL"}
            value={form.url}
            onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
          />
          <textarea
            className="w-full min-h-[120px] rounded border border-[var(--border)] bg-[var(--bg-card)] p-2.5 text-sm"
            placeholder="Markdown description (optional)"
            value={form.content}
            onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
          />
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onSubmit}>
              {submitLabel}
            </button>
            {editId && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setEditId(null);
                  setForm({ title: "", url: "", content: "" });
                }}
              >
                Cancel
              </button>
            )}
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </div>

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="empty-state">
              <p>{kind === "ARTICLE" ? "No articles yet." : "No projects yet."}</p>
            </div>
          ) : (
            items.map((item) => (
              <article key={item.id} className="card p-4 sm:p-5">
                <h2 className="text-lg font-bold">{item.title}</h2>
                {item.content?.trim() ? (
                  <p className="text-sm text-white/60 mt-2 line-clamp-3">{item.content}</p>
                ) : null}
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn text-xs mt-3">
                  Open →
                </a>
                <div className="mt-3 flex gap-2 border-t border-[var(--border)] pt-3">
                  <button type="button" className="btn p-2" onClick={() => startEdit(item)}>Edit</button>
                  <button type="button" className="btn p-2" onClick={() => remove(item.id)}>Delete</button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
