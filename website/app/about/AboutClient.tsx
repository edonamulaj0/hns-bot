"use client";

import Link from "next/link";
import type { AboutStatsPayload } from "@/lib/about-stats";
import { BUILDER_SITE_URL, WIKI_URL } from "@/lib/branding";
import { OpenStatsPanel } from "@/components/about/OpenStatsPanel";
import { AboutFaq } from "@/components/about/AboutFaq";
import { AnimateIn } from "@/components/AnimateIn";

export default function AboutClient({ openStats }: { openStats: AboutStatsPayload }) {
  return (
    <>
      <section
        className="section-sm page-header min-h-hero-sm flex flex-col justify-center"
      >
        <div className="container">
          <div className="label">Our Story</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-3 sm:mb-4 font-bold">About H4ck&Stack</h1>
          <p className="text-white/60 max-w-[640px] text-sm sm:text-base leading-relaxed">
            It started with wanting a place to talk about tech, make friends, and share what we&apos;re learning—no
            pitch deck, just people who like building things and nerding out together.
          </p>
        </div>
      </section>

      <AnimateIn
        className="section"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Why we&apos;re here</h2>
            <p className="text-white/60 mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
              The Discord was always meant to be social first: hang out, swap resources, ask the &quot;how does this even
              work?&quot; questions, and actually know each other. Monthly challenges and the site came later as a way
              to stir the pot—something optional to rally around so the server doesn&apos;t go quiet again, and so new
              faces have an easy on-ramp if they want one.
            </p>
            <p className="text-white/60 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
              You don&apos;t have to ship a project to stick around. Lurkers, beginners, career switchers, and folks who
              have forgotten more than we&apos;ll ever know are all welcome. More people, more code, more hugs—and more
              of the messes worth showing up for.
            </p>

            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">What We Stand For</h2>
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12"
            >
              {[
                { title: "Innovation", description: "Encouraging developers to experiment, and create the next big thing." },
                { title: "Community", description: "Building a supportive ecosystem where developers lift each other up." },
                { title: "Growth", description: "Creating opportunities for continuous learning and skill development." },
                { title: "Excellence", description: "Celebrating quality work and striving for the highest standards." },
                { title: "Opportunity", description: "Opening doors for developers to showcase their skills and build their futures." },
                { title: "Diversity", description: "Welcoming all developers regardless of background, experience, or interests." },
              ].map((value) => (
                <div
                  key={value.title}
                  className="pl-4 sm:pl-6 border-l-2 border-[var(--accent)]"
                >
                  <h3 className="text-[var(--accent)] font-bold mb-1 sm:mb-2 text-sm sm:text-base">{value.title}</h3>
                  <p className="text-white/60 text-xs sm:text-sm">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateIn>

      <AnimateIn
        className="section bg-[var(--bg-card)] border-t border-[var(--border)]"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">How we got started</h2>
          <div className="max-w-[800px] mx-auto">
            <div className="leading-relaxed text-white/60 space-y-3 sm:space-y-4 text-xs sm:text-sm">
              <p>
                Before there were tracks, vote windows, or a website, there was just a wish for a community I could talk
                tech with—to be friends, share resources, and not take everything so seriously all the time. For a while
                it was basically a hangout server: one season of that was a lot of fun. Then, like a lot of small
                servers, things slowly went quiet.
              </p>
              <p>
                Instead of calling that the end, we tried the opposite: give people a light structure if they want
                it—monthly challenges, a bot, a proper home on the web—so there&apos;s always something happening for
                folks who thrive on a deadline, while everyone else can still just chat, joke, and show up as they are.
              </p>
              <p>
                The hope is simple: grow the friend list, grow the community, and end up with more people, more code,
                and more of the small moments that make a server feel like a place—not a chore.
              </p>
              <p>
                The hacker track came when enough security-minded people wanted their own lane for writeups and tooling;
                the designer track followed so visual builders could ship mockups, posters, and brand work on the same
                monthly calendar. Developer, hacker, and designer all share one UTC+2 rhythm—build, vote, publish—and the
                same XP loop on the site. The platform—bot, site, and database—is built and maintained by{" "}
                <a
                  href={BUILDER_SITE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] hover:underline"
                >
                  Cyphera
                </a>
                , a tech company in Prishtina, Kosovo.
              </p>
            </div>
          </div>
        </div>
      </AnimateIn>

      <AnimateIn
        className="section"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center">Get Involved</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            <div className="card p-4 sm:p-6 text-center">
              <h3 className="text-[var(--accent)] font-bold mb-2 sm:mb-3 text-base sm:text-lg">🤝 Partner With Us</h3>
              <p className="text-white/60 text-xs sm:text-sm">
                Support the community and connect with talented developers. For partnerships or questions, reach a
                moderator in our Discord server.
              </p>
            </div>

            <div className="card p-4 sm:p-6 text-center">
              <h3 className="text-[var(--accent)] font-bold mb-2 sm:mb-3 text-base sm:text-lg">💬 Community</h3>
              <p className="text-white/60 text-xs sm:text-sm">
                Hang out in Discord for voice, feedback, and announcements. New here? Read how we work on the join page.
              </p>
            </div>

            <div className="card p-4 sm:p-6 text-center flex flex-col">
              <h3 className="text-[var(--accent)] font-bold mb-2 sm:mb-3 text-base sm:text-lg">📚 Free Resources</h3>
              <p className="text-white/60 text-xs sm:text-sm flex-1">
                Developer tools, security research, educational content — curated and free.
              </p>
              <a
                href={WIKI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Browse wiki →
              </a>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <Link href="/join" className="btn btn-primary inline-flex justify-center">
              Join Us
            </Link>
          </div>
        </div>
      </AnimateIn>

      <OpenStatsPanel data={openStats} />

      <AnimateIn
        className="section border-t border-[var(--border)]"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container max-w-lg mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Community</h2>
          <p className="text-sm text-white/55 max-w-xl mx-auto">
            Hang out in Discord for voice, feedback, and announcements. Nothing is mandatory—you can ignore challenges
            entirely and still belong.
          </p>
        </div>
      </AnimateIn>

      <AboutFaq />

      <AnimateIn
        className="section bg-[var(--bg-card)] border-t border-[var(--border)] text-center"
        hidden={{ opacity: 0 }}
        visible={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">
            Built by{" "}
            <a
              href={BUILDER_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline"
            >
              Cyphera
            </a>
          </h2>
          <p className="text-white/60 max-w-[600px] mx-auto text-xs sm:text-sm">
            H4ck&Stack is a community project built by developers, for developers. We&apos;re proud to be part of the growing
            global tech ecosystem.
          </p>
        </div>
      </AnimateIn>
    </>
  );
}
