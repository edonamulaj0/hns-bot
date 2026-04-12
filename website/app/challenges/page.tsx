"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { getPortfolio, PHASE_META, type PortfolioResponse } from "@/lib/api";
import { memberDisplayName } from "@/lib/member-label";
import { PhaseCountdown } from "@/components/PhaseCountdown";
import type { Phase } from "@/lib/phase";
import { utcMonthKey } from "@/lib/month";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function ChallengesPage() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const voteMonth = useMemo(() => utcMonthKey(), []);

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
        initial={{ opacity: 0, y: -20 }}
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
            Two challenge tracks. Three difficulty levels. One global community.
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
      <motion.section
        className="section border-t border-[var(--border)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="container w-full">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Two Tracks</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <motion.div
              className="card p-5 sm:p-7"
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
              <div className="flex flex-wrap gap-2">
                <span className="tag tag-accent">Days 1–21: Build</span>
                <span className="tag">Days 22–25: Vote</span>
                <span className="tag">Days 26–28: Review</span>
                <span className="tag">Day 29: Publish</span>
              </div>
            </motion.div>

            <motion.div
              className="card p-5 sm:p-7"
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
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="tag tag-accent">Days 1–21: Build</span>
                <span className="tag">Days 22–25: Vote</span>
                <span className="tag">Days 26–28: Review</span>
                <span className="tag">Day 29: Publish</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["CTF Writeup", "Tool Build", "Vuln Research", "Red Team"].map((t) => (
                  <span
                    key={t}
                    className="tag text-[0.65rem]"
                    style={{
                      background: "rgba(237,66,69,0.1)",
                      borderColor: "rgba(237,66,69,0.3)",
                      color: "#ed4245",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Track hubs ───────────────────────────────────────────────────── */}
      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="container w-full">
          <h2 className="text-3xl sm:text-4xl font-bold mb-2 lg:mb-3">Browse by track</h2>
          <p className="text-white/60 mb-6 sm:mb-8 max-w-2xl text-sm sm:text-base">
            Each month we post three tiers per track (Beginner, Intermediate, Advanced). View briefs, enrollment
            stats, and links to approved submissions.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <motion.div
              className="card p-6 sm:p-8 flex flex-col gap-4 min-h-[220px]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
              viewport={{ once: true, amount: 0.15 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🛠</span>
                <h3 className="text-2xl sm:text-3xl font-bold">Developer Track</h3>
              </div>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed flex-1">
                Ship apps, libraries, and tools. Monthly briefs with three difficulty tiers — enroll in Discord and
                submit before the build window closes.
              </p>
              <Link href="/challenges/developers" className="btn btn-primary w-fit">
                View challenges →
              </Link>
            </motion.div>

            <motion.div
              className="card p-6 sm:p-8 flex flex-col gap-4 min-h-[220px] border-[rgba(237,66,69,0.25)]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06, ease: EASE_OUT }}
              viewport={{ once: true, amount: 0.15 }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔒</span>
                <h3 className="text-2xl sm:text-3xl font-bold">Hacker Track</h3>
              </div>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed flex-1">
                CTF writeups, tooling, vuln research, and red team work — same monthly rhythm as developers, with
                security-focused briefs each tier.
              </p>
              <Link
                href="/challenges/hackers"
                className="btn w-fit"
                style={{
                  borderColor: "rgba(237,66,69,0.4)",
                  color: "#ed4245",
                }}
              >
                View challenges →
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── Monthly Archive ──────────────────────────────────────────────── */}
      <motion.section
        className="section border-t border-[var(--border)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
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
                          <div className="flex gap-2 mt-auto pt-2">
                            <a
                              href={sub.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn text-[0.65rem] py-1 px-2"
                            >
                              Repo
                            </a>
                            {sub.demoUrl && (
                              <a
                                href={sub.demoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-primary text-[0.65rem] py-1 px-2"
                              >
                                Demo
                              </a>
                            )}
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
      </motion.section>

      {/* ── Discord Commands Reference ───────────────────────────────────── */}
      <motion.section
        className="section border-t border-[var(--border)] text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
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
                desc: "Opens a link to the submission page, or use Submit on the site when signed in.",
              },
              {
                cmd: "Vote (site)",
                desc: `During the vote window (days 22–25 UTC), cast up to 4 votes (2 per track) at /vote/${voteMonth}.`,
              },
              {
                cmd: "/pulse",
                desc: "Once per month, pulls public GitHub activity for your profile month and awards XP.",
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
      </motion.section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <motion.section
        className="section flex min-h-[min(50dvh,560px)] items-center text-center border-t border-[var(--border)] bg-[var(--bg-card)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
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
      </motion.section>
    </>
  );
}
