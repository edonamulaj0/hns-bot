import type { Metadata } from "next";
import Link from "next/link";

export const runtime = "edge";
import { DISCORD_INVITE_URL, WIKI_URL } from "@/lib/branding";

export const metadata: Metadata = {
  title: "Join Us | H4ck&Stack",
  description:
    "Start building with H4ck&Stack: join Discord, set up your profile, pick a track, and ship your first project.",
};

const ROLES = [
  { name: "Builder", desc: "Submitted at least one project" },
  { name: "Hacker", desc: "Submitted a hacker track entry" },
  { name: "Veteran", desc: "3+ months active" },
  { name: "Admin", desc: "Community team" },
];

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <>
      <section className="section-sm page-header min-h-[min(50dvh,520px)] flex flex-col justify-center">
        <div className="container max-w-3xl">
          <p className="label mb-2">Welcome</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5">Ready to build?</h1>
          {sp.error === "not_member" && (
            <div
              className="mb-6 rounded border p-4 text-sm leading-relaxed"
              style={{
                borderColor: "#7c2feb59",
                background: "#7c2feb14",
              }}
            >
              Sign-in requires membership in the H4ck&Stack Discord. Join with the link below, then try{" "}
              <strong className="text-white">Sign in with Discord</strong> again.
            </div>
          )}
          {sp.error === "oauth" && (
            <div
              className="mb-6 rounded border p-4 text-sm text-white/80"
              style={{
                borderColor: "#7c2feb59",
                background: "#7c2feb14",
              }}
            >
              Discord sign-in could not be completed. Please try again.
            </div>
          )}
          <p className="text-base sm:text-lg text-white/65 leading-relaxed mb-8 max-w-2xl">
            H4ck&Stack is a global community where developers and security researchers ship real work every month — projects,
            writeups, and tools — and earn XP with a public portfolio on the site. You submit and vote on this site; Discord is
            where the community hangs out — including <code className="mono text-[var(--accent)]">/enroll</code> for the hacker
            track — with dedicated spaces for builders and security-focused work.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Join Discord →
            </a>
            <Link href="/members?view=projects" className="btn btn-outline">
              Browse Projects
            </Link>
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--border)]">
        <div className="container max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">Your first week</h2>
          <div className="mb-10 rounded border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 sm:px-5 sm:py-4">
            <p className="mono text-[0.65rem] text-white/40 uppercase tracking-wider mb-1">Resources</p>
            <p className="text-sm sm:text-base text-white/65 leading-relaxed">
              Browse free tools and resources at{" "}
              <a
                href={WIKI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline font-medium"
              >
                wiki.h4cknstack.com
              </a>{" "}
              →
            </p>
          </div>

          <div className="relative border-l-2 border-[var(--border)] pl-8 sm:pl-10 space-y-14">
            {[
              {
                title: "Join the Discord server",
                body: (
                  <>
                    <p className="text-white/65 text-sm sm:text-base leading-relaxed">
                      Click the invite link above. The server has channels for both tracks —{" "}
                      <strong className="text-white/90">#dev-chat</strong> for builders and{" "}
                      <strong className="text-white/90">#hacker-lounge</strong> for security folks.
                    </p>
                  </>
                ),
              },
              {
                title: "Set up your profile",
                body: (
                  <>
                    <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-4">
                      Sign in on this site with Discord, then open{" "}
                      <strong className="text-white/85">Profile</strong> from your avatar menu. Add GitHub, LinkedIn,
                      bio, and tech stack for your public Members card. In Discord you can also run{" "}
                      <code className="mono text-[var(--accent)]">/profile</code> for a link to the same page.
                    </p>
                  </>
                ),
              },
              {
                title: "Pick your track",
                body: (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="card p-4 sm:p-5">
                      <p className="text-xl mb-2">🛠</p>
                      <h3 className="font-bold text-[var(--accent)] mb-2">Developer Track</h3>
                      <p className="text-sm text-white/60 leading-relaxed">
                        Build a project over 21 days. Any stack, any idea. Submit on the site from{" "}
                        <strong className="text-white/80">Submit</strong> in your avatar menu or from the{" "}
                        <Link href="/challenges" className="text-[var(--accent)] hover:underline font-medium">
                          Challenges
                        </Link>{" "}
                        page before day 22 (UTC).
                      </p>
                    </div>
                    <div className="card p-4 sm:p-5">
                      <p className="text-xl mb-2">🔐</p>
                      <h3 className="font-bold text-[var(--accent)] mb-2">Hacker Track</h3>
                      <p className="text-sm text-white/60 leading-relaxed">
                        Same unified monthly calendar as developers — days 1–21 to build, days 22–25 to vote. Submit CTF
                        writeups, security tools, vulnerability research, or red team reports. Run{" "}
                        <code className="mono text-[var(--accent)]">/enroll</code> in Discord for the track, then complete
                        your submission on the site from <strong className="text-white/80">Submit</strong> or the{" "}
                        <Link href="/challenges" className="text-[var(--accent)] hover:underline font-medium">
                          Challenges
                        </Link>{" "}
                        page.
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                title: "Submit your work",
                body: (
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed">
                    Sign in on the site and go to <strong className="text-white/85">Submit</strong> via your avatar menu.
                    Fill in your repo link, optional demo URL, and optional writeup or attachment. You can edit your
                    submission any time before day 21.
                  </p>
                ),
              },
              {
                title: "Vote and earn XP",
                body: (
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed">
                    During the vote window (days 22–25 UTC), use the vote banner on the{" "}
                    <Link href="/challenges" className="text-[var(--accent)] hover:underline font-medium">
                      Challenges
                    </Link>{" "}
                    page, or open <strong className="text-white/85">Vote</strong> from your avatar menu. You have 4 votes per
                    month (2 per track). Votes on your project earn you XP.
                  </p>
                ),
              },
            ].map((step, i) => (
              <div key={step.title} className="relative">
                <span
                  className="absolute -left-[calc(2rem+5px)] sm:-left-[calc(2.5rem+5px)] top-1 w-3 h-3 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)]"
                  aria-hidden
                />
                <p className="mono text-[0.65rem] text-white/40 mb-2 uppercase tracking-wider">
                  Step {i + 1}
                </p>
                <h3 className="text-lg sm:text-xl font-bold mb-4">{step.title}</h3>
                {step.body}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--border)] bg-[var(--bg-card)]">
        <div className="container max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Server roles</h2>
          <p className="text-sm text-white/50 mb-8 mono">
            (roles assigned automatically after you complete onboarding in Discord)
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((r) => (
              <article key={r.name} className="card p-4 sm:p-5">
                <h3 className="font-bold text-[var(--accent)] mb-2">{r.name}</h3>
                <p className="text-sm text-white/60">{r.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
