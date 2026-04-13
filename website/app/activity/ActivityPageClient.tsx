"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPortfolio, getBlogs, type Blog, type PortfolioResponse } from "@/lib/api";
import { mergeActivityFeedItems } from "@/lib/activity-feed";
import { ActivityFeedList } from "@/components/ActivityTimeline";
import { BlogArticleCard } from "@/components/BlogArticleCard";

const PAGE = 50;

export default function ActivityPageClient() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [articleSort, setArticleSort] = useState<"new" | "top">("new");

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([getPortfolio(), getBlogs()])
      .then(([p, b]) => {
        if (p.status === "fulfilled") setPortfolio(p.value);
        else setErr("Could not load activity.");
        if (b.status === "fulfilled") setBlogs(b.value.blogs);
        setLoading(false);
      })
      .catch(() => {
        setErr("Could not load activity.");
        setLoading(false);
      });
  }, []);

  const feed = useMemo(
    () => mergeActivityFeedItems(portfolio, blogs),
    [portfolio, blogs],
  );

  const slice = feed.slice(0, visible);
  const sortedArticles = useMemo(() => {
    const copy = [...blogs];
    if (articleSort === "top") copy.sort((a, b) => b.upvotes - a.upvotes);
    else copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copy;
  }, [blogs, articleSort]);

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
          ) : slice.length === 0 ? (
            <div
              style={{
                padding: "3rem 1rem",
                textAlign: "center",
                border: "1px dashed var(--border-bright)",
                borderRadius: "2px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-dim)",
                }}
              >
                No activity yet — the feed populates when members submit projects and share articles.
              </p>
              <Link
                href="/join"
                className="btn btn-primary"
                style={{ marginTop: "1rem", display: "inline-flex" }}
              >
                Join and be the first →
              </Link>
            </div>
          ) : (
            <>
              <ActivityFeedList items={slice} />
              {visible < feed.length && (
                <button
                  type="button"
                  className="btn mt-6 w-full sm:w-auto"
                  onClick={() => setVisible((v) => v + PAGE)}
                >
                  Load more
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
            <div
              style={{
                padding: "3rem 1rem",
                textAlign: "center",
                border: "1px dashed var(--border-bright)",
                borderRadius: "2px",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-dim)",
                }}
              >
                No articles shared yet. Members can share articles from the activity feed once they&apos;re signed in.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedArticles.map((blog) => (
                <BlogArticleCard key={blog.id} blog={blog} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
