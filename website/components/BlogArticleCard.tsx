"use client";

import type { Blog } from "@/lib/api";
import { memberDisplayName } from "@/lib/member-label";
import { formatFeedTime } from "@/lib/relative-time";

export function articleBadge(blog: Blog): "Medium" | "Uploaded" | "External" {
  if (blog.content?.trim()) return "Uploaded";
  const u = blog.url.toLowerCase();
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
  const uploaded = Boolean(blog.content?.trim());
  const canLike = blog.kind === "ARTICLE" && typeof onLikeToggle === "function";
  return (
    <article className="card p-4 sm:p-5 flex flex-col h-full">
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="tag text-[0.6rem]">{badge}</span>
        {uploaded && (
          <span className="tag text-[0.6rem] border-[var(--accent)]/40">Markdown</span>
        )}
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
              onClick={() => onLikeToggle!(blog.id)}
              className={`mono text-[0.65rem] rounded border px-2 py-1 min-h-[44px] sm:min-h-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
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
      <a
        href={blog.viewUrl ?? blog.url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn text-xs mt-3 w-fit"
      >
        {uploaded ? "Read" : "Open article →"}
      </a>
    </article>
  );
}
