"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  getPortfolio,
  getMembers,
  getLeaderboard,
  getBlogs,
  PHASE_META,
  type MembersResponse,
  type LeaderboardResponse,
  type PortfolioResponse,
  type BlogsResponse,
} from "@/lib/api";
import type { Phase } from "@/lib/phase";
import { PhaseCountdownLine } from "@/components/PhaseCountdown";
import { DiscordWidget } from "@/components/DiscordWidget";
import { buildActivityFeed } from "@/lib/activity-feed";
import { ActivityFeedList, SeeAllActivityLink } from "@/components/ActivityTimeline";
import { memberDisplayName } from "@/lib/member-label";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const STAGGER_MS = 0.08;

function useCountUp(target: number, inView: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView || target === 0) { setValue(target); return; }
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, inView, duration]);
  return value;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function HomePage() {
  const [data, setData] = useState<{
    portfolio: PortfolioResponse | null;
    members: MembersResponse | null;
    leaderboard: LeaderboardResponse | null;
    blogs: BlogsResponse | null;
  } | null>(null);

  useEffect(() => {
    Promise.allSettled([
      getPortfolio(),
      getMembers(),
      getLeaderboard(),
      getBlogs(),
    ]).then(([portfolio, members, leaderboard, blogs]) => {
      setData({
        portfolio: portfolio.status === "fulfilled" ? portfolio.value : null,
        members: members.status === "fulfilled" ? members.value : null,
        leaderboard: leaderboard.status === "fulfilled" ? leaderboard.value : null,
        blogs: blogs.status === "fulfilled" ? blogs.value : null,
      });
    });
  }, []);

  const portfolioData = data?.portfolio ?? null;
  const membersData = data?.members?.members ?? [];
  const leaderboardData = data?.leaderboard?.leaderboard ?? [];
  const blogsData = data?.blogs?.blogs ?? [];

  const phase = (portfolioData?.phase ?? "BUILD") as keyof typeof PHASE_META;
  const phaseMeta = PHASE_META[phase];
  const totalSubmissions = Object.values(portfolioData?.published ?? {}).flat().length;
  const totalMembers = membersData.length;
  const top3 = leaderboardData.slice(0, 3);
  const maxXp = top3[0]?.points ?? 1;
  const latestBlogs = blogsData.slice(0, 3);

  const activityPreview = useMemo(
    () => buildActivityFeed(portfolioData, blogsData, 5),
    [portfolioData, blogsData],
  );

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, amount: 0.15 });
  const membersCount = useCountUp(totalMembers, statsInView);
  const submissionsCount = useCountUp(totalSubmissions, statsInView);
  const monthsCount = useCountUp(Object.keys(portfolioData?.published ?? {}).length, statsInView);

  const heroWords = ["Build.", "Ship.", "Get seen."];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: STAGGER_MS, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: EASE_OUT },
    },
  };

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="section grid-bg flex min-h-[min(80dvh,720px)] items-center">
        <div className="container">
          <div className="max-w-[720px]">
            <motion.div
              className="mb-4 sm:mb-6 flex gap-4 items-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
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
            </motion.div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl mb-4 sm:mb-6">
              {heroWords.map((word, i) => (
                <motion.span
                  key={word}
                  className={i === heroWords.length - 1 ? "text-[var(--accent)] block" : ""}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.15, ease: EASE_OUT }}
                >
                  {word}{" "}
                </motion.span>
              ))}
            </h1>

            <motion.p
              className="text-base sm:text-lg text-white/60 max-w-[540px] mb-6 sm:mb-8 lg:mb-10 leading-relaxed"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7, ease: EASE_OUT }}
            >
              Monthly build challenges for developers worldwide. Submit your projects, earn XP, and build a portfolio that speaks for itself.
            </motion.p>

            <motion.div
              className="flex gap-3 sm:gap-4 flex-wrap"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.85, ease: EASE_OUT }}
            >
              <Link href="/join" className="btn btn-primary">
                Join Us →
              </Link>
              <Link href="/challenges" className="btn">
                View Challenges
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────────────── */}
      <motion.section
        ref={statsRef}
        className="border-t border-b border-[var(--border)] py-6 sm:py-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="stat-block">
              <span className="value">{membersCount}</span>
              <span className="label">Members</span>
            </div>
            <div className="stat-block">
              <span className="value">{submissionsCount}</span>
              <span className="label">Projects shipped</span>
            </div>
            <div className="stat-block">
              <span className="value">{monthsCount}</span>
              <span className="label">Months active</span>
            </div>
            <div className="stat-block">
              <div className="value min-h-[2.75rem] flex flex-col justify-center text-left">
                <PhaseCountdownLine phase={(portfolioData?.phase as Phase) ?? undefined} />
              </div>
              <span className="label">Challenge phase</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="container">
          <p className="mono text-[0.7rem] text-[var(--accent)] tracking-wider uppercase mb-2 sm:mb-3">
            The loop
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 sm:mb-10 lg:mb-12">
            How It Works
          </h2>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--border)]"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {[
              { step: "01", title: "Join Discord", body: "Sign in on the site and complete your profile (GitHub, LinkedIn, tech stack) for your public card." },
              { step: "02", title: "Build (Days 1–21)", body: "Ship a project of any tier. Enroll and submit before the vote window (UTC calendar)." },
              { step: "03", title: "Vote (Days 22–25)", body: "Signed-in members vote on the site; each vote on your work earns you XP." },
              { step: "04", title: "Get Published", body: "After results are revealed at month-end, winning work appears in the portfolio." },
            ].map((item) => (
              <motion.div
                key={item.step}
                className="bg-[var(--bg)] p-4 sm:p-5 lg:p-6"
                variants={itemVariants}
              >
                <p className="mono text-[0.65rem] sm:text-xs text-white/40 mb-2 sm:mb-3">{item.step}</p>
                <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">{item.title}</h3>
                <p className="text-white/60 text-xs sm:text-sm leading-relaxed">{item.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* ── This Month's Top Builders ────────────────────────────────────── */}
      {top3.length > 0 && (
        <motion.section
          className="section bg-[var(--bg-card)] border-t border-b border-[var(--border)]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          viewport={{ once: true, amount: 0.15 }}
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

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              {top3.map((member: any, i: number) => {
                const medals = ["🥇", "🥈", "🥉"];
                const barWidth = maxXp > 0 ? Math.round((member.points / maxXp) * 100) : 0;
                return (
                  <motion.div
                    key={member.discordId}
                    className="card p-4 sm:p-5 lg:p-6"
                    variants={itemVariants}
                  >
                    <div className="flex gap-4 items-center mb-3">
                      <span className="text-2xl sm:text-3xl flex-shrink-0">{medals[i]}</span>
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
                      <motion.div
                        className="h-full rounded-full bg-[var(--accent)]"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${barWidth}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.1, ease: EASE_OUT }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* ── Latest from Blog ─────────────────────────────────────────────── */}
      {latestBlogs.length > 0 && (
        <motion.section
          className="section"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          viewport={{ once: true, amount: 0.15 }}
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

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
            >
              {latestBlogs.map((blog) => (
                <motion.a
                  key={blog.id}
                  href={blog.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-lift p-4 sm:p-5 lg:p-6 no-underline text-[var(--text)] flex flex-col gap-3"
                  variants={itemVariants}
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
                </motion.a>
              ))}
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* ── Latest Projects ──────────────────────────────────────────────── */}
      <motion.section
        className="section border-t border-[var(--border)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
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

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {Object.entries(portfolioData?.published ?? {})
              .flatMap(([, subs]) => subs as any[])
              .slice(0, 6)
              .map((sub: any) => (
                <motion.article
                  key={sub.id}
                  className="card card-lift p-4 sm:p-5 lg:p-6"
                  variants={itemVariants}
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
                      <a
                        href={sub.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn text-[0.65rem] sm:text-xs py-1 px-2"
                      >
                        Repo
                      </a>
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
                </motion.article>
              ))}
          </motion.div>

          {totalSubmissions === 0 && (
            <div className="empty-state">
              <p>No projects published yet. The first batch ships at the end of the month.</p>
            </div>
          )}
        </div>
      </motion.section>

      {activityPreview.length > 0 && (
        <motion.section
          className="section border-t border-[var(--border)]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          viewport={{ once: true, amount: 0.15 }}
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
        </motion.section>
      )}

      <motion.section
        className="section border-t border-[var(--border)] bg-[var(--bg-card)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="container text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Join the community</h2>
          <p className="text-sm sm:text-base text-white/60 leading-relaxed mb-8">
            Hundreds of developers and security researchers. Monthly challenges. Real projects. Join the Discord and
            start building.
          </p>
          <div className="mx-auto w-full max-w-[480px]">
            <DiscordWidget />
          </div>
          <Link href="/join" className="btn btn-primary mt-8 inline-flex">
            Join Us →
          </Link>
        </div>
      </motion.section>
    </>
  );
}
