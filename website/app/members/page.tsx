"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import {
  getMembers,
  getLeaderboard,
  formatTechStack,
  githubAvatarUrl,
  discordAvatarUrl,
  type Member,
  type MemberSummary,
} from "@/lib/api";
import { ensureAbsoluteUrl, githubProfileHref } from "@/lib/url";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const STAGGER_MS = 0.08;

const XP_TABLE = [
  { action: "Submission approved", xp: 50 },
  { action: "Blog post shared", xp: 10 },
  { action: "Vote received", xp: 2 },
  { action: "GitHub Pulse (max/month)", xp: 100 },
];

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [leaderboard, setLeaderboard] = useState<MemberSummary[]>([]);
  const [search, setSearch] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"leaderboard" | "xp">("leaderboard");

  useEffect(() => {
    Promise.allSettled([getMembers(), getLeaderboard()]).then(
      ([membersRes, lbRes]) => {
        if (membersRes.status === "fulfilled") setMembers(membersRes.value.members);
        if (lbRes.status === "fulfilled") setLeaderboard(lbRes.value.leaderboard);
      },
    );
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter((m) => {
      const stack = formatTechStack(m.techStack);
      return (
        m.discordId.toLowerCase().includes(q) ||
        (m.bio ?? "").toLowerCase().includes(q) ||
        stack.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [members, search]);

  const top15 = leaderboard.slice(0, 15);
  const maxXp = top15[0]?.points ?? 1;

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
      <motion.section
        className="page-header min-h-[min(35dvh,360px)] flex flex-col justify-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
      >
        <div className="container w-full">
          <p className="label">Community</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">Members</h1>
          <p className="text-white/60 max-w-2xl text-sm sm:text-base">
            {members.length} developers and hackers building together. Explore profiles, rankings, and how XP is earned.
          </p>
        </div>
      </motion.section>

      <section className="section">
        <div className="container w-full">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            {/* ── Main area (70%) ─────────────────────────────────────── */}
            <div className="w-full lg:w-[70%]">
              {/* Search */}
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search by Discord ID, bio, or tech stack…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-dimmer)] outline-none transition-colors focus:border-[var(--accent)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                />
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <p>
                    {search ? "No members match your search." : "No members loaded yet."}
                  </p>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  key={search}
                >
                  {filtered.map((m) => {
                    const stack = formatTechStack(m.techStack);
                    const avatar = githubAvatarUrl(m.github) ?? discordAvatarUrl(m.discordId);
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
                            <div className="flex items-center gap-2">
                              {m.rank > 0 && m.rank <= 3 && (
                                <span className="text-sm">
                                  {m.rank === 1 ? "🥇" : m.rank === 2 ? "🥈" : "🥉"}
                                </span>
                              )}
                              <p className="mono text-xs truncate">@{m.discordId.slice(-8)}</p>
                            </div>
                            <p className="text-[var(--accent)] font-bold text-sm">
                              {m.points} XP · #{m.rank || "—"}
                            </p>
                          </div>
                        </div>

                        {m.bio && (
                          <p className="text-sm leading-relaxed text-[var(--text-dim)] mb-3 line-clamp-2">
                            {m.bio}
                          </p>
                        )}

                        {stack.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {stack.slice(0, 3).map((t) => (
                              <span key={t} className="tag text-[0.65rem]">{t}</span>
                            ))}
                            {stack.length > 3 && (
                              <span className="tag text-[0.65rem]">+{stack.length - 3}</span>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 mt-auto">
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
            </div>

            {/* ── Sidebar (30%) ───────────────────────────────────────── */}
            <div className="w-full lg:w-[30%] lg:sticky lg:top-[5rem] lg:self-start">
              <div className="card overflow-hidden">
                {/* Tab header */}
                <div className="flex border-b border-[var(--border)]">
                  {(["leaderboard", "xp"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSidebarTab(tab)}
                      className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                        sidebarTab === tab
                          ? "bg-[var(--bg)] text-[var(--accent)] border-b-2 border-[var(--accent)]"
                          : "bg-[var(--bg-card)] text-[var(--text-dim)] hover:text-[var(--text)]"
                      }`}
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {tab === "leaderboard" ? "Leaderboard" : "XP Breakdown"}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  {sidebarTab === "leaderboard" ? (
                    <motion.div
                      key="leaderboard"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                      className="p-4"
                    >
                      {top15.length === 0 ? (
                        <p className="mono dim text-xs text-center py-4">No data yet.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {top15.map((m, i) => {
                            const barW = maxXp > 0 ? Math.round((m.points / maxXp) * 100) : 0;
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
                                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                                      style={{ width: `${barW}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="mono text-[0.65rem] text-[var(--accent)] shrink-0 tabular-nums">
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: EASE_OUT }}
                      className="p-4"
                    >
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border)]">
                            <th className="pb-2 text-left mono text-[0.65rem] text-[var(--text-dim)] uppercase tracking-wider font-normal">
                              Action
                            </th>
                            <th className="pb-2 text-right mono text-[0.65rem] text-[var(--text-dim)] uppercase tracking-wider font-normal">
                              XP
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {XP_TABLE.map((row) => (
                            <tr key={row.action} className="border-b border-[var(--border)] last:border-0">
                              <td className="py-2.5 text-xs text-white/80">{row.action}</td>
                              <td className="py-2.5 text-right mono text-xs text-[var(--accent)] font-bold">
                                +{row.xp}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mono dim text-[0.6rem] mt-3 leading-relaxed">
                        XP is earned through community activity. Rankings update in real-time as points are awarded.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
