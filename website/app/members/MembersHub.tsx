"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getMembers,
  getLeaderboard,
  getPortfolio,
  getBlogs,
  formatTechStack,
  githubAvatarUrl,
  discordAvatarUrl,
  type Member,
  type MemberSummary,
  type PortfolioResponse,
  type Submission,
  type Blog,
} from "@/lib/api";
import { ensureAbsoluteUrl, githubProfileHref } from "@/lib/url";
import { HallOfFame } from "@/components/HallOfFame";
import { BlogArticleCard } from "@/components/BlogArticleCard";

type View = "profiles" | "projects" | "articles";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const STAGGER_MS = 0.08;

const XP_TABLE = [
  { action: "Submission approved", xp: 50 },
  { action: "Blog post shared", xp: 10 },
  { action: "Vote received", xp: 2 },
  { action: "GitHub Pulse (max/month)", xp: 100 },
];

function coerceSort(view: View, s: string): string {
  if (view === "profiles") {
    if (["xp", "projects", "recent"].includes(s)) return s;
    return "xp";
  }
  if (view === "projects") {
    if (["votes", "recent"].includes(s)) return s;
    return "votes";
  }
  if (s === "top") return "votes";
  if (s === "new") return "recent";
  if (["votes", "recent"].includes(s)) return s;
  return "recent";
}

export default function MembersHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawView = searchParams.get("view");
  const view: View =
    rawView === "projects" || rawView === "articles" ? rawView : "profiles";
  const q = (searchParams.get("q") ?? "").trim();
  const stackParam = searchParams.get("stack") ?? "";
  const selectedStacks = useMemo(
    () =>
      stackParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [stackParam],
  );
  const track = (searchParams.get("track") ?? "all").toLowerCase();
  const sort = (searchParams.get("sort") ?? "").toLowerCase();

  const [members, setMembers] = useState<Member[]>([]);
  const [leaderboard, setLeaderboard] = useState<MemberSummary[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"leaderboard" | "xp">("leaderboard");
  const [showAllStacks, setShowAllStacks] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      getMembers(),
      getLeaderboard(),
      getPortfolio(),
      getBlogs(),
    ]).then(([m, lb, p, b]) => {
      if (m.status === "fulfilled") setMembers(m.value.members);
      if (lb.status === "fulfilled") setLeaderboard(lb.value.leaderboard);
      if (p.status === "fulfilled") setPortfolio(p.value);
      if (b.status === "fulfilled") setBlogs(b.value.blogs);
      setLoading(false);
    });
  }, []);

  const patchQuery = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === undefined || v === "") p.delete(k);
        else p.set(k, v);
      }
      router.replace(`/members?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setView = (v: View) => {
    const defaults: Record<View, string> = {
      profiles: "xp",
      projects: "votes",
      articles: "recent",
    };
    patchQuery({ view: v, sort: defaults[v] });
  };

  const effectiveSort = coerceSort(view, sort);

  const memberByDiscord = useMemo(() => {
    const map = new Map<string, Member>();
    for (const m of members) map.set(m.discordId, m);
    return map;
  }, [members]);

  const stackCounts = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of members) {
      for (const t of formatTechStack(m.techStack)) {
        const k = t.trim();
        if (!k) continue;
        c.set(k, (c.get(k) ?? 0) + 1);
      }
    }
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [members]);

  const topStacks = showAllStacks ? stackCounts : stackCounts.slice(0, 12);

  const allProjects = useMemo(() => {
    const out: Submission[] = [];
    for (const subs of Object.values(portfolio?.published ?? {})) {
      out.push(...(subs as Submission[]));
    }
    return out;
  }, [portfolio]);

  const stackMatchMember = (m: Member) => {
    if (!selectedStacks.length) return true;
    const set = new Set(formatTechStack(m.techStack).map((t) => t.toLowerCase()));
    return selectedStacks.some((s) => set.has(s.toLowerCase()));
  };

  const stackMatchSubmission = (s: Submission) => {
    if (!selectedStacks.length) return true;
    const set = new Set(
      formatTechStack(s.user.techStack).map((t) => t.toLowerCase()),
    );
    return selectedStacks.some((st) => set.has(st.toLowerCase()));
  };

  const stackMatchBlog = (b: Blog) => {
    if (!selectedStacks.length) return true;
    const author = memberByDiscord.get(b.user.discordId);
    if (!author) return false;
    return stackMatchMember(author);
  };

  const qLower = q.toLowerCase();

  const filteredProfiles = useMemo(() => {
    let list = members.filter(stackMatchMember);
    if (q) {
      list = list.filter((m) => {
        const stack = formatTechStack(m.techStack);
        return (
          m.discordId.toLowerCase().includes(qLower) ||
          (m.bio ?? "").toLowerCase().includes(qLower) ||
          stack.some((t) => t.toLowerCase().includes(qLower))
        );
      });
    }
    if (effectiveSort === "xp") list.sort((a, b) => b.points - a.points);
    else if (effectiveSort === "projects")
      list.sort((a, b) => b._count.submissions - a._count.submissions);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [members, qLower, effectiveSort, selectedStacks]);

  const filteredProjects = useMemo(() => {
    let list = allProjects.filter(stackMatchSubmission);
    if (q) {
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(qLower) ||
          s.description.toLowerCase().includes(qLower),
      );
    }
    if (track === "developer") list = list.filter((s) => (s.track ?? "DEVELOPER") === "DEVELOPER");
    if (track === "hacker") list = list.filter((s) => s.track === "HACKER");
    if (effectiveSort === "votes") list.sort((a, b) => b.votes - a.votes);
    else
      list.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );
    return list;
  }, [allProjects, qLower, effectiveSort, selectedStacks, track]);

  const filteredArticles = useMemo(() => {
    let list = blogs.filter(stackMatchBlog);
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(qLower) ||
          (b.content ?? "").toLowerCase().includes(qLower),
      );
    }
    if (effectiveSort === "votes") list.sort((a, b) => b.upvotes - a.upvotes);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [blogs, qLower, effectiveSort, selectedStacks, memberByDiscord]);

  const toggleStack = (label: string) => {
    const set = new Set(selectedStacks.map((s) => s));
    const key = label;
    if (set.has(key)) set.delete(key);
    else set.add(key);
    const v = [...set].join(",");
    patchQuery({ stack: v || null });
  };

  const top15 = leaderboard.slice(0, 15);
  const maxXp = top15[0]?.points ?? 1;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: STAGGER_MS, delayChildren: 0.06 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
  };

  return (
    <>
      <motion.section
        className="page-header min-h-[min(28dvh,280px)] flex flex-col justify-center"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
      >
        <div className="container w-full">
          <p className="label">Community</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">Members</h1>
          <p className="text-white/60 max-w-2xl text-sm sm:text-base">
            Profiles, shipped projects, and articles — one hub for the community.
          </p>
        </div>
      </motion.section>

      <section className="section pt-4">
        <div className="container w-full">
          <div className="flex flex-wrap gap-2 mb-6">
            {(["profiles", "projects", "articles"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  view === v
                    ? "bg-[var(--accent)] text-black"
                    : "border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {v === "profiles" ? "Profiles" : v === "projects" ? "Projects" : "Articles"}
              </button>
            ))}
          </div>

          <div
            className="sticky z-40 -mx-4 px-4 py-3 mb-6 border-b border-[var(--border)] bg-[rgba(5,5,5,0.92)] backdrop-blur-md supports-[backdrop-filter]:bg-[rgba(5,5,5,0.88)]"
            style={{ top: "3.5rem" }}
          >
            <div className="flex flex-col gap-4">
              <input
                type="search"
                placeholder={
                  view === "profiles"
                    ? "Search name, bio, tech…"
                    : "Search titles…"
                }
                value={q}
                onChange={(e) => patchQuery({ q: e.target.value || null })}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
                style={{ fontFamily: "var(--font-mono)" }}
              />

              <div>
                <p className="mono text-[0.65rem] text-white/40 mb-2 uppercase tracking-wider">
                  Tech stack {selectedStacks.length ? `(OR)` : ""}
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto md:max-h-none">
                  {topStacks.map(([label]) => {
                    const on = selectedStacks.includes(label);
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleStack(label)}
                        className={`tag text-[0.65rem] cursor-pointer transition-colors ${
                          on ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]" : ""
                        }`}
                      >
                        {label}
                        {on && <span className="ml-1 opacity-70">×</span>}
                      </button>
                    );
                  })}
                  {stackCounts.length > 12 && (
                    <button
                      type="button"
                      onClick={() => setShowAllStacks((s) => !s)}
                      className="tag text-[0.65rem] border-dashed"
                    >
                      {showAllStacks ? "Show less" : "Show all"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                {view === "projects" && (
                  <div className="flex rounded border border-[var(--border)] overflow-hidden">
                    {(["all", "developer", "hacker"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => patchQuery({ track: t === "all" ? null : t })}
                        className={`px-3 py-1.5 text-xs font-bold uppercase ${
                          (t === "all" && track === "all") ||
                          track === t ||
                          (t === "all" && !["developer", "hacker"].includes(track))
                            ? "bg-[var(--accent)] text-black"
                            : "bg-[var(--bg-card)] text-[var(--text-dim)]"
                        }`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm text-white/70">
                  <span className="mono text-[0.65rem] uppercase">Sort</span>
                  <select
                    value={effectiveSort}
                    onChange={(e) => patchQuery({ sort: e.target.value })}
                    className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-xs"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {view === "profiles" && (
                      <>
                        <option value="xp">By XP</option>
                        <option value="projects">By Projects</option>
                        <option value="recent">By Recent</option>
                      </>
                    )}
                    {view === "projects" && (
                      <>
                        <option value="votes">By Votes</option>
                        <option value="recent">By Recent</option>
                      </>
                    )}
                    {view === "articles" && (
                      <>
                        <option value="votes">By Votes</option>
                        <option value="recent">By Recent</option>
                      </>
                    )}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-40 rounded bg-white/5" />
              ))}
            </div>
          ) : (
            <div
              className={
                view === "profiles"
                  ? "flex flex-col lg:flex-row gap-6 lg:gap-8"
                  : ""
              }
            >
              <div className={view === "profiles" ? "w-full lg:w-[70%]" : "w-full"}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={view}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {view === "profiles" && (
                      <>
                        {filteredProfiles.length === 0 ? (
                          <div className="empty-state">
                            <p>No members match filters.</p>
                          </div>
                        ) : (
                          <motion.div
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                          >
                            {filteredProfiles.map((m) => {
                              const stack = formatTechStack(m.techStack);
                              const avatar =
                                githubAvatarUrl(m.github) ?? discordAvatarUrl(m.discordId);
                              const gh = githubProfileHref(m.github);
                              const li = ensureAbsoluteUrl(m.linkedin);
                              return (
                                <motion.article
                                  key={m.discordId}
                                  className="card p-4 sm:p-5"
                                  variants={itemVariants}
                                >
                                  <div className="flex items-start gap-3 mb-3">
                                    <img
                                      src={avatar}
                                      alt=""
                                      width={40}
                                      height={40}
                                      className="rounded-full shrink-0 bg-[var(--border)]"
                                      loading="lazy"
                                    />
                                    <div className="min-w-0">
                                      <p className="mono text-xs truncate">
                                        @{m.discordId.slice(-8)}
                                      </p>
                                      <p className="text-[var(--accent)] font-bold text-sm">
                                        {m.points} XP · #{m.rank || "—"}
                                      </p>
                                    </div>
                                  </div>
                                  {m.bio && (
                                    <p className="text-sm text-[var(--text-dim)] mb-3 line-clamp-2">
                                      {m.bio}
                                    </p>
                                  )}
                                  {stack.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                      {stack.slice(0, 4).map((t) => (
                                        <span key={t} className="tag text-[0.65rem]">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    {gh && (
                                      <a
                                        href={gh}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn px-2 py-1 text-[0.65rem]"
                                      >
                                        GitHub
                                      </a>
                                    )}
                                    {li && (
                                      <a
                                        href={li}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn px-2 py-1 text-[0.65rem]"
                                      >
                                        LinkedIn
                                      </a>
                                    )}
                                  </div>
                                </motion.article>
                              );
                            })}
                          </motion.div>
                        )}
                        <HallOfFame portfolio={portfolio} />
                      </>
                    )}

                    {view === "projects" &&
                      (filteredProjects.length === 0 ? (
                        <div className="empty-state">
                          <p>No projects match filters.</p>
                        </div>
                      ) : (
                        <motion.div
                          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {filteredProjects.map((s) => {
                            const stack = formatTechStack(s.user.techStack);
                            const dev = (s.track ?? "DEVELOPER") === "DEVELOPER";
                            return (
                              <motion.article
                                key={s.id}
                                className="card p-4 sm:p-5 flex flex-col"
                                variants={itemVariants}
                              >
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <span className="tag tag-accent text-xs">{s.tier}</span>
                                  <span className="tag text-xs">
                                    {dev ? "Developer" : "Hacker"}
                                  </span>
                                  <span className="mono text-[0.65rem] text-white/45 ml-auto">
                                    {s.month} · ▲ {s.votes}
                                  </span>
                                </div>
                                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                                <p className="text-sm text-white/55 line-clamp-2 mb-3 flex-1">
                                  {s.description}
                                </p>
                                {stack.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {stack.slice(0, 6).map((t) => (
                                      <span key={t} className="tag text-[0.6rem]">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="mono text-[0.65rem] text-white/45 mb-3">
                                  @{s.user.discordId.slice(-8)}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <a
                                    href={s.repoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn text-xs py-1.5"
                                  >
                                    Repo
                                  </a>
                                  {s.demoUrl && (
                                    <a
                                      href={s.demoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn text-xs py-1.5"
                                    >
                                      Demo
                                    </a>
                                  )}
                                </div>
                              </motion.article>
                            );
                          })}
                        </motion.div>
                      ))}

                    {view === "articles" &&
                      (filteredArticles.length === 0 ? (
                        <div className="empty-state">
                          <p>No articles match filters.</p>
                        </div>
                      ) : (
                        <motion.div
                          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                          variants={containerVariants}
                          initial="hidden"
                          animate="visible"
                        >
                          {filteredArticles.map((blog) => (
                            <motion.div
                              key={blog.id}
                              className="h-full"
                              variants={itemVariants}
                            >
                              <BlogArticleCard blog={blog} />
                            </motion.div>
                          ))}
                        </motion.div>
                      ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {view === "profiles" && (
                <div className="w-full lg:w-[30%] lg:sticky lg:top-[6.5rem] lg:self-start">
                  <div className="card overflow-hidden">
                    <div className="flex border-b border-[var(--border)]">
                      {(["leaderboard", "xp"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setSidebarTab(tab)}
                          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider ${
                            sidebarTab === tab
                              ? "bg-[var(--bg)] text-[var(--accent)] border-b-2 border-[var(--accent)]"
                              : "bg-[var(--bg-card)] text-[var(--text-dim)]"
                          }`}
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {tab === "leaderboard" ? "Leaderboard" : "XP Breakdown"}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      {sidebarTab === "leaderboard" ? (
                        <motion.div
                          key="lb"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="p-4"
                        >
                          {top15.length === 0 ? (
                            <p className="mono dim text-xs text-center py-4">No data yet.</p>
                          ) : (
                            <div className="space-y-2.5">
                              {top15.map((m, i) => {
                                const barW =
                                  maxXp > 0 ? Math.round((m.points / maxXp) * 100) : 0;
                                const medals = ["🥇", "🥈", "🥉"];
                                return (
                                  <div key={m.discordId} className="flex items-center gap-2.5">
                                    <span className="w-5 text-center text-xs shrink-0">
                                      {medals[i] ?? (
                                        <span className="mono dim text-[0.65rem]">{i + 1}</span>
                                      )}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="mono text-[0.65rem] truncate mb-0.5">
                                        @{m.discordId.slice(-8)}
                                      </p>
                                      <div className="h-1 rounded-full bg-[var(--border)] overflow-hidden">
                                        <div
                                          className="h-full rounded-full bg-[var(--accent)]"
                                          style={{ width: `${barW}%` }}
                                        />
                                      </div>
                                    </div>
                                    <span className="mono text-[0.65rem] text-[var(--accent)] shrink-0">
                                      {m.points}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="xp"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="p-4"
                        >
                          <table className="w-full text-sm">
                            <tbody>
                              {XP_TABLE.map((row) => (
                                <tr
                                  key={row.action}
                                  className="border-b border-[var(--border)] last:border-0"
                                >
                                  <td className="py-2 text-xs text-white/80">{row.action}</td>
                                  <td className="py-2 text-right mono text-xs text-[var(--accent)] font-bold">
                                    +{row.xp}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
