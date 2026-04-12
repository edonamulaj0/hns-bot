"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { getBlogs, type Blog } from "@/lib/api";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const STAGGER_MS = 0.08;

function hasUploadedContent(b: Blog): boolean {
  return Boolean(b.content?.trim());
}

/** First ~200 chars for card preview when API returned truncated `content`. */
function blogCardExcerpt(b: Blog): string | null {
  const raw = b.content?.trim();
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, " ");
  if (normalized.length <= 200) return normalized;
  return `${normalized.slice(0, 200)}…`;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function EmptyIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto mb-4 w-40 opacity-40"
    >
      <rect x="30" y="20" width="140" height="100" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <line x1="50" y1="45" x2="150" y2="45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="50" y1="60" x2="130" y2="60" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="50" y1="72" x2="140" y2="72" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="50" y1="84" x2="110" y2="84" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <circle cx="160" cy="30" r="12" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6" />
      <path d="M156 30l3 3 5-6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <rect x="45" y="95" width="30" height="12" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"new" | "top">("new");

  useEffect(() => {
    getBlogs()
      .then((data) => setBlogs(data.blogs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...blogs];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.user.discordId.toLowerCase().includes(q) ||
          (b.content ?? "").toLowerCase().includes(q),
      );
    }

    if (sortBy === "top") {
      list.sort((a, b) => b.upvotes - a.upvotes);
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return list;
  }, [blogs, search, sortBy]);

  const hero = filtered[0] ?? null;
  const rest = filtered.slice(1);
  const heroExcerpt = hero ? blogCardExcerpt(hero) : null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: STAGGER_MS, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
  };

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.section
        className="page-header min-h-[min(30dvh,320px)] flex flex-col justify-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <div className="container w-full">
          <p className="label">Writing</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">Blog</h1>
          <p className="text-white/60 max-w-2xl text-sm sm:text-base">
            Articles shared by the community via{" "}
            <code className="mono text-[var(--accent)]">/share-blog</code>.
            Read, learn, and get inspired.
          </p>
        </div>
      </motion.section>

      <section className="section">
        <div className="container w-full">
          {loading ? (
            <div className="text-center py-12">
              <p className="mono dim text-sm">Loading articles…</p>
            </div>
          ) : blogs.length === 0 ? (
            <div className="empty-state py-16">
              <EmptyIllustration />
              <p className="mb-1">No blog posts yet.</p>
              <p className="text-[var(--text-dimmer)] text-xs">
                Share one from Discord with <code className="mono">/share-blog</code> to populate this page.
              </p>
            </div>
          ) : (
            <>
              {/* ── Hero post ──────────────────────────────────────────── */}
              {hero && (
                <motion.a
                  href={hero.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-lift block p-6 sm:p-8 mb-8 no-underline text-[var(--text)]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="tag tag-accent text-[0.65rem]">Featured</span>
                    {hasUploadedContent(hero) && (
                      <span className="tag text-[0.65rem] border border-[var(--border)] bg-transparent text-white/70">
                        Markdown
                      </span>
                    )}
                    {hero.createdAt && (
                      <span className="mono dim text-[0.65rem]">{relativeTime(hero.createdAt)}</span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight">
                    {hero.title}
                  </h2>
                  {heroExcerpt && (
                    <p className="text-sm text-white/55 mb-4 leading-relaxed line-clamp-4">
                      {heroExcerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="mono text-xs text-white/60">
                      @{hero.user.discordId.slice(-8)}
                    </span>
                    <span className="mono text-xs text-[var(--accent)] font-bold">
                      ▲ {hero.upvotes}
                    </span>
                    <span className="mono text-xs text-white/40 ml-auto">
                      {hasUploadedContent(hero) ? "Read" : "↗ Read article"}
                    </span>
                  </div>
                </motion.a>
              )}

              {/* ── Filter bar ─────────────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Filter by title or author…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 rounded border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-dimmer)] outline-none transition-colors focus:border-[var(--accent)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
                <div className="flex rounded border border-[var(--border)] overflow-hidden shrink-0">
                  {(["new", "top"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSortBy(mode)}
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                        sortBy === mode
                          ? "bg-[var(--accent)] text-black"
                          : "bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text)]"
                      }`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {mode === "new" ? "New" : "Top"}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Article grid ───────────────────────────────────────── */}
              {rest.length === 0 && search ? (
                <div className="empty-state py-8">
                  <p>No articles match your filter.</p>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  key={`${search}-${sortBy}`}
                >
                  {rest.map((blog) => {
                    const excerpt = blogCardExcerpt(blog);
                    const uploaded = hasUploadedContent(blog);
                    return (
                    <motion.a
                      key={blog.id}
                      href={blog.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card card-lift p-4 sm:p-5 no-underline text-[var(--text)] flex flex-col"
                      variants={itemVariants}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {uploaded && (
                          <span className="tag text-[0.6rem] border border-[var(--border)] bg-transparent text-white/70 shrink-0">
                            Markdown
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold mb-2 leading-tight flex-1">
                        {blog.title}
                      </h3>
                      {excerpt && (
                        <p className="text-xs text-white/50 mb-3 leading-relaxed line-clamp-3">
                          {excerpt}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--border)] mt-auto">
                        <span className="mono text-[0.65rem] text-white/60">
                          @{blog.user.discordId.slice(-8)}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="mono text-[0.65rem] text-[var(--accent)]">
                            ▲ {blog.upvotes}
                          </span>
                          {blog.createdAt && (
                            <span className="mono text-[0.6rem] text-white/40">
                              {relativeTime(blog.createdAt)}
                            </span>
                          )}
                          <span className="mono text-[0.6rem] text-white/40">
                            {uploaded ? "Read" : "↗ Read article"}
                          </span>
                        </div>
                      </div>
                    </motion.a>
                    );
                  })}
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
