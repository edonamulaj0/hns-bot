"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "What is H4ck&Stack?",
    a: (
      <>
        H4ck&Stack is a global community for developers and security researchers. Each month we run a{" "}
        <strong className="text-white/85">shared UTC calendar</strong> for two tracks: a developer track for shipping
        software projects and a hacker track for security work like CTF writeups, tools, and research. Join on Discord,
        sign in on this site, then <strong className="text-white/85">submit</strong> and <strong className="text-white/85">vote</strong> from the website (including the vote banner on the{" "}
        <Link href="/challenges" className="text-[var(--accent)] hover:underline">
          Challenges
        </Link>{" "}
        page when voting is open). Approved work appears here with XP and rankings.
      </>
    ),
  },
  {
    q: "Who can join?",
    a: "Anyone who wants to build or break things responsibly. We welcome students, hobbyists, and professionals. You need a Discord account to sign in and participate; there is no gatekeeping beyond following server rules and treating others with respect.",
  },
  {
    q: "What's the difference between the Developer and Hacker tracks?",
    a: (
      <>
        Both tracks use the <strong className="text-white/85">same monthly calendar</strong>: roughly days 1–21 to build
        and submit, days 22–25 to vote (UTC). The developer track is for shipping a software project in any stack. The
        hacker track is for security outcomes—writeups, tooling, research, and similar work. Enroll for the hacker track
        with <code className="mono text-[var(--accent)]">/enroll</code> in Discord, then complete your submission on the
        site. Both earn XP and can appear in the portfolio when approved.
      </>
    ),
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
    a: (
      <>
        XP is your cumulative points total on H4ck&Stack. It powers the leaderboard and determines your Discord role
        progression: Newcomer → Builder → Veteran → Elite.
        <br />
        <br />
        XP sources:
        <br />- Submission approved: +50 (per submission)
        <br />- Vote received: +2 (per vote on your work)
        <br />- Article shared: +10 (per article)
        <br />- Challenge enrollment bonus: +25 (on first approval)
        <br />- First submission ever: +10 (one-time bonus)
        <br />
        <br />
        On Discord, <code>/pulse</code> is a preview only: it shows GitHub counts for the month and an estimated
        month-end pulse XP from the community formula (capped); it does not change your XP.
      </>
    ),
  },
  {
    q: "Can I submit more than one project per month?",
    a: "The monthly challenge is designed around one strong submission per member per month so everyone gets a fair shot at attention and votes. If you are unsure, ask in Discord before the submission window closes.",
  },
  {
    q: "What happens if I miss the submission deadline?",
    a: "Late submissions are not accepted for that month — the calendar closes submissions after the build window. You can still participate in voting, community channels, and the next month’s build phase. Watch for day 21 (UTC) when submissions close.",
  },
  {
    q: "How does the Hacker track work — what are the challenge types?",
    a: "Hacker track entries include CTF writeups, security tooling, vulnerability research, red-team style documentation, and related work. You use the same monthly build and vote windows as developers. Enroll with /enroll in Discord, then submit on the site. Check Discord announcements for anything special in a given month.",
  },
  {
    q: "Is this free?",
    a: "Yes. Joining the Discord, using the site, and appearing in the community are free. We may partner with sponsors in the future, but the core community loop stays accessible.",
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
                  className="w-full min-h-12 flex items-center justify-between gap-4 text-left px-4 py-3 sm:px-5 sm:py-4 hover:bg-white/[0.03] transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-sm sm:text-base pr-2">{item.q}</span>
                  <span className="mono text-[var(--accent)] shrink-0 w-6 h-6 inline-flex items-center justify-center text-xl leading-none">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="px-4 sm:px-5 pb-5 text-sm text-white/65 leading-relaxed border-t border-[var(--border)] pt-4">
                      {item.a}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
