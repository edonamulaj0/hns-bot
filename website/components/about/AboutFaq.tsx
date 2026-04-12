"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is H4cknStack?",
    a: "H4cknStack is a global community for developers and security researchers. Each month we run structured challenge cycles: a developer track for shipping software projects and a hacker track for security work like CTF writeups, tools, and research. You join on Discord, submit through the bot, vote during the vote window, and see approved work published on this site with XP and rankings.",
  },
  {
    q: "Who can join?",
    a: "Anyone who wants to build or break things responsibly. We welcome students, hobbyists, and professionals. You need a Discord account to participate in submissions and voting; there is no gatekeeping beyond following server rules and treating others with respect.",
  },
  {
    q: "What's the difference between the Developer and Hacker tracks?",
    a: "The Developer track is a ~21-day build window for a software project of any stack or idea, submitted with /submit before the deadline. The Hacker track runs in shorter cycles focused on security outcomes: writeups, tools, vuln research, and similar work, submitted with /submit and the hacker track option. Both earn XP and appear in the portfolio when approved.",
  },
  {
    q: "Can I use any tech stack or programming language?",
    a: "Yes for the developer track. Use whatever languages, frameworks, or platforms fit your project. We care that you ship something real and document it clearly — not which logo is on the readme.",
  },
  {
    q: "How are projects judged?",
    a: "Community voting drives recognition during the vote window. Admins approve submissions first for quality and rule compliance. Votes translate into XP for builders. It is peer-driven and transparent rather than a closed jury.",
  },
  {
    q: "What is XP and how do I earn it?",
    a: "XP is the on-server points total shown on your profile and the leaderboard. You earn it from approved submissions, blog shares, votes on your work, GitHub pulse, and other activities the bot tracks. It is a fun, cumulative signal of participation — not a currency.",
  },
  {
    q: "Can I submit more than one project per month?",
    a: "The monthly challenge is designed around one strong submission per member per cycle so everyone gets a fair shot at attention and votes. If you are unsure, ask in Discord before the submission window closes.",
  },
  {
    q: "What happens if I miss the submission deadline?",
    a: "Late submissions are not accepted for that cycle — the bot enforces the calendar. You can still participate in voting, community channels, and the next month’s build phase. Mark your calendar for day 22 when submissions close.",
  },
  {
    q: "How does the Hacker track work — what are the challenge types?",
    a: "Hacker track entries include CTF writeups, security tooling, vulnerability research, red-team style documentation, and related work. You submit evidence and links through /submit with the hacker track. Cycles are shorter than the full developer window; check the current month’s announcements in Discord for exact dates.",
  },
  {
    q: "Is this free?",
    a: "Yes. Joining the Discord, using the bot, and appearing on the site are free. We may partner with sponsors in the future, but the core community loop stays accessible.",
  },
];

export function AboutFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section border-t border-[var(--border)]">
      <div className="container max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">FAQ</h2>
        <ul className="space-y-2">
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q} className="rounded border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 text-left px-4 py-4 sm:px-5 sm:py-4 hover:bg-white/[0.03] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-sm sm:text-base pr-2">{item.q}</span>
                  <span className="mono text-[var(--accent)] shrink-0 text-lg">{isOpen ? "−" : "+"}</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 sm:px-5 pb-5 text-sm text-white/65 leading-relaxed border-t border-[var(--border)] pt-4">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
