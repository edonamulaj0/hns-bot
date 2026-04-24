"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { getPortfolio, PHASE_META, type PortfolioResponse } from "@/lib/api";
import { memberDisplayName } from "@/lib/member-label";
import { PhaseCountdown } from "@/components/PhaseCountdown";
import { VoteBanner } from "@/components/VoteBanner";
import { AnimateIn } from "@/components/AnimateIn";
import type { Phase } from "@/lib/phase";
import { getMonthKey } from "@/lib/month";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function ChallengesPage() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const voteMonth = useMemo(() => getMonthKey(), []);

  useEffect(() => {
    getPortfolio().then(setPortfolio).catch(console.error);
  }, []);

  const phase = portfolio?.phase ?? "BUILD";
  const phaseMeta = PHASE_META[phase] ?? PHASE_META.BUILD;
  const currentMonth = portfolio?.month ?? voteMonth;

  const publishedEntries = Object.entries(portfolio?.published ?? {}).sort(
    (a, b) => b[0].localeCompare(a[0]),
  );

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.section
        className="section-sm page-header min-h-[min(42dvh,420px)] flex flex-col justify-center"
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <div className="container w-full">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {phaseMeta && (
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
            )}
            {currentMonth && (
              <span className="mono dim text-xs sm:text-sm">{currentMonth}</span>
            )}
          </div>
          <PhaseCountdown phase={(portfolio?.phase as Phase) ?? undefined} />
          <VoteBanner monthKey={currentMonth || voteMonth} />
          <div className="label mt-6 sm:mt-8">Build & Compete</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 lg:mb-6">
            Monthly Challenges
          </h1>
          <motion.p
            className="text-sm sm:text-base text-white/60 max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Three challenge tracks. Three difficulty levels. One global community.
            Build what you want, submit on the site or in Discord, and compete for recognition.
          </motion.p>
          {phase === "VOTE" && currentMonth && (
            <motion.div
              className="mt-6 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Link
                href={`/vote/${currentMonth}`}
                className="btn btn-primary text-sm sm:text-base"
              >
                Cast votes — {currentMonth}
              </Link>
            </motion.div>
          )}
        </div>
      </motion.section>

      {/* ── Track Explanation ─────────────────────────────────────────────── */}
      <AnimateIn
        className="section border-t border-[var(--border)]"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        amount={0.15}
      >
        <div className="container w-full">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Three Tracks</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <motion.div
              className="card w-full p-5 sm:p-7"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              viewport={{ once: true, amount: 0.15 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🛠</span>
                <h3 className="text-xl sm:text-2xl font-bold">Developer Track</h3>
              </div>
              <p className="text-white/60 text-sm sm:text-base mb-4 leading-relaxed">
                Build a full project over the <strong className="text-white">monthly build window</strong>{" "}
                (days 1–21). Choose a tier (Beginner, Intermediate, or Advanced) and ship something real — an
                app, a library, a tool, anything.
              </p>
              <div className="flex w-full flex-wrap gap-2">
                <span className="tag tag-accent whitespace-normal break-words leading-snug">Days 1–21: Build</span>
                <span className="tag whitespace-normal break-words leading-snug">Days 22–25: Vote</span>
                <span className="tag whitespace-normal break-words leading-snug">Days 26–28: Review</span>
                <span className="tag whitespace-normal break-words leading-snug">Day 29: Publish</span>
              </div>
              <Link href="/challenges/developers" className="btn btn-primary w-fit mt-4">
                View challenges →
              </Link>
            </motion.div>

            <motion.div
              className="card w-full p-5 sm:p-7"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: EASE_OUT }}
              viewport={{ once: true, amount: 0.15 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔒</span>
                <h3 className="text-xl sm:text-2xl font-bold">Hacker Track</h3>
              </div>
              <p className="text-white/60 text-sm sm:text-base mb-4 leading-relaxed">
                Same <strong className="text-white">monthly calendar</strong> as the developer track. Submit CTF
                writeups, build security tools, research vulnerabilities, or run red team simulations — all on the
                same build, vote, and publish rhythm.
              </p>
              <div className="mb-3 flex w-full flex-wrap gap-2">
                <span className="tag tag-accent whitespace-normal break-words leading-snug">Days 1–21: Build</span>
                <span className="tag whitespace-normal break-words leading-snug">Days 22–25: Vote</span>
                <span className="tag whitespace-normal break-words leading-snug">Days 26–28: Review</span>
                <span className="tag whitespace-normal break-words leading-snug">Day 29: Publish</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["CTF Writeup", "Tool Build", "Vuln Research", "Red Team"].map((t) => (
                  <span
                    key={t}
                    className="tag text-[0.65rem]"
                    style={{
                      background: "#7c2feb1a",
                      borderColor: "#7c2feb4d",
                      color: "#ccff00",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <Link
                href="/challenges/hackers"
                className="btn w-fit mt-4"
                style={{
                  borderColor: "#7c2feb66",
                  color: "#ccff00",
                }}
              >
                View challenges →
              </Link>
            </motion.div>

            <motion.div
              className="card w-full p-5 sm:p-7"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: EASE_OUT }}
              viewport={{ once: true, amount: 0.15 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0 text-[#D85A30]"
                  aria-hidden
                >
                  <path
                    d="M4 20c5.5-1.5 11-6 14-12l2.5-4.5 2.2 2.2L18 8c-6 2-11.5 6.5-14 12"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17 4l3 3M6 19l2-1"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                <h3 className="text-xl sm:text-2xl font-bold">Graphic Design Challenge</h3>
              </div>
              <p className="text-white/60 text-sm sm:text-base mb-4 leading-relaxed">
                Design posters, brand kits, UI mockups, or motion graphics. Submit a PNG, JPG, or WebP image export —
                show your visual thinking, not just your tools.
              </p>
              <div className="flex w-full flex-wrap gap-2">
                <span className="tag tag-accent whitespace-normal break-words leading-snug">Days 1–21: Build</span>
                <span className="tag whitespace-normal break-words leading-snug">Days 22–25: Vote</span>
                <span className="tag whitespace-normal break-words leading-snug">Days 26–28: Review</span>
                <span className="tag whitespace-normal break-words leading-snug">Day 29: Publish</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {["Poster Design", "Brand Identity", "UI Mockup", "Motion Graphic"].map((t) => (
                  <span
                    key={t}
                    className="tag text-[0.65rem]"
                    style={{
                      background: "#D85A301a",
                      borderColor: "#D85A304d",
                      color: "#fff",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <Link
                href="/challenges/designers"
                className="btn w-fit mt-4"
                style={{
                  borderColor: "#D85A3088",
                  color: "#fff",
                  background: "#D85A3014",
                }}
              >
                View challenges →
              </Link>
            </motion.div>
          </div>
        </div>
      </AnimateIn>

      {/* ── Monthly Archive ──────────────────────────────────────────────── */}
      <AnimateIn
        className="section border-t border-[var(--border)]"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        amount={0.15}
      >
        <div className="container w-full">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Monthly Archive</h2>

          {publishedEntries.length > 0 ? (
            <div className="flex flex-col gap-10 sm:gap-14">
              {publishedEntries.map(([month, submissions]) => {
                const subs = submissions as any[];
                const top3 = [...subs].sort((a, b) => b.votes - a.votes).slice(0, 3);

                return (
                  <motion.div
                    key={month}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    viewport={{ once: true, amount: 0.15 }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-[var(--border)]">
                      <h3 className="text-xl sm:text-2xl font-bold">{month}</h3>
                      <Link
                        href={`/challenges/${month}`}
                        className="btn text-xs sm:text-sm"
                      >
                        View all {subs.length} submissions →
                      </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {top3.map((sub: any, i: number) => (
                        <article
                          key={sub.id}
                          className="card p-4 sm:p-5 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="tag tag-accent text-xs">{sub.tier}</span>
                              {i === 0 && <span className="text-sm">🥇</span>}
                              {i === 1 && <span className="text-sm">🥈</span>}
                              {i === 2 && <span className="text-sm">🥉</span>}
                            </div>
                            <span className="mono text-[0.65rem] text-[var(--accent)]">
                              ▲ {sub.votes}
                            </span>
                          </div>
                          <h4 className="text-base sm:text-lg font-bold">{sub.title}</h4>
                          <span className="mono dim text-[0.65rem]">
                            {sub.user?.discordId
                              ? memberDisplayName(sub.user)
                              : "—"}
                          </span>
                          <div className="flex flex-wrap gap-2 mt-auto pt-2">
                            {sub.track === "DESIGNERS" && sub.attachmentUrl ? (
                              <a
                                href={sub.attachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn text-[0.65rem] py-1 px-2"
                              >
                                Image
                              </a>
                            ) : (
                              <a
                                href={sub.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn text-[0.65rem] py-1 px-2"
                              >
                                Repo
                              </a>
                            )}
                            {sub.demoUrl && !String(sub.demoUrl).startsWith("data:") && (
                              <a
                                href={sub.demoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary text-[0.65rem] py-1 px-2"
                              >
                                Demo / writeup
                              </a>
                            )}
                            <Link
                              href={`/submissions/${sub.id}`}
                              className="btn text-[0.65rem] py-1 px-2 border-white/20"
                            >
                              Detail
                            </Link>
                          </div>
                        </article>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>No challenges published yet. Check back soon!</p>
            </div>
          )}
        </div>
      </AnimateIn>

      {/* ── Discord Commands Reference ───────────────────────────────────── */}
      <AnimateIn
        className="section border-t border-[var(--border)] text-center"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        amount={0.15}
      >
        <div className="container w-full max-w-3xl">
          <p className="mono mb-3 text-[0.7rem] uppercase tracking-wider text-[var(--accent)]">
            Discord bot
          </p>
          <h2 className="mb-6 text-2xl font-bold sm:text-3xl md:text-4xl">
            Commands that power the loop
          </h2>
          <ul className="space-y-4 text-left text-sm text-white/70 sm:text-base">
            {[
              {
                cmd: "Website → Profile",
                desc: "After signing in with Discord, complete your profile (bio, GitHub, LinkedIn, tech stack) for your public Members card. You can also use /profile in Discord.",
              },
              {
                cmd: "/enroll",
                desc: "Pick a monthly challenge (track + tier) before you can submit. Open during the build window (days 1–21 UTC).",
              },
              {
                cmd: "/submit",
                desc: "Submit your build: Developer (GitHub repo), Hacker (writeup / link), or Designer (direct image URL). You can also use Submit on the site when signed in.",
              },
              {
                cmd: "/design-brief",
                desc: "Posts the current month’s Graphic Design challenge tiers (Beginner, Intermediate, Advanced) in-channel.",
              },
              {
                cmd: "Vote (site)",
                desc: `During the vote window (days 22–25 UTC), cast up to 3 votes (max 1 per track: Developer, Hacker, Design) at /vote/${currentMonth || voteMonth}.`,
              },
              {
                cmd: "/pulse",
                desc: "Shows your GitHub activity for the current UTC month and estimated month-end pulse XP (preview only; does not award points).",
              },
              {
                cmd: "/leaderboard",
                desc: "Shows top builders by points for the current month in Discord.",
              },
            ].map((row) => (
              <li
                key={row.cmd}
                className="rounded border border-[var(--border)] bg-[var(--bg)] p-4 sm:p-5"
              >
                <code className="mono text-[var(--accent)]">{row.cmd}</code>
                <p className="mt-2 leading-relaxed">{row.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </AnimateIn>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <AnimateIn
        className="section flex min-h-[min(50dvh,560px)] items-center text-center border-t border-[var(--border)] bg-[var(--bg-card)]"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        amount={0.15}
      >
        <div className="container max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">
            Ready to Challenge Yourself?
          </h2>
          <p className="text-white/60 mb-6 sm:mb-8 text-sm sm:text-base">
            Join our Discord community to get notified of new challenges, chat with other builders, and submit your projects.
          </p>
          <Link
            href="/join"
            className="btn btn-primary inline-flex text-sm sm:text-base"
          >
            Join Us →
          </Link>
        </div>
      </AnimateIn>
    </>
  );
}
