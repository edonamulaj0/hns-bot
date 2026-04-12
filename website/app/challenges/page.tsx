"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getPortfolio, PHASE_META, type PortfolioResponse } from "@/lib/api";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const STAGGER_MS = 0.08;

const CHALLENGES = [
  {
    id: "developers-beginner",
    category: "Developers",
    level: "Beginner",
    description: "Learn fundamental development practices by building small but complete projects.",
    difficulty: 1,
  },
  {
    id: "developers-intermediate",
    category: "Developers",
    level: "Intermediate",
    description: "Build real-world applications with proper architecture and deployment.",
    difficulty: 2,
  },
  {
    id: "developers-advanced",
    category: "Developers",
    level: "Advanced",
    description: "Enterprise-level projects pushing the boundaries of modern engineering.",
    difficulty: 3,
  },
  {
    id: "hackers-beginner",
    category: "Hackers",
    level: "Beginner",
    description: "CTF writeups and basic security analysis. Great for learning offensive security.",
    difficulty: 1,
    challengeTypes: ["CTF Writeup"],
  },
  {
    id: "hackers-intermediate",
    category: "Hackers",
    level: "Intermediate",
    description: "Build security tools, analyze vulnerabilities, and document your methodology.",
    difficulty: 2,
    challengeTypes: ["Tool Build", "Vuln Research"],
  },
  {
    id: "hackers-advanced",
    category: "Hackers",
    level: "Advanced",
    description: "Red team simulations, complex exploit development, and original research.",
    difficulty: 3,
    challengeTypes: ["Red Team", "Vuln Research", "Tool Build"],
  },
];

export default function ChallengesPage() {
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);

  useEffect(() => {
    getPortfolio().then(setPortfolio).catch(console.error);
  }, []);

  const phase = portfolio?.phase ?? "BUILD";
  const phaseMeta = PHASE_META[phase];
  const currentMonth = portfolio?.month ?? "";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: STAGGER_MS, delayChildren: 0.15 },
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
          <div className="label">Build & Compete</div>
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
            Build what you want, submit via Discord, and compete for recognition.
          </motion.p>
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
                Build a full project over a <strong className="text-white">21-day cycle</strong>.
                Choose a tier (Beginner, Intermediate, or Advanced) and ship something real — an
                app, a library, a tool, anything.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="tag tag-accent">Days 1–21: Build</span>
                <span className="tag">Days 22–29: Vote</span>
                <span className="tag">Day 30: Publish</span>
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
                Security-focused <strong className="text-white">2-week cycles</strong> (A: days 1–14, B: days 15–28).
                Submit CTF writeups, build security tools, research vulnerabilities, or run red team simulations.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="tag tag-accent">Build: 11 days</span>
                <span className="tag">Vote: 3 days</span>
                <span className="tag">Buffer: days 29–31</span>
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

      {/* ── Challenge Categories Grid ────────────────────────────────────── */}
      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        viewport={{ once: true, amount: 0.15 }}
      >
        <div className="container w-full">
          <h2 className="text-3xl sm:text-4xl font-bold mb-2 lg:mb-3">Challenge Categories</h2>
          <p className="text-white/60 mb-6 sm:mb-8 lg:mb-12 max-w-2xl text-sm sm:text-base">
            Choose your path and challenge level. Each month brings new prompts and opportunities to showcase your skills.
          </p>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {CHALLENGES.map((challenge) => (
              <motion.div
                key={challenge.id}
                className="card p-4 sm:p-6"
                variants={itemVariants}
              >
                <div className="mb-3 sm:mb-4 flex flex-wrap gap-2">
                  <span className="tag text-xs">{challenge.category}</span>
                  <span
                    className="tag text-xs"
                    style={{
                      background: `rgba(204,255,0,${challenge.difficulty === 1 ? 0.1 : challenge.difficulty === 2 ? 0.15 : 0.2})`,
                      borderColor: "rgba(204,255,0,0.3)",
                    }}
                  >
                    {challenge.level}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">
                  {challenge.level} — {challenge.category}
                </h3>
                <p className="text-white/60 text-sm sm:text-base mb-3">{challenge.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--accent)] font-bold font-mono">
                    {"⭐".repeat(challenge.difficulty)}
                  </span>
                  {"challengeTypes" in challenge && challenge.challengeTypes && (
                    <div className="flex flex-wrap gap-1">
                      {challenge.challengeTypes.map((t) => (
                        <span
                          key={t}
                          className="tag text-[0.6rem]"
                          style={{
                            background: "rgba(237,66,69,0.08)",
                            borderColor: "rgba(237,66,69,0.25)",
                            color: "#ed4245",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
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
                            @{sub.user?.discordId?.slice(-8) ?? "—"}
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
              { cmd: "/setup-profile", desc: "Modal to set bio, GitHub, LinkedIn, and tech stack. Required for a full portfolio card." },
              { cmd: "/submit", desc: "Submit your project or hacker challenge. Developer track: days 1–21. Hacker track: days 1–11 or 15–25." },
              { cmd: "/share-blog", desc: "Share an article URL; earns XP and appears on the site blog feed." },
              { cmd: "/pulse", desc: "Once per month, pulls public GitHub activity for your profile month and awards XP." },
              { cmd: "/leaderboard", desc: "Shows top builders by points for the current month in Discord." },
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
          <a
            href="https://discord.gg/hackandstack"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex text-sm sm:text-base"
          >
            Join Discord →
          </a>
        </div>
      </motion.section>
    </>
  );
}
