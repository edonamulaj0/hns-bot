"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getBlogs,
  getPortfolio,
  formatTechStack,
  userProfileAvatarUrl,
  type Member,
  type MemberSummary,
  type PortfolioResponse,
  type Submission,
  type Blog,
} from "@/lib/api";
import { ensureAbsoluteUrl, githubProfileHref } from "@/lib/url";
import { HallOfFame } from "@/components/HallOfFame";
import { BlogArticleCard } from "@/components/BlogArticleCard";
import { memberDisplayName } from "@/lib/member-label";

type View = "profiles" | "projects" | "articles";

const XP_TABLE = [
  { action: "Submission approved", xp: 50, note: "Per submission" },
  { action: "Vote received", xp: 2, note: "Per vote on your work" },
  { action: "Article shared", xp: 10, note: "Per article" },
  { action: "/pulse (Discord)", xp: "Up to 100", note: "GitHub activity XP, once per UTC month" },
  { action: "Challenge enrollment bonus", xp: 25, note: "On first approval" },
  { action: "First submission ever", xp: 10, note: "One-time bonus" },
];

const ROLE_TABLE = [
  { role: "🌱 Newcomer", range: "0–99 XP", color: "#888888" },
  { role: "⚡ Builder", range: "100–499 XP", color: "#57f287" },
  { role: "🔥 Veteran", range: "500–1499 XP", color: "#f59e0b" },
  { role: "💎 Elite", range: "1500+ XP", color: "#CCFF00" },
];

function coerceSort(view: View, s: string): string {
  if (view === "profiles") {
    if (["xp", "projects", "recent", "name"].includes(s)) return s;
    return "xp";
  }
  if (view === "projects") {
    if (["votes", "recent"].includes(s)) return s;
    return "votes";
  }
  if (s === "top") return "top";
  if (s === "new") return "recent";
  if (["top", "recent"].includes(s)) return s;
  return "recent";
}

type MembersHubProps = {
  initialMembers: Member[];
  initialLeaderboard: MemberSummary[];
};

export default function MembersHub({
  initialMembers,
  initialLeaderboard,
}: MembersHubProps) {
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

  const members = initialMembers;
  const [leaderboard] = useState<MemberSummary[]>(initialLeaderboard);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"leaderboard" | "xp">("leaderboard");
  const [showAllStacks, setShowAllStacks] = useState(false);
  /** Mobile only: hide tech tag row while scrolling down; expand on scroll up, near top, or tap. */
  const [mobileTechStackCollapsed, setMobileTechStackCollapsed] = useState(false);
  const lastScrollYRef = useRef(0);
  const mobileTechStackCollapsedRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    const mdMq = window.matchMedia("(min-width: 768px)");
    const setCollapsed = (next: boolean) => {
      if (mobileTechStackCollapsedRef.current === next) return;
      mobileTechStackCollapsedRef.current = next;
      setMobileTechStackCollapsed(next);
    };
    const updateFromScroll = () => {
      scrollRafRef.current = null;
      if (mdMq.matches) {
        setCollapsed(false);
        return;
      }
      const y = window.scrollY;
      const last = lastScrollYRef.current;
      const delta = y - last;
      lastScrollYRef.current = y;
      if (y < 56) {
        setCollapsed(false);
        return;
      }
      if (delta > 8) setCollapsed(true);
      else if (delta < -10) setCollapsed(false);
    };
    const onScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(updateFromScroll);
    };

    const onMdChange = () => {
      if (mdMq.matches) setCollapsed(false);
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    mdMq.addEventListener("change", onMdChange);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mdMq.removeEventListener("change", onMdChange);
      if (scrollRafRef.current !== null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDynamicMembersData() {
      setError(null);
      try {
        const [portfolioRes, blogsRes] = await Promise.all([
          getPortfolio(),
          getBlogs(),
        ]);
        if (cancelled) return;
        setPortfolio(portfolioRes);
        setBlogs(blogsRes.blogs);
      } catch {
        if (!cancelled) {
          setError("Live member data is temporarily unavailable. Try again shortly.");
        }
      }
    }

    void loadDynamicMembersData();
    return () => {
      cancelled = true;
    };
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
          (m.displayName ?? "").toLowerCase().includes(qLower) ||
          (m.bio ?? "").toLowerCase().includes(qLower) ||
          stack.some((t) => t.toLowerCase().includes(qLower))
        );
      });
    }
    if (effectiveSort === "name")
      list.sort((a, b) =>
        (memberDisplayName(a) || "").localeCompare(memberDisplayName(b) || "", undefined, {
          sensitivity: "base",
        }),
      );
    else if (effectiveSort === "xp")
      list.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
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
    if (track === "designer") list = list.filter((s) => s.track === "DESIGNERS");
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
    if (effectiveSort === "top") list.sort((a, b) => b.upvotes - a.upvotes);
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

  return (
    <>
      <section
        className="page-header min-h-[min(28dvh,280px)] flex flex-col justify-center"
      >
        <div className="container w-full">
          <p className="label">Community</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">Members</h1>
          <p className="text-white/60 max-w-2xl text-sm sm:text-base">
            Profiles, shipped projects, and articles — one hub for the community.
          </p>
        </div>
      </section>

      <section className="section pt-4">
        <div className="container w-full">
          <div className="flex flex-wrap gap-2 mb-6">
            {(["profiles", "projects", "articles"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
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
            className="sticky z-10 -mx-4 px-4 py-3 mb-6 border-b border-[var(--border)] bg-[var(--bg)]"
            style={{ top: "3.5rem" }}
          >
            <div className="flex flex-col gap-4">
              <input
                type="search"
                placeholder={
                  view === "profiles"
                    ? "Search name, Discord ID, bio, tech…"
                    : "Search titles…"
                }
                value={q}
                onChange={(e) => patchQuery({ q: e.target.value || null })}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] focus:border-[var(--accent)]"
                style={{ fontFamily: "var(--font-mono)" }}
              />

              {view === "projects" && (
                <div className="flex flex-col gap-2">
                  <p className="mono text-[0.65rem] text-white/40 uppercase tracking-wider">
                    Track
                  </p>
                  <div className="flex w-full rounded border border-[var(--border)] overflow-hidden">
                    {(["all", "developer", "hacker", "designer"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => patchQuery({ track: t === "all" ? null : t })}
                        className={`flex-1 min-h-[44px] px-3 py-2 text-xs font-bold uppercase ${
                          (t === "all" && track === "all") ||
                          track === t ||
                          (t === "all" && !["developer", "hacker", "designer"].includes(track))
                            ? "bg-[var(--accent)] text-black"
                            : "bg-[var(--bg-card)] text-[var(--text-dim)]"
                        }`}
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-2 mb-2 md:justify-start">
                  <p className="mono text-[0.65rem] text-white/40 uppercase tracking-wider">
                    Tech stack {selectedStacks.length ? `(OR)` : ""}
                  </p>
                  {mobileTechStackCollapsed ? (
                    <button
                      type="button"
                      onClick={() => setMobileTechStackCollapsed(false)}
                      className="md:hidden text-[0.65rem] text-[var(--accent)] font-medium shrink-0"
                    >
                      Expand
                    </button>
                  ) : null}
                </div>
                <div
                  className={`grid md:grid-rows-[1fr] ${
                    mobileTechStackCollapsed
                      ? "grid-rows-[0fr] md:grid-rows-[1fr]"
                      : "grid-rows-[1fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden md:overflow-visible">
                    <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap scrollbar-none md:flex-wrap md:overflow-visible md:whitespace-normal md:pb-0 md:max-h-none">
                      {topStacks.map(([label]) => {
                        const on = selectedStacks.includes(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleStack(label)}
                            className={`tag shrink-0 text-[0.65rem] cursor-pointer ${
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
                          className="tag shrink-0 text-[0.65rem] border-dashed"
                        >
                          {showAllStacks ? "Show less" : "Show all"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {mobileTechStackCollapsed ? (
                  <p className="md:hidden mono text-[0.6rem] text-white/35 mt-1">
                    {selectedStacks.length
                      ? `${selectedStacks.length} filter${selectedStacks.length === 1 ? "" : "s"} active`
                      : "Scroll up or tap Expand for tags"}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3 items-center">
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
                        <option value="recent">By join date</option>
                        <option value="name">By name (A–Z)</option>
                        <option value="projects">By projects shipped</option>
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
                        <option value="recent">New</option>
                        <option value="top">Top (likes)</option>
                      </>
                    )}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card p-4 sm:p-5">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="skeleton h-10 w-10 rounded-full shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="skeleton h-3 w-2/3" aria-hidden="true" />
                      <div className="skeleton h-3 w-1/2" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="skeleton h-2.5 w-full" aria-hidden="true" />
                    <div className="skeleton h-2.5 w-5/6" aria-hidden="true" />
                    <div className="skeleton h-2.5 w-2/3" aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>Could not load member data.</p>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-dim)",
                  marginTop: "0.5rem",
                }}
              >
                {error}
              </p>
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
                <>
                  <div
                    key={view}
                  >
                    {view === "profiles" && (
                      <>
                        {members.length === 0 ? (
                          <div className="empty-state max-w-lg mx-auto text-center">
                            <p>No members yet — be the first to join.</p>
                            <Link href="/join" className="btn btn-primary mt-4 inline-flex">
                              Join the community →
                            </Link>
                          </div>
                        ) : filteredProfiles.length === 0 ? (
                          <div className="empty-state">
                            <p>No members match filters.</p>
                          </div>
                        ) : (
                          <div
                            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                          >
                            {filteredProfiles.map((m) => {
                              const stack = formatTechStack(m.techStack);
                              const avatar = userProfileAvatarUrl(
                                {
                                  discordId: m.discordId,
                                  github: m.github,
                                  avatarHash: m.avatarHash,
                                  profileAvatarSource: m.profileAvatarSource,
                                },
                                128,
                              );
                              const gh = githubProfileHref(m.github);
                              const li = ensureAbsoluteUrl(m.linkedin);
                              return (
                                <article
                                  key={m.discordId}
                                  className="card p-4 sm:p-5 cursor-pointer"
                                  role="link"
                                  tabIndex={0}
                                  aria-label={`Open profile for ${memberDisplayName(m)}`}
                                  onClick={() => router.push(`/members/user/${m.discordId}`)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      router.push(`/members/user/${m.discordId}`);
                                    }
                                  }}
                                >
                                  <div className="flex items-start gap-3 mb-3">
                                    <Image
                                      src={avatar}
                                      alt={`${memberDisplayName(m)} avatar`}
                                      width={40}
                                      height={40}
                                      quality={80}
                                      className="rounded-full shrink-0 bg-[var(--border)]"
                                    />
                                    <div className="min-w-0">
                                      <p className="mono text-xs truncate">
                                        {memberDisplayName(m)}
                                      </p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {(m.tracks ?? []).map((t) => (
                                          <span
                                            key={t}
                                            className="tag text-[0.6rem]"
                                            style={
                                              t === "DESIGNERS"
                                                ? {
                                                    background: "#D85A3022",
                                                    borderColor: "#D85A3088",
                                                    color: "#fff",
                                                  }
                                                : undefined
                                            }
                                          >
                                            {t === "DESIGNERS"
                                              ? "Designer"
                                              : t === "HACKER"
                                                ? "Hacker"
                                                : "Developer"}
                                          </span>
                                        ))}
                                      </div>
                                      <p className="text-[var(--accent)] font-bold text-sm mt-1">
                                        {m.points} XP · #{m.rank || "—"} ·{" "}
                                        <span className="text-white/50 font-normal">
                                          {m._count.submissions} projects
                                        </span>
                                      </p>
                                      <p className="mono text-[0.6rem] text-white/40 mt-0.5">
                                        Joined{" "}
                                        {new Date(m.createdAt).toLocaleDateString(undefined, {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                        })}
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
                                      {stack.slice(0, 3).map((t) => (
                                        <span key={t} className="tag text-[0.65rem]">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-2">
                                    {gh && (
                                      <a
                                        href={gh}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn px-2 py-1 text-[0.65rem]"
                                        onClick={(e) => e.stopPropagation()}
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
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        LinkedIn
                                      </a>
                                    )}
                                  </div>
                                </article>
                              );
                            })}
                          </div>
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
                        <div
                          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        >
                          {filteredProjects.map((s) => {
                            const stack = formatTechStack(s.user.techStack);
                            const trackBadge =
                              (s.track ?? "DEVELOPER") === "HACKER"
                                ? "Hacker"
                                : (s.track ?? "DEVELOPER") === "DESIGNERS"
                                  ? "Designer"
                                  : "Developer";
                            const isDesigner = (s.track ?? "DEVELOPER") === "DESIGNERS";
                            return (
                              <article
                                key={s.id}
                                className="card p-4 sm:p-5 flex flex-col"
                              >
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <span className="tag tag-accent text-xs">{s.tier}</span>
                                  <span className="tag text-xs">
                                    {trackBadge}
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
                                  <Link
                                    href={`/members/user/${s.user.discordId}`}
                                    className="hover:text-[var(--accent)] underline-offset-2 hover:underline"
                                  >
                                    {memberDisplayName(s.user)}
                                  </Link>
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {isDesigner && s.attachmentUrl ? (
                                    <a
                                      href={s.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn text-xs py-1.5"
                                    >
                                      Image
                                    </a>
                                  ) : (
                                    <a
                                      href={s.repoUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn text-xs py-1.5"
                                    >
                                      Repo
                                    </a>
                                  )}
                                  <Link href={`/submissions/${s.id}`} className="btn text-xs py-1.5">
                                    Detail
                                  </Link>
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
                              </article>
                            );
                          })}
                        </div>
                      ))}

                    {view === "articles" &&
                      (filteredArticles.length === 0 ? (
                        <div className="empty-state">
                          <p>No articles match filters.</p>
                        </div>
                      ) : (
                        <div
                          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                        >
                          {filteredArticles.map((blog) => (
                            <div
                              key={blog.id}
                              className="h-full"
                            >
                              <BlogArticleCard blog={blog} />
                            </div>
                          ))}
                        </div>
                      ))}
                  </div>
                </>
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
                    <>
                      {sidebarTab === "leaderboard" ? (
                        <div
                          key="lb"
                          className="p-4"
                        >
                          {top15.length === 0 ? (
                            <p className="mono dim text-xs text-center py-4">No data yet.</p>
                          ) : (
                            <div className="space-y-2.5">
                              {top15.map((m) => {
                                const barW =
                                  maxXp > 0 ? Math.round((m.points / maxXp) * 100) : 0;
                                const r = m.rank ?? 0;
                                const rankMedal =
                                  r === 1
                                    ? "🥇"
                                    : r === 2
                                      ? "🥈"
                                      : r === 3
                                        ? "🥉"
                                        : null;
                                return (
                                  <div key={m.discordId} className="flex items-center gap-2.5">
                                    <span className="w-5 text-center text-xs shrink-0">
                                      {r <= 0 ? (
                                        <span className="mono dim text-[0.65rem]">—</span>
                                      ) : rankMedal ? (
                                        rankMedal
                                      ) : (
                                        <span className="mono dim text-[0.65rem]">#{r}</span>
                                      )}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="mono text-[0.65rem] truncate mb-0.5">
                                        {memberDisplayName(m)}
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
                        </div>
                      ) : (
                        <div
                          key="xp"
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
                                  <td className="py-2 text-right mono text-[0.65rem] text-white/45">
                                    {row.note}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-4 border-t border-[var(--border)] pt-3">
                            <p className="mono text-[0.65rem] text-white/40 mb-2 uppercase tracking-wider">
                              Discord roles
                            </p>
                            <table className="w-full text-sm">
                              <tbody>
                                {ROLE_TABLE.map((row) => (
                                  <tr
                                    key={row.role}
                                    className="border-b border-[var(--border)] last:border-0"
                                  >
                                    <td className="py-2 text-xs">
                                      <span className="mono" style={{ color: row.color }}>
                                        {row.role}
                                      </span>
                                    </td>
                                    <td className="py-2 text-right mono text-[0.65rem] text-white/60">
                                      {row.range}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
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
