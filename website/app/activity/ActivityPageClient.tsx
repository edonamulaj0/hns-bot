"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getBlogs, type Blog } from "@/lib/api";
import {
  fetchActivitySubmissions,
  fetchMyBlogLikes,
  postBlogLike,
} from "@/lib/api-browser";
import type { ActivityApiSubmission } from "@/lib/activity-feed";
import { mergeActivityFeedItems } from "@/lib/activity-feed";
import { ActivityFeedList } from "@/components/ActivityTimeline";
import { BlogArticleCard } from "@/components/BlogArticleCard";

const SUB_PAGE = 20;

export default function ActivityPageClient() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [activitySubs, setActivitySubs] = useState<ActivityApiSubmission[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [articleSort, setArticleSort] = useState<"new" | "top">("new");
  const [likedBlogIds, setLikedBlogIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      const [bRes, actRes, likesRes] = await Promise.allSettled([
        getBlogs(),
        fetchActivitySubmissions(SUB_PAGE, 0),
        fetchMyBlogLikes(),
      ]);
      if (cancelled) return;
      if (bRes.status === "fulfilled") setBlogs(bRes.value.blogs);
      if (actRes.status === "fulfilled") {
        try {
          const j = (await actRes.value.json()) as {
            submissions?: ActivityApiSubmission[];
            total?: number;
          };
          setActivitySubs(j.submissions ?? []);
          setActivityTotal(typeof j.total === "number" ? j.total : 0);
        } catch {
          /* ignore */
        }
      }
      if (likesRes.status === "fulfilled" && likesRes.value.ok) {
        try {
          const j = (await likesRes.value.json()) as { likedBlogIds?: string[] };
          setLikedBlogIds(new Set(j.likedBlogIds ?? []));
        } catch {
          /* ignore */
        }
      }
      if (bRes.status !== "fulfilled" && actRes.status !== "fulfilled") {
        setErr("Could not load activity.");
      }
      setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setErr("Could not load activity.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMoreSubmissions = useCallback(() => {
    const offset = activitySubs.length;
    if (offset >= activityTotal) return;
    fetchActivitySubmissions(SUB_PAGE, offset)
      .then(async (r) => {
        if (!r.ok) return;
        const j = (await r.json()) as {
          submissions?: ActivityApiSubmission[];
          total?: number;
        };
        setActivitySubs((prev) => [...prev, ...(j.submissions ?? [])]);
        if (typeof j.total === "number") setActivityTotal(j.total);
      })
      .catch(() => {});
  }, [activitySubs.length, activityTotal]);

  const handleBlogLikeToggle = useCallback(async (blogId: string) => {
    const r = await postBlogLike(blogId);
    if (!r.ok) return;
    const j = (await r.json()) as { liked?: boolean; upvotes?: number };
    setLikedBlogIds((prev) => {
      const next = new Set(prev);
      if (j.liked) next.add(blogId);
      else next.delete(blogId);
      return next;
    });
    if (typeof j.upvotes === "number") {
      setBlogs((prev) =>
        prev.map((b) => (b.id === blogId ? { ...b, upvotes: j.upvotes! } : b)),
      );
    }
  }, []);

  const feed = useMemo(
    () => mergeActivityFeedItems(activitySubs, blogs),
    [activitySubs, blogs],
  );
  const sortedArticles = useMemo(() => {
    const copy = [...blogs];
    if (articleSort === "top") copy.sort((a, b) => b.upvotes - a.upvotes);
    else copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copy;
  }, [blogs, articleSort]);

  const canLoadMoreSubs = activitySubs.length < activityTotal;

  return (
    <>
      <section className="page-header min-h-[min(28dvh,280px)] flex flex-col justify-center">
        <div className="container w-full">
          <p className="label">Community</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">Activity</h1>
          <p className="text-white/60 max-w-2xl text-sm sm:text-base">
            Submissions, articles, and milestones — everything happening across H4ck&Stack.
          </p>
        </div>
      </section>

      <section className="section pt-4">
        <div className="container max-w-3xl w-full">
          <h2 className="text-xl font-bold mb-6">Activity feed</h2>
          {loading ? (
            <div className="space-y-3 animate-pulse border-l-2 border-[var(--border)] ml-3 pl-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded" />
              ))}
            </div>
          ) : err ? (
            <div className="empty-state">
              <p>{err}</p>
            </div>
          ) : feed.length === 0 ? (
            <div className="empty-state max-w-2xl mx-auto">
              <p className="max-w-md mx-auto">
                No activity yet — the feed fills in when members publish submissions and share articles on the site.
              </p>
              <Link href="/join" className="btn btn-primary mt-4 inline-flex">
                Join and be the first →
              </Link>
            </div>
          ) : (
            <>
              <ActivityFeedList items={feed} />
              {canLoadMoreSubs && (
                <button
                  type="button"
                  className="btn mt-6 w-full sm:w-auto"
                  onClick={loadMoreSubmissions}
                >
                  Load more submissions
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <section className="section border-t border-[var(--border)]">
        <div className="container w-full">
          <div className="h-px bg-[var(--border)] mb-12 max-w-3xl mx-auto md:mx-0" aria-hidden />

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Community Writing</h2>
              <p className="text-sm text-white/50 mt-2">
                Article links shared by the community appear here. Ask in Discord if you would like yours listed.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <span className="mono text-[0.65rem] uppercase">Sort</span>
              <select
                value={articleSort}
                onChange={(e) => setArticleSort(e.target.value as "new" | "top")}
                className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-xs mono"
              >
                <option value="new">New</option>
                <option value="top">Top</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded bg-white/5" />
              ))}
            </div>
          ) : sortedArticles.length === 0 ? (
            <div className="empty-state max-w-2xl mx-auto">
              <p className="max-w-md mx-auto">
                No articles here yet. Signed-in members can share links from the site; ask in Discord if you want yours
                listed.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link href="/join" className="btn btn-primary inline-flex">
                  Join the community →
                </Link>
                <Link href="/members?view=articles" className="btn inline-flex">
                  Browse articles →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedArticles.map((blog) => (
                <BlogArticleCard
                  key={blog.id}
                  blog={blog}
                  liked={likedBlogIds.has(blog.id)}
                  onLikeToggle={handleBlogLikeToggle}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
