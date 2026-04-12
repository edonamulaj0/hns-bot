import type { Metadata } from "next";
import Link from "next/link";
import { DiscordWidget } from "@/components/DiscordWidget";

export const metadata: Metadata = {
  title: "Join Us | H4cknStack",
  description:
    "Start building with H4cknStack: join Discord, set up your profile, pick a track, and ship your first project.",
};

const DISCORD_INVITE = "https://discord.gg/xrxTUsgdv9";

const ROLES = [
  { name: "Builder", desc: "Submitted at least one project" },
  { name: "Hacker", desc: "Submitted a hacker track entry" },
  { name: "Contributor", desc: "Shared a blog article" },
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
      <section className="section-sm page-header min-h-[min(50dvh,520px)] flex flex-col justify-center grid-bg">
        <div className="container max-w-3xl">
          <p className="label mb-2">Welcome</p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5">Ready to build?</h1>
          {sp.error === "not_member" && (
            <div
              className="mb-6 rounded border p-4 text-sm leading-relaxed"
              style={{
                borderColor: "rgba(237,66,69,0.35)",
                background: "rgba(237,66,69,0.08)",
              }}
            >
              Sign-in requires membership in the H4cknStack Discord. Join with the link below, then try{" "}
              <strong className="text-white">Sign in with Discord</strong> again.
            </div>
          )}
          {sp.error === "oauth" && (
            <div
              className="mb-6 rounded border p-4 text-sm text-white/80"
              style={{
                borderColor: "rgba(245,158,11,0.35)",
                background: "rgba(245,158,11,0.08)",
              }}
            >
              Discord sign-in could not be completed. Please try again.
            </div>
          )}
          <p className="text-base sm:text-lg text-white/65 leading-relaxed mb-8 max-w-2xl">
            H4cknStack is a global community where developers and security researchers ship real work every month — projects,
            writeups, and tools — and earn XP with a public portfolio on the site. Everything runs through Discord: submissions,
            voting, and feedback, with dedicated spaces for builders and for security-focused work.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <a
              href={DISCORD_INVITE}
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-10">Your first week</h2>

          <div className="relative border-l-2 border-[var(--border)] pl-8 sm:pl-10 space-y-14">
            {[
              {
                title: "Join the Discord server",
                body: (
                  <>
                    <p className="text-white/65 text-sm sm:text-base leading-relaxed mb-4">
                      Click the invite link above. The server has channels for both tracks —{" "}
                      <strong className="text-white/90">#dev-chat</strong> for builders and{" "}
                      <strong className="text-white/90">#hacker-lounge</strong> for security folks.
                    </p>
                    <div className="max-w-md">
                      <DiscordWidget />
                    </div>
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
                        Build a project over 21 days. Any stack, any idea. Submit with{" "}
                        <code className="mono text-[var(--accent)]">/submit</code> before day 22.
                      </p>
                    </div>
                    <div className="card p-4 sm:p-5">
                      <p className="text-xl mb-2">🔐</p>
                      <h3 className="font-bold text-[var(--accent)] mb-2">Hacker Track</h3>
                      <p className="text-sm text-white/60 leading-relaxed">
                        2-week cycles. CTF writeups, security tool builds, vulnerability research. Submit with{" "}
                        <code className="mono text-[var(--accent)]">/submit —track hacker</code>.
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                title: "Submit your work",
                body: (
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed">
                    Use <strong className="text-white/85">My Submission</strong> on the site (signed in) or{" "}
                    <code className="mono text-[var(--accent)]">/submit</code> in Discord for a link to the form. Include a
                    repo link, optional demo URL, and optional writeup. Submissions are reviewed for the challenge rules.
                  </p>
                ),
              },
              {
                title: "Vote and earn XP",
                body: (
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed">
                    During the vote window (days 22–25 UTC), open <strong className="text-white/85">Vote</strong> in the
                    nav (or your avatar menu). You have 4 votes per month (2 per track). Votes on your project earn you
                    XP.
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

      <section className="section border-t border-[var(--border)]">
        <div className="container max-w-lg mx-auto text-center">
          <h2 className="text-xl font-bold mb-6">Live server</h2>
          <DiscordWidget />
        </div>
      </section>
    </>
  );
}
