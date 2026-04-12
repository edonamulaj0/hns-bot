"use client";

import { motion } from "framer-motion";
import { getPortfolio } from "@/lib/api";
import { useEffect, useState } from "react";

export default function ChallengesPage() {
  const [portfolio, setPortfolio] = useState<any>(null);

  useEffect(() => {
    getPortfolio().then(setPortfolio).catch(console.error);
  }, []);

  const challenges = [
    {
      id: "hackers-beginner",
      category: "Hackers",
      level: "Beginner",
      description: "Perfect for those starting their coding journey",
      difficulty: 1,
    },
    {
      id: "hackers-intermediate",
      category: "Hackers",
      level: "Intermediate",
      description: "For developers ready to tackle more complex problems",
      difficulty: 2,
    },
    {
      id: "hackers-advanced",
      category: "Hackers",
      level: "Advanced",
      description: "Hardcore challenges for experienced builders",
      difficulty: 3,
    },
    {
      id: "developers-beginner",
      category: "Developers",
      level: "Beginner",
      description: "Learn fundamental development practices",
      difficulty: 1,
    },
    {
      id: "developers-intermediate",
      category: "Developers",
      level: "Intermediate",
      description: "Build real-world applications and systems",
      difficulty: 2,
    },
    {
      id: "developers-advanced",
      category: "Developers",
      level: "Advanced",
      description: "Enterprise-level projects and architecture",
      difficulty: 3,
    },
  ];

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
        className="section-sm page-header min-h-hero-sm flex flex-col justify-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container w-full">
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

      <motion.section
        className="section min-h-section"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="container w-full">
          <h2 className="text-3xl sm:text-4xl font-bold mb-2 lg:mb-3">Challenge Categories</h2>
          <p className="text-white/60 mb-6 sm:mb-8 lg:mb-12 max-w-2xl text-sm sm:text-base">
            Choose your path and challenge level. Each month brings new prompts and opportunities to showcase your skills.
          </p>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {challenges.map((challenge) => (
              <motion.div
                key={challenge.id}
                className="card p-4 sm:p-6 cursor-pointer hover:border-[var(--accent)] transition-all duration-300"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-3 sm:mb-4 flex flex-wrap gap-2">
                  <span className="tag text-xs">
                    {challenge.category}
                  </span>
                  <span
                    className="tag text-xs"
                    style={{
                      background: `rgba(204,255,0,${
                        challenge.difficulty === 1 ? 0.1 : challenge.difficulty === 2 ? 0.15 : 0.2
                      })`,
                      borderColor: "rgba(204,255,0,0.3)",
                    }}
                  >
                    {challenge.level}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{challenge.level} - {challenge.category}</h3>
                <p className="text-white/60 text-sm sm:text-base mb-4">{challenge.description}</p>
                <div className="flex gap-1">
                  <span className="text-xs text-[var(--accent)] font-bold font-mono">
                    {"⭐".repeat(challenge.difficulty)}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="section min-h-section border-t border-b border-[var(--border)] bg-[var(--bg-card)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="container w-full">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8 lg:mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                step: "1",
                title: "Join Discord",
                desc: "Connect to our community server to stay updated on new challenges.",
              },
              {
                step: "2",
                title: "Pick Category & Level",
                desc: "Choose between Hackers or Developers, then pick your difficulty level.",
              },
              {
                step: "3",
                title: "Build Your Project",
                desc: "Create your project within the month using any tools you prefer.",
              },
              {
                step: "4",
                title: "Submit via /submit",
                desc: "Use the Discord bot command to submit your project with repo and demo links.",
              },
              {
                step: "5",
                title: "Community Votes",
                desc: "Get feedback and votes from the community during the voting phase.",
              },
              {
                step: "6",
                title: "Get Published",
                desc: "Top projects get featured and you earn reputation points.",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-4 sm:p-6"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--accent)] text-black flex items-center justify-center font-bold text-lg sm:text-xl mx-auto mb-3 sm:mb-4">
                  {item.step}
                </div>
                <h3 className="text-base sm:text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-white/60 text-xs sm:text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="section min-h-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="container w-full">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 sm:mb-8">Current & Past Challenges</h2>
          {portfolio?.published && Object.keys(portfolio.published).length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {Object.entries(portfolio.published)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 6)
                .map(([month, submissions]: [string, any]) => (
                  <motion.div
                    key={month}
                    className="card p-4 sm:p-6"
                    variants={itemVariants}
                  >
                    <span className="tag tag-accent text-xs mb-3 inline-block">{month}</span>
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{month} Challenge</h3>
                    <p className="text-white/60 text-sm mb-4">
                      {(submissions as any[]).length} submissions
                    </p>
                    <a href={`/challenges/${month}`} className="btn btn-primary w-full justify-center text-xs sm:text-sm">
                      View Submissions →
                    </a>
                  </motion.div>
                ))}
            </motion.div>
          ) : (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p>No challenges published yet. Check back soon!</p>
            </motion.div>
          )}
        </div>
      </motion.section>

      <motion.section
        className="section min-h-[min(55dvh,640px)] border-t border-[var(--border)] text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="container w-full max-w-3xl py-[clamp(2rem,6vh,3rem)]">
          <p className="mono mb-3 text-[0.7rem] uppercase tracking-wider text-[var(--accent)]">
            Discord bot
          </p>
          <h2 className="mb-6 text-2xl font-bold sm:text-3xl md:text-4xl">
            Commands that power the loop
          </h2>
          <ul className="space-y-4 text-left text-sm text-white/70 sm:text-base">
            {[
              {
                cmd: "/setup-profile",
                desc: "Modal to set bio, GitHub, LinkedIn, and tech stack. Required for a full portfolio card.",
              },
              {
                cmd: "/submit",
                desc: "Submit your monthly project (tier, title, description, repo, optional demo). Only during BUILD phase (days 1–21 UTC).",
              },
              {
                cmd: "/share-blog",
                desc: "Share an article URL; earns XP and appears on the site blog feed.",
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
          <p className="mono mt-6 text-xs text-white/45">
            Voting uses buttons on posts in the voting channel during VOTE phase; publishing runs on schedule from the worker cron.
          </p>
        </div>
      </motion.section>

      <motion.section
        className="section flex min-h-[min(50dvh,560px)] items-center text-center border-t border-[var(--border)] bg-[var(--bg-card)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.5 }}
      >
        <div className="container max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Ready to Challenge Yourself?</h2>
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
