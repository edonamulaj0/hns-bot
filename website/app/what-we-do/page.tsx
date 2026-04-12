"use client";

import { motion } from "framer-motion";

export default function WhatWeDoPage() {
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
          <div className="label">Our Mission</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 lg:mb-6">
            What We Do
          </h1>
          <motion.p
            className="text-sm sm:text-base text-white/60 max-w-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            H4cknStack is a global community platform that brings hackers and developers together
            to build, innovate, and grow through monthly challenges and collaborative projects.
          </motion.p>
        </div>
      </motion.section>

      <motion.section
        className="section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              {
                icon: "🎯",
                title: "Monthly Challenges",
                desc: "Two tracks, three difficulty levels. Build what you want and submit via Discord.",
              },
              {
                icon: "👥",
                title: "Global Community",
                desc: "Connect with hackers and developers worldwide. Share knowledge and collaborate on projects.",
              },
              {
                icon: "📈",
                title: "Growth & Learning",
                desc: "Level up your skills through real-world projects. Earn reputation and climb the leaderboard.",
              },
              {
                icon: "🚀",
                title: "Showcase Your Work",
                desc: "Build your portfolio with real projects. Get featured and gain visibility.",
              },
              {
                icon: "🤝",
                title: "Collaboration",
                desc: "Work with other builders. Learn different perspectives and improve together.",
              },
              {
                icon: "💡",
                title: "Ideas to Reality",
                desc: "Turn concepts into working products. We support you through the entire journey.",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                className="card p-4 sm:p-6 h-full"
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-[var(--accent)] text-lg sm:text-xl font-bold mb-3 sm:mb-4">
                  {item.icon} {item.title}
                </h3>
                <p className="text-white/60 text-sm sm:text-base">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.section
        className="section border-t border-[var(--border)]"
        style={{ background: "var(--bg-card)" }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="container">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 sm:mb-12 text-center">Why Join H4cknStack?</h2>
          <div className="max-w-4xl mx-auto">
            {[
              {
                num: "1",
                title: "Build What Excites You",
                desc: "No gatekeeping. Choose your challenge track and difficulty level. Use any tech stack, any approach. Creativity matters.",
              },
              {
                num: "2",
                title: "Get Community Feedback",
                desc: "Your projects get seen by the community. Get votes, feedback, and recognition for your work. Every submission matters.",
              },
              {
                num: "3",
                title: "Build Your Reputation",
                desc: "Earn points, climb the leaderboard, and establish yourself as a builder. Your portfolio lives permanently on H4cknStack.",
              },
              {
                num: "4",
                title: "Join a Global Movement",
                desc: "Connect with builders from around the world. Share ideas, collaborate, and be part of a community that celebrates creation.",
              },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                className="flex gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10 items-start"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[var(--accent)] text-black flex items-center justify-center font-bold text-lg sm:text-xl flex-shrink-0">
                  {item.num}
                </div>
                <div className="flex-1 pt-1 sm:pt-2">
                  <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-white/60 text-sm sm:text-base">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    </>
  );
}
