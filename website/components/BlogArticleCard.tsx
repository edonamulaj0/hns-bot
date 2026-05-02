"use client";

import Link from "next/link";
import type { Blog } from "@/lib/api";
import { memberDisplayName } from "@/lib/member-label";
import { formatFeedTime } from "@/lib/relative-time";

export function articleBadge(blog: Blog): "Medium" | "Story" | "External" {
  if (blog.content?.trim()) return "Story";
  const u = blog.url?.toLowerCase() ?? "";
  if (u.includes("medium.com")) return "Medium";
  return "External";
}

export function articleExcerpt(blog: Blog): string | null {
  const c = blog.content?.trim();
  if (!c) return null;
  const n = c.replace(/\s+/g, " ").slice(0, 200);
  return n.length < c.length ? `${n}…` : n;
}

export function BlogArticleCard({
  blog,
  liked = false,
  onLikeToggle,
}: {
  blog: Blog;
  liked?: boolean;
  onLikeToggle?: (blogId: string) => void;
}) {
  const badge = articleBadge(blog);
  const excerpt = articleExcerpt(blog);
  const canLike = blog.kind === "ARTICLE" && typeof onLikeToggle === "function";
  const articleHref = `/articles/${blog.id}`;

  return (
    <article className="card relative flex flex-col h-full overflow-hidden p-4 sm:p-5">
      <Link
        href={articleHref}
        className="absolute inset-0 z-[1] rounded-[inherit] outline-none ring-offset-2 ring-offset-[var(--bg-card)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        aria-label={`Open article: ${blog.title}`}
      />
      <div className="relative z-[2] flex flex-col flex-1 min-h-0 pointer-events-none">
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="tag text-[0.6rem]">{badge}</span>
        </div>
        <h3 className="font-bold text-lg mb-2 leading-tight">{blog.title}</h3>
        {excerpt && (
          <p className="text-xs text-white/50 line-clamp-3 mb-3 flex-1">{excerpt}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border)]">
          <span className="mono text-[0.65rem] text-white/50">
            {memberDisplayName(blog.user)}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {blog.createdAt && (
              <span className="mono text-[0.6rem] text-white/35">{formatFeedTime(blog.createdAt)}</span>
            )}
            <span className="mono text-[0.65rem] text-white/45">👁 {blog.views ?? 0}</span>
            {canLike ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onLikeToggle!(blog.id);
                }}
                className={`pointer-events-auto mono text-[0.65rem] rounded border px-2 py-1 min-h-[44px] sm:min-h-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  liked
                    ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] text-white/60 hover:text-white/90"
                }`}
              >
                ▲ {blog.upvotes}
              </button>
            ) : (
              <span className="mono text-[0.65rem] text-[var(--accent)]">▲ {blog.upvotes}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
