"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  getPortfolio,
  getMembers,
  getLeaderboard,
  PHASE_META,
  type MembersResponse,
  type LeaderboardResponse,
  type PortfolioResponse,
} from "@/lib/api";

export default function HomePage() {
  const [data, setData] = useState<{
    portfolio: PortfolioResponse | null;
    members: MembersResponse | null;
    leaderboard: LeaderboardResponse | null;
  } | null>(null);
  useEffect(() => {
    Promise.allSettled([
      getPortfolio(),
      getMembers(),
      getLeaderboard(),
    ]).then(([portfolio, members, leaderboard]) => {
      setData({
        portfolio: portfolio.status === "fulfilled" ? portfolio.value : null,
        members: members.status === "fulfilled" ? members.value : null,
        leaderboard: leaderboard.status === "fulfilled" ? leaderboard.value : null,
      });
    });
  }, []);

  const portfolioData = data?.portfolio ?? null;
  const membersResponse = data?.members ?? null;
  const leaderboardResponse = data?.leaderboard ?? null;

  const membersData = (membersResponse?.members ?? []);
  const leaderboardData = (leaderboardResponse?.leaderboard ?? []);

  const phase = (portfolioData?.phase ?? "BUILD") as keyof typeof PHASE_META;
  const phaseMeta = PHASE_META[phase];
  const totalSubmissions = Object.values(
    portfolioData?.published ?? {},
  ).flat().length;
  const totalMembers = membersData.length ?? 0;
  const top3 = leaderboardData.slice(0, 3) ?? [];
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <>
      <motion.section
        className="section grid-bg flex min-h-hero items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="max-w-[720px]">
            <div className="fade-up mb-4 sm:mb-6 flex gap-4 items-center">
              <span
                className="phase-badge"
                style={{
                  background: `${phaseMeta.color}18`,
                  color: phaseMeta.color,
                  border: `1px solid ${phaseMeta.color}40`,
                }}
              >
                <span
                  className="pulse-dot"
                  style={{ background: phaseMeta.color }}
                />
                {phaseMeta.label}
              </span>
              <span className="mono dim text-xs sm:text-sm">{phaseMeta.description}</span>
            </div>

            <h1 className="fade-up fade-up-1 text-3xl sm:text-4xl lg:text-5xl xl:text-6xl mb-4 sm:mb-6">
              Build. Ship.{" "}
              <span className="text-[var(--accent)] block">
                Get seen.
              </span>
            </h1>

            <p className="fade-up fade-up-2 text-base sm:text-lg text-white/60 max-w-[540px] mb-6 sm:mb-8 lg:mb-10 leading-relaxed">
              Monthly build challenges for developers worldwide. Submit your projects, earn XP, and build a portfolio that speaks for itself.
            </p>

            <div className="fade-up fade-up-3 flex gap-3 sm:gap-4 flex-wrap">
              <a
                href="https://discord.gg/hackandstack"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Join the Discord →
              </a>
              <Link href="/hackers" className="btn">
                View Projects
              </Link>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="border-t border-b border-[var(--border)] py-6 sm:py-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="stat-block">
              <span className="value">{totalMembers}</span>
              <span className="label">Members</span>
            </div>
            <div className="stat-block">
              <span className="value">{totalSubmissions}</span>
              <span className="label">Projects shipped</span>
            </div>
            <div className="stat-block">
              <span className="value">
                {Object.keys(portfolioData?.published ?? {}).length}
              </span>
              <span className="label">Months active</span>
            </div>
            <div className="stat-block">
              <span className="value" style={{ color: "var(--accent-2)" }}>
                {portfolioData?.month}
              </span>
              <span className="label">Current month</span>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 lg:mb-10 gap-4">
            <div>
              <p className="mono text-[0.7rem] text-[var(--accent)] tracking-wider uppercase mb-2">
                Recent
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Latest Projects</h2>
            </div>
            <Link href="/hackers" className="btn whitespace-nowrap">
              All projects →
            </Link>
          </div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
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
                    <span className="mono dim text-[0.65rem] sm:text-xs">
                      {sub.month}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">
                    {sub.title}
                  </h3>
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
              <p>
                No projects published yet. The first batch ships at the end of
                the month.
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {top3.length > 0 && (
        <motion.section
          className="section bg-[var(--bg-card)] border-t border-b border-[var(--border)]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="container">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 sm:mb-8 lg:mb-10 gap-4">
              <div>
                <p className="mono text-[0.7rem] text-[var(--accent-2)] tracking-wider uppercase mb-2">
                  Top builders
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Leaderboard</h2>
              </div>
              <Link href="/developers" className="btn whitespace-nowrap">
                Full rankings →
              </Link>
            </div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {top3.map((member: any, i: number) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <motion.div
                    key={member.discordId}
                    className="card p-4 sm:p-5 lg:p-6 flex gap-4 items-center"
                    variants={itemVariants}
                  >
                    <span className="text-2xl sm:text-3xl flex-shrink-0">{medals[i]}</span>
                    <div>
                      <p className="mono text-xs sm:text-sm mb-1">
                        @{member.discordId.slice(-6)}
                      </p>
                      <p className="text-[var(--accent)] font-bold text-sm sm:text-base">
                        {member.points} XP
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </motion.section>
      )}

      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
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
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              {
                step: "01",
                title: "Join Discord",
                body: "Set up your profile with GitHub, LinkedIn, and tech stack via /setup-profile.",
              },
              {
                step: "02",
                title: "Build (Days 1–21)",
                body: "Ship a project of any tier. Submit it before day 22 with /submit.",
              },
              {
                step: "03",
                title: "Vote (Days 22–29)",
                body: "Community votes on approved submissions. Each vote earns the builder XP.",
              },
              {
                step: "04",
                title: "Get Published",
                body: "On day 30, results go live here. Your project lives permanently in the portfolio.",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                className="bg-[var(--bg)] p-4 sm:p-5 lg:p-6"
                variants={itemVariants}
              >
                <p className="mono text-[0.65rem] sm:text-xs text-white/40 mb-2 sm:mb-3">
                  {item.step}
                </p>
                <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3">
                  {item.title}
                </h3>
                <p className="text-white/60 text-xs sm:text-sm leading-relaxed">
                  {item.body}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </>
  );
}
