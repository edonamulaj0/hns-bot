"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AboutStatsPayload } from "@/lib/about-stats";
import { OpenStatsPanel } from "@/components/about/OpenStatsPanel";
import { AboutFaq } from "@/components/about/AboutFaq";
import { DiscordWidget } from "@/components/DiscordWidget";

export default function AboutClient({ openStats }: { openStats: AboutStatsPayload }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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
          <div className="label">Our Story</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 font-bold">About H4ck&Stack</h1>
          <p className="text-white/60 max-w-[600px] text-sm sm:text-base">
            A community-driven initiative to elevate the global developer ecosystem through collaboration,
            innovation, and continuous learning.
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
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Our Mission</h2>
            <p className="text-white/60 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
              H4ck&Stack exists to foster a vibrant developer community where talented individuals around the world can
              collaborate, build innovative projects, and grow together. We believe that by bringing developers together
              through challenges and shared projects, we can accelerate technological progress globally.
            </p>

            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">What We Stand For</h2>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {[
                { title: "Innovation", description: "Encouraging developers to experiment, and create the next big thing." },
                { title: "Community", description: "Building a supportive ecosystem where developers lift each other up." },
                { title: "Growth", description: "Creating opportunities for continuous learning and skill development." },
                { title: "Excellence", description: "Celebrating quality work and striving for the highest standards." },
                { title: "Opportunity", description: "Opening doors for developers to showcase their skills and build their futures." },
                { title: "Diversity", description: "Welcoming all developers regardless of background, experience, or interests." },
              ].map((value) => (
                <motion.div
                  key={value.title}
                  className="pl-4 sm:pl-6 border-l-2 border-[var(--accent)]"
                  variants={itemVariants}
                >
                  <h3 className="text-[var(--accent)] font-bold mb-1 sm:mb-2 text-sm sm:text-base">{value.title}</h3>
                  <p className="text-white/60 text-xs sm:text-sm">{value.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">How We Got Started</h2>
          <div className="max-w-[800px] mx-auto">
            <div className="leading-relaxed text-white/60 space-y-3 sm:space-y-4 text-xs sm:text-sm">
              <p>
                H4ck&Stack began as a passion project from developers who believed that the global tech scene had immense
                potential. We saw talented developers scattered across the world with limited opportunities to connect
                and collaborate.
              </p>
              <p>
                In 2024, we launched our first monthly challenge. What started as a small group of enthusiasts quickly
                grew into a thriving community of builders, thinkers, and innovators.
              </p>
              <p>
                Today, H4ck&Stack connects hundreds of developers, hosts monthly challenges, and provides a platform for
                ideas to become reality. We&apos;re just getting started, and the best is yet to come.
              </p>
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Get Involved</h2>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.div className="card p-4 sm:p-6 text-center" variants={itemVariants}>
              <h3 className="text-[var(--accent)] font-bold mb-2 sm:mb-3 text-base sm:text-lg">👨‍💻 Join as Developer</h3>
              <p className="text-white/60 mb-3 sm:mb-4 text-xs sm:text-sm">
                Participate in challenges, build projects, and grow with the community.
              </p>
              <Link href="/join" className="btn btn-primary w-full justify-center">
                Join Us
              </Link>
            </motion.div>

            <motion.div className="card p-4 sm:p-6 text-center" variants={itemVariants}>
              <h3 className="text-[var(--accent)] font-bold mb-2 sm:mb-3 text-base sm:text-lg">🤝 Partner With Us</h3>
              <p className="text-white/60 mb-3 sm:mb-4 text-xs sm:text-sm">
                Support the community and connect with talented developers.
              </p>
              <a href="mailto:contact@hackstack.dev" className="btn btn-primary w-full justify-center">
                Contact Us
              </a>
            </motion.div>

            <motion.div className="card p-4 sm:p-6 text-center sm:col-span-2 lg:col-span-1" variants={itemVariants}>
              <h3 className="text-[var(--accent)] font-bold mb-2 sm:mb-3 text-base sm:text-lg">💬 Community</h3>
              <p className="text-white/60 mb-3 sm:mb-4 text-xs sm:text-sm">
                Start on the onboarding page, then jump into Discord when you&apos;re ready.
              </p>
              <Link href="/join" className="btn btn-outline w-full justify-center">
                How to join →
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      <OpenStatsPanel data={openStats} />

      <motion.section
        className="section border-t border-[var(--border)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container max-w-lg mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Community</h2>
          <p className="text-sm text-white/55 mb-8 max-w-xl mx-auto">
            Hang out in Discord for voice, feedback, and challenge announcements. The widget below shows who&apos;s around
            right now.
          </p>
          <DiscordWidget />
        </div>
      </motion.section>

      <AboutFaq />

      <motion.section
        className="section bg-[var(--bg-card)] border-t border-[var(--border)] text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Built by Cyphera</h2>
          <p className="text-white/60 max-w-[600px] mx-auto text-xs sm:text-sm">
            H4ck&Stack is a community project built by developers, for developers. We&apos;re proud to be part of the growing
            global tech ecosystem.
          </p>
        </div>
      </motion.section>
    </>
  );
}
