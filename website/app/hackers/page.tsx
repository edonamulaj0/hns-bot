"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { getMembers, getPortfolio, type MembersResponse, type PortfolioResponse } from "@/lib/api";
import { ensureAbsoluteUrl, githubProfileHref } from "@/lib/url";

export default function HackersPage() {
  const [data, setData] = useState<{
    members: MembersResponse | null;
    portfolio: PortfolioResponse | null;
  } | null>(null);

  useEffect(() => {
    Promise.allSettled([
      getMembers(),
      getPortfolio(),
    ]).then(([membersRes, portfolioRes]) => {
      setData({
        members: membersRes.status === "fulfilled" ? membersRes.value : null,
        portfolio: portfolioRes.status === "fulfilled" ? portfolioRes.value : null,
      });
    });
  }, []);

  const membersResponse = data?.members ?? null;
  const portfolio = data?.portfolio ?? null;
  const members = (membersResponse?.members ?? []);
  const topMembers = members.slice(0, 12);

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
        <div className="container">
          <div className="label">Community</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 font-bold">Our Hackers</h1>
          <p className="text-white/60 max-w-[600px] text-sm sm:text-base">
            Meet the brilliant developers and builders driving innovation in our community.
            These are the hackers pushing boundaries with their projects and ideas.
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Top Contributors</h2>
          {topMembers.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {topMembers.map((member: any) => (
                <motion.div
                  key={member.discordId}
                  className="card bg-[var(--bg-card)] p-4 sm:p-6"
                  variants={itemVariants}
                >
                  <div className="flex justify-between items-start mb-3 sm:mb-4">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold mb-1">Hacker #{member.rank}</h3>
                      <p className="text-[var(--accent)] font-semibold text-sm sm:text-base">
                        {member.points} points
                      </p>
                    </div>
                  </div>

                  {member.bio && (
                    <p className="text-white/60 mb-3 sm:mb-4 text-xs sm:text-sm leading-relaxed">
                      {member.bio}
                    </p>
                  )}

                  {member.techStack && member.techStack.length > 0 && (
                    <div className="mb-3 sm:mb-4">
                      <p className="text-[0.65rem] sm:text-xs text-white/40 mb-2 sm:mb-3 uppercase tracking-wider">
                        Tech Stack
                      </p>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {member.techStack.map((tech: string) => (
                          <span key={tech} className="tag text-xs bg-[rgba(204,255,0,0.1)] border-[rgba(204,255,0,0.3)]">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    {githubProfileHref(member.github) && (
                      <a
                        href={githubProfileHref(member.github)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-3"
                      >
                        GitHub
                      </a>
                    )}
                    {ensureAbsoluteUrl(member.linkedin) && (
                      <a
                        href={ensureAbsoluteUrl(member.linkedin)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn text-xs sm:text-sm py-1 px-2 sm:py-2 sm:px-3"
                      >
                        LinkedIn
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="empty-state">
              <p>No hackers yet. Be the first to join!</p>
            </div>
          )}
        </div>
      </motion.section>

      {portfolio && Object.keys(portfolio.published).length > 0 && (
        <motion.section
          className="section bg-[var(--bg-card)] border-t border-[var(--border)]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="container">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Featured Projects</h2>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {Object.entries(portfolio.published).map(([month, submissions]) =>
                (submissions as any[]).slice(0, 3).map((submission) => (
                  <motion.div
                    key={submission.id}
                    className="card p-4 sm:p-6 flex flex-col gap-3 sm:gap-4"
                    variants={itemVariants}
                  >
                    <div>
                      <span className="tag text-xs mb-2 inline-block">
                        {month}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold mt-2">{submission.title}</h3>
                    </div>

                    <p className="grow text-white/60 text-xs sm:text-sm leading-relaxed">
                      {submission.description}
                    </p>

                    <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                      <span className="text-[var(--accent)] font-semibold text-xs sm:text-sm">
                        {submission.votes} votes
                      </span>
                      <div className="flex gap-2">
                        <a href={submission.repoUrl} target="_blank" rel="noopener noreferrer" className="btn text-xs py-1 px-2">
                          Repo
                        </a>
                        {submission.demoUrl && (
                          <a href={submission.demoUrl} target="_blank" rel="noopener noreferrer" className="btn text-xs py-1 px-2">
                            Demo
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        </motion.section>
      )}
    </>
  );
}
