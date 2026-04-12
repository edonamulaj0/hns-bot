"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getMembers, getLeaderboard, type MembersResponse, type LeaderboardResponse } from "@/lib/api";
import { githubProfileHref } from "@/lib/url";

export default function DevelopersPage() {
  const [data, setData] = useState<{
    members: MembersResponse | null;
    leaderboard: LeaderboardResponse | null;
  } | null>(null);

  useEffect(() => {
    Promise.allSettled([
      getMembers(),
      getLeaderboard(),
    ]).then(([membersRes, leaderboardRes]) => {
      setData({
        members: membersRes.status === "fulfilled" ? membersRes.value : null,
        leaderboard: leaderboardRes.status === "fulfilled" ? leaderboardRes.value : null,
      });
    });
  }, []);

  const membersResponse = data?.members ?? null;
  const leaderboardResponse = data?.leaderboard ?? null;

  const members = (membersResponse?.members ?? []);
  const leaderboard = (leaderboardResponse?.leaderboard ?? []);

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

  const totalMembers = members.length;

  return (
    <>
      <motion.section
        className="section-sm page-header min-h-hero-sm flex flex-col justify-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="label">Developer Community</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 font-bold">Our Developers</h1>
          <p className="text-white/60 max-w-[600px] text-sm sm:text-base">
            A growing community of {totalMembers} talented developers from around the world,
            working together to build amazing things and push the tech scene forward.
          </p>
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
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div
              className="p-4 sm:p-6 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]"
              variants={itemVariants}
            >
              <div className="text-3xl sm:text-4xl text-[var(--accent)] font-bold mb-2">
                {totalMembers}
              </div>
              <p className="text-white/60 text-sm sm:text-base">Active Developers</p>
            </motion.div>

            <motion.div
              className="p-4 sm:p-6 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]"
              variants={itemVariants}
            >
              <div className="text-3xl sm:text-4xl text-[var(--accent)] font-bold mb-2">
                🌍
              </div>
              <p className="text-white/60 text-sm sm:text-base">Worldwide</p>
            </motion.div>

            <motion.div
              className="p-4 sm:p-6 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]"
              variants={itemVariants}
            >
              <div className="text-3xl sm:text-4xl text-[var(--accent)] font-bold mb-2">
                Growing
              </div>
              <p className="text-white/60 text-sm sm:text-base">Every Month</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="section bg-[var(--bg-card)] border-t border-[var(--border)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Developer Spotlight</h2>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div
              className="card p-4 sm:p-6"
              variants={itemVariants}
            >
              <h3 className="text-[var(--accent)] mb-3 sm:mb-4 font-bold">💻 For Developers</h3>
              <ul className="text-white/60 text-xs sm:text-sm space-y-1.5 sm:space-y-2">
                <li>✓ Build real projects</li>
                <li>✓ Collaborate with peers</li>
                <li>✓ Earn reputation points</li>
                <li>✓ Showcase your portfolio</li>
                <li>✓ Join monthly challenges</li>
                <li>✓ Network in the community</li>
              </ul>
            </motion.div>

            <motion.div
              className="card p-4 sm:p-6"
              variants={itemVariants}
            >
              <h3 className="text-[var(--accent)] mb-3 sm:mb-4 font-bold">🏆 Leaderboard</h3>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((dev, idx) => (
                    <div key={dev.discordId} className={`flex justify-between text-xs sm:text-sm pb-2 ${idx < 4 ? 'border-b border-[var(--border)]' : ''}`}>
                      <span className="text-white">
                        #{idx + 1}{" "}
                        <span className="mono text-white/80">@{dev.discordId.slice(-8)}</span>
                      </span>
                      <span className="text-[var(--accent)] font-semibold">{dev.points} XP</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60 text-xs sm:text-sm">Leaderboard coming soon</p>
              )}
            </motion.div>

            <motion.div
              className="card p-4 sm:p-6"
              variants={itemVariants}
            >
              <h3 className="text-[var(--accent)] mb-3 sm:mb-4 font-bold">🎓 Resources</h3>
              <p className="text-white/60 text-xs sm:text-sm mb-3 sm:mb-4">
                Access tutorials, guides, and community projects to accelerate your learning.
              </p>
              <Link
                href="/blog"
                className="btn btn-primary w-full justify-center text-xs sm:text-sm"
              >
                Community blog →
              </Link>
            </motion.div>
          </motion.div>
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 sm:mb-10">All Developers</h2>
          {members.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {members.map((member) => (
                <motion.div
                  key={member.discordId}
                  className="card p-4 text-center"
                  variants={itemVariants}
                >
                  <h4 className="font-bold text-sm sm:text-base mb-1">Dev #{member.rank}</h4>
                  <p className="text-[var(--accent)] font-semibold text-xs sm:text-sm mb-2">
                    {member.points} pts
                  </p>
                  <p className="text-white/60 text-xs mb-3">
                    {member.bio || "Building awesome things"}
                  </p>
                  {githubProfileHref(member.github) && (
                    <a
                      href={githubProfileHref(member.github)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn w-full justify-center text-xs py-1.5"
                    >
                      View Profile
                    </a>
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="empty-state">
              <p>No developers yet. Join the community!</p>
            </div>
          )}
        </div>
      </motion.section>
    </>
  );
}
