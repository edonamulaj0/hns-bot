"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  getMembers,
  getBlogs,
  getDiscordWidget,
  PHASE_META,
  type MembersResponse,
  type LeaderboardResponse,
  type PortfolioResponse,
  type BlogsResponse,
} from "@/lib/api";
import type { Phase } from "@/lib/phase";
import { PhaseCountdownLine } from "@/components/PhaseCountdown";
import { DISCORD_INVITE_URL } from "@/lib/branding";
import { buildActivityFeed, submissionsFromPortfolio } from "@/lib/activity-feed";
import { ActivityFeedList, SeeAllActivityLink } from "@/components/ActivityTimeline";
import { memberDisplayName } from "@/lib/member-label";
import { AnimateIn } from "@/components/AnimateIn";

type HomePageClientProps = {
  initialPortfolio: PortfolioResponse;
  initialLeaderboard: LeaderboardResponse;
};

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function HomePageClient({
  initialPortfolio,
  initialLeaderboard,
}: HomePageClientProps) {
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showDeletedToast, setShowDeletedToast] = useState(false);
  const [data, setData] = useState<{
    members: MembersResponse | null;
    blogs: BlogsResponse | null;
    discordWidgetMembers: number | null;
  } | null>(null);

  useEffect(() => {
    Promise.allSettled([getMembers(), getBlogs(), getDiscordWidget()]).then(
      ([members, blogs, discordWidget]) => {
      setData({
        members: members.status === "fulfilled" ? members.value : null,
        blogs: blogs.status === "fulfilled" ? blogs.value : null,
        discordWidgetMembers:
          discordWidget.status === "fulfilled"
            ? (discordWidget.value?.approximate_member_count ?? null)
            : null,
      });
      },
    );
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("deleted") !== "1") return;
    setShowDeletedToast(true);
    const t = window.setTimeout(() => setShowDeletedToast(false), 3000);
    const u = new URL(window.location.href);
    u.searchParams.delete("deleted");
    window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);
    return () => window.clearTimeout(t);
  }, []);

  const portfolioData = initialPortfolio;
  const membersData = data?.members?.members ?? [];
  const leaderboardData = initialLeaderboard.leaderboard ?? [];
  const blogsData = data?.blogs?.blogs ?? [];

  const phase = (portfolioData?.phase ?? "BUILD") as keyof typeof PHASE_META;
  const phaseMeta = PHASE_META[phase];
  const totalSubmissions = Object.values(portfolioData?.published ?? {}).flat().length;
  const totalMembers = data?.discordWidgetMembers ?? membersData.length;
  const leaderboardNonZero = leaderboardData.filter((m) => m.points > 0);
  const top3 = leaderboardNonZero.slice(0, 3);
  const maxXp = top3[0]?.points ?? 1;
  const latestBlogs = blogsData.slice(0, 3);

  const activityPreview = useMemo(
    () => buildActivityFeed(submissionsFromPortfolio(portfolioData), blogsData, 5),
    [portfolioData, blogsData],
  );

  const showStatNumbers =
    data !== null && (totalMembers > 0 || totalSubmissions > 0);
  const monthsSinceLaunch = Math.max(
    0,
    (new Date().getUTCFullYear() - 2025) * 12 + new Date().getUTCMonth() - 5,
  );

  const heroWords = ["Build.", "Ship.", "Get seen."];
  const latestProjects = Object.entries(portfolioData?.published ?? {})
    .flatMap(([, subs]) => subs as any[])
    .slice(0, 6);

  return (
    <>
      {showDeletedToast && (
        <div className="fixed right-4 top-[4.5rem] z-[120] rounded border border-[var(--accent)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--accent)] shadow-lg">
          Your account has been deleted.
        </div>
      )}
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="section flex min-h-[min(80dvh,720px)] items-center">
        <div className="container">
          <div className="max-w-[720px]">
            <div
              className="mb-4 sm:mb-6 flex gap-4 items-center"
            >
              <span
                className="phase-badge"
                style={{
                  background: `${phaseMeta.color}18`,
                  color: phaseMeta.color,
                  border: `1px solid ${phaseMeta.color}40`,
                }}
              >
                <span className="pulse-dot" style={{ background: phaseMeta.color }} />
                {phaseMeta.label}
              </span>
              <span className="mono dim text-xs sm:text-sm">{phaseMeta.description}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl mb-4 sm:mb-6">
              {heroWords.map((word, i) => (
                <span
                  key={word}
                  className={i === heroWords.length - 1 ? "text-[var(--accent)] block" : ""}
                >
                  {word}{" "}
                </span>
              ))}
            </h1>

            <p
              className="text-base sm:text-lg text-white/60 max-w-[540px] mb-6 sm:mb-8 lg:mb-10 leading-relaxed"
            >
              Monthly build challenges for developers, hackers, and designers — on Discord.
            </p>

            <div
              className="flex"
              style={{
                display: "flex",
                gap: "0.75rem",
                flexDirection: "var(--cta-direction, row)" as any,
              }}
            >
              <Link href="/join" className="btn btn-primary max-[480px]:w-full max-[480px]:justify-center">
                Join Us →
              </Link>
              <Link
                href="/challenges"
                className="btn btn-outline max-[480px]:w-full max-[480px]:justify-center"
              >
                View Challenges
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      <AnimateIn
        className="border-t border-b border-[var(--border)] py-6 sm:py-8"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        amount={0.15}
      >
        <div className="container" aria-busy={data === null}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="stat-block">
              <span className="value">
                {data === null ? (
                  <span className="stat-value-skeleton" aria-hidden />
                ) : showStatNumbers ? (
                  totalMembers
                ) : (
                  "—"
                )}
              </span>
              <span className="label">Members</span>
            </div>
            <div className="stat-block">
              <span className="value">
                {data === null ? (
                  <span className="stat-value-skeleton !w-[min(4rem,38vw)]" aria-hidden />
                ) : showStatNumbers ? (
                  totalSubmissions
                ) : (
                  "—"
                )}
              </span>
              <span className="label">Projects shipped</span>
            </div>
            <div className="stat-block">
              <span className="value">
                {data === null ? (
                  <span className="stat-value-skeleton !w-[min(3rem,28vw)]" aria-hidden />
                ) : showStatNumbers ? (
                  monthsSinceLaunch
                ) : (
                  "—"
                )}
              </span>
              <span className="label">Months active</span>
            </div>
            <div className="stat-block">
              <div className="value min-h-[2.75rem] flex flex-col justify-center text-left">
                <PhaseCountdownLine phase={(portfolioData?.phase as Phase) ?? undefined} />
              </div>
            </div>
          </div>
          {data !== null && !showStatNumbers && (
            <p className="mono mt-3 text-center text-[var(--text-xs)] text-[var(--text-dimmer)] max-w-lg mx-auto leading-relaxed">
              Live stats are temporarily unavailable. Check back shortly.
            </p>
          )}
        </div>
      </AnimateIn>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <AnimateIn
        className="section"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        amount={0.15}
      >
        <div className="container">
          <p className="mono text-[0.7rem] text-[var(--accent)] tracking-wider uppercase mb-2 sm:mb-3">
            The loop
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 sm:mb-10 lg:mb-12">
            How It Works
          </h2>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)]"
          >
            {[
              { step: "01", title: "Join Discord", body: "Sign in on the site and complete your profile (GitHub, LinkedIn, tech stack) for your public card." },
              { step: "02", title: "Build (Days 1–21)", body: "Ship a project of any tier. Enroll and submit before the vote window (UTC calendar)." },
              { step: "03", title: "Vote (Days 22–25)", body: "Signed-in members vote on the site; each vote on your work earns you XP." },
              { step: "04", title: "Get Published", body: "After results are revealed at month-end, winning work appears in the portfolio." },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-[var(--bg)] border-l-2 border-[var(--accent)] pl-4 sm:border-l-0 sm:pl-5 p-4 sm:p-5 lg:p-6"
              >
                <p className="mono hidden sm:block text-[0.65rem] sm:text-xs text-white/40 mb-2 sm:mb-3">{item.step}</p>
                <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-white/60 text-xs sm:text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </AnimateIn>

      {/* ── This Month's Top Builders ────────────────────────────────────── */}
      {top3.length > 0 && (
        <AnimateIn
          className="section bg-[var(--bg-card)] border-t border-b border-[var(--border)]"
          hidden={{ opacity: 0 }}
          visible={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          amount={0.15}
        >
          <div className="container">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 lg:mb-10 gap-4">
              <div>
                <p className="mono text-[0.7rem] text-[var(--accent-2)] tracking-wider uppercase mb-2">
                  Top builders
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  This Month's Top Builders
                </h2>
              </div>
              <Link href="/members" className="btn whitespace-nowrap">
                All members →
              </Link>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
            >
              {top3.map((member: any, i: number) => {
                const r = member.rank ?? 0;
                const rankMedal =
                  r <= 0
                    ? "—"
                    : r === 1
                      ? "🥇"
                      : r === 2
                        ? "🥈"
                        : r === 3
                          ? "🥉"
                          : `#${r}`;
                const barWidth = maxXp > 0 ? Math.round((member.points / maxXp) * 100) : 0;
                return (
                  <div
                    key={member.discordId}
                    className="card p-4 sm:p-5 lg:p-6"
                  >
                    <div className="flex gap-4 items-center mb-3">
                      <span className="text-2xl sm:text-3xl flex-shrink-0">{rankMedal}</span>
                      <div className="min-w-0">
                        <p className="mono text-xs sm:text-sm truncate">
                          {memberDisplayName(member)}
                        </p>
                        <p className="text-[var(--accent)] font-bold text-sm sm:text-base">
                          {member.points} XP
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ transform: `scaleX(${barWidth / 100})`, transformOrigin: "left" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimateIn>
      )}

      {/* ── Latest from Blog ─────────────────────────────────────────────── */}
      {latestBlogs.length > 0 && (
        <AnimateIn
          className="section"
          hidden={{ opacity: 0 }}
          visible={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          amount={0.15}
        >
          <div className="container">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 lg:mb-10 gap-4">
              <div>
                <p className="mono text-[0.7rem] text-[var(--accent)] tracking-wider uppercase mb-2">
                  Community writing
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Latest articles</h2>
              </div>
              <Link href="/members?view=articles" className="btn whitespace-nowrap">
                All articles →
              </Link>
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
            >
              {latestBlogs.map((blog) => (
                <a
                  key={blog.id}
                  href={blog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-lift p-4 sm:p-5 lg:p-6 no-underline text-[var(--text)] flex flex-col gap-3"
                >
                  <h3 className="text-base sm:text-lg font-bold leading-tight">
                    {blog.title}
                  </h3>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="mono dim text-[0.7rem]">
                      {memberDisplayName(blog.user)}
                    </span>
                    <span className="mono text-[0.7rem] text-[var(--accent)]">
                      ▲ {blog.upvotes}
                    </span>
                  </div>
                  {blog.createdAt && (
                    <span className="mono dim text-[0.65rem]">
                      {relativeTime(blog.createdAt)}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </AnimateIn>
      )}

      {/* ── Latest Projects ──────────────────────────────────────────────── */}
      <AnimateIn
        className="section border-t border-[var(--border)]"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        amount={0.15}
      >
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 lg:mb-10 gap-4">
            <div>
              <p className="mono text-[0.7rem] text-[var(--accent)] tracking-wider uppercase mb-2">
                Recent
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Latest Projects</h2>
            </div>
            <Link href="/challenges" className="btn whitespace-nowrap">
              All challenges →
            </Link>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
          >
            {latestProjects.map((sub: any, idx: number) => {
              const isDesigner = sub.track === "DESIGNERS";
              return (
                <article
                  key={sub.id}
                  className={`card card-lift p-4 sm:p-5 lg:p-6 ${
                    idx >= 3 && !showAllProjects ? "hidden sm:block" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <span className="tag tag-accent text-xs sm:text-sm">{sub.tier}</span>
                    <span className="mono dim text-[0.65rem] sm:text-xs">{sub.month}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">{sub.title}</h3>
                  <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">
                    {sub.description.slice(0, 120)}
                    {sub.description.length > 120 ? "…" : ""}
                  </p>
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex gap-2">
                      {isDesigner && sub.attachmentUrl ? (
                        <a
                          href={sub.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn text-[0.65rem] sm:text-xs py-1 px-2"
                        >
                          Image
                        </a>
                      ) : (
                        <a
                          href={sub.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn text-[0.65rem] sm:text-xs py-1 px-2"
                        >
                          Repo
                        </a>
                      )}
                      <Link
                        href={`/submissions/${sub.id}`}
                        className="btn text-[0.65rem] sm:text-xs py-1 px-2"
                      >
                        Detail
                      </Link>
                      {sub.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn text-[0.65rem] sm:text-xs py-1 px-2"
                        >
                          Demo
                        </a>
                      )}
                    </div>
                    <span className="mono dim text-[0.65rem] sm:text-xs whitespace-nowrap">
                      ▲ {sub.votes}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {latestProjects.length > 3 && (
            <div className="mt-4 sm:hidden">
              <button
                type="button"
                className="btn w-full justify-center"
                onClick={() => setShowAllProjects((v) => !v)}
              >
                {showAllProjects ? "Show fewer projects" : "Show more projects"}
              </button>
            </div>
          )}

          {totalSubmissions === 0 && (
            <div className="empty-state">
              <p>No projects published yet. The first batch ships at the end of the month.</p>
            </div>
          )}
        </div>
      </AnimateIn>

      {activityPreview.length > 0 && (
        <AnimateIn
          className="section border-t border-[var(--border)]"
          hidden={{ opacity: 0 }}
          visible={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          amount={0.15}
        >
          <div className="container max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <div>
                <p className="mono text-[0.7rem] text-[var(--accent)] tracking-wider uppercase mb-2">
                  Live
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold">Recent Activity</h2>
              </div>
              <SeeAllActivityLink />
            </div>
            <ActivityFeedList items={activityPreview} compact />
          </div>
        </AnimateIn>
      )}

      <AnimateIn
        className="section border-t border-[var(--border)] bg-[var(--bg-card)]"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        amount={0.15}
      >
        <div className="container text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Join the community</h2>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-8">
            Early community — come help build it. Monthly challenges, real projects on Discord and this site.
          </p>
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex justify-center"
          >
            Join Discord
          </a>
        </div>
      </AnimateIn>
    </>
  );
}
