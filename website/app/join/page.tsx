import type { Metadata } from "next";
import Link from "next/link";
import { DISCORD_INVITE_URL, WIKI_URL } from "@/lib/branding";
import { loginUrl } from "@/lib/auth-client";

export const runtime = "edge";

function JoinServerTabIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
              Sign-in requires membership in the H4ck&Stack Discord. Use <strong className="text-white">Join Server</strong>{" "}
              above to open the invite, then try{" "}
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
              className="btn btn-primary inline-flex items-center gap-2"
              aria-label="Join Discord server (opens in new tab)"
            >
              Join Server
              <JoinServerTabIcon className="opacity-90 shrink-0" />
            </a>
          </div>
        </div>
      </section>

      <section className="section border-t border-[var(--border)] bg-[var(--bg-card)]/35">
        <div className="container max-w-3xl">
          <p className="label mb-2">From the team</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-white">Welcome</h2>
          <div className="space-y-4 text-sm sm:text-base text-white/65 leading-relaxed">
            <p>
              If you just landed here — or you&apos;ve been lurking — we&apos;re glad you&apos;re here.
            </p>
            <p>
              <strong className="text-white/90">H4ck&Stack</strong> runs the same loop every month. Challenge dates follow a{" "}
              <strong className="text-white/85">shared UTC+2 calendar</strong> (fixed offset, no daylight saving): three tracks —{" "}
              <strong className="text-white/85">Developer</strong> (ship a project),{" "}
              <strong className="text-white/85">Hacker</strong> (security work — writeups, tools, research), and{" "}
              <strong className="text-white/85">Designer</strong> (visual deliverables such as mockups or image exports). During the
              build window you enroll, build, then submit on this site. When voting opens, members vote here too (up to three votes
              per month, at most one per track). XP feeds the leaderboard and your Discord XP roles — structure so you can finish
              something and show it off.
            </p>
            <p>
              <strong className="text-white/85">Site:</strong>{" "}
              <a
                href="https://h4cknstack.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline font-medium"
              >
                h4cknstack.com
              </a>
            </p>
            <p>
              <strong className="text-white/85">When you&apos;re ready:</strong> open the site and{" "}
              <a href={loginUrl()} className="text-[var(--accent)] hover:underline font-medium">
                Sign in with Discord
              </a>
              . If you aren&apos;t in the server yet, use <strong className="text-white/85">Join Server</strong> above first — sign-in
              requires membership. Then complete{" "}
              <Link href="/profile" className="text-[var(--accent)] hover:underline font-medium">
                Profile
              </Link>{" "}
              (GitHub link, bio, and so on). That powers{" "}
              <Link href="/members" className="text-[var(--accent)] hover:underline font-medium">
                Members
              </Link>{" "}
              and how people discover you.
            </p>
            <p>
              <strong className="text-white/85">During the build window:</strong> in Discord, run{" "}
              <code className="mono text-[var(--accent)] text-[0.9em]">/enroll</code> to pick track and tier (Beginner / Intermediate /
              Advanced where applicable). Submit your entry at{" "}
              <Link href="/submit" className="text-[var(--accent)] hover:underline font-medium">
                /submit
              </Link>{" "}
              on the site — there isn&apos;t a Discord <code className="mono text-[var(--accent)] text-[0.9em]">/submit</code>{" "}
              command; onboarding points you to the web flow.
            </p>
            <p>
              <strong className="text-white/85">Voting</strong> happens on the site when the vote window opens; we&apos;ll announce it
              in Discord.
            </p>
            <p>
              <code className="mono text-[var(--accent)] text-[0.9em]">/pulse</code> looks at your GitHub activity for the{" "}
              <strong className="text-white/85">current challenge month (UTC+2)</strong>. It can award pulse XP once per month (with a
              cap) and shows a scaled &quot;if the month ended now&quot; estimate. For private contributions, use{" "}
              <code className="mono text-[var(--accent)] text-[0.9em]">/link-github</code> (and{" "}
              <code className="mono text-[var(--accent)] text-[0.9em]">/unlink-github</code> to disconnect). If there&apos;s no
              qualifying activity for that run, you won&apos;t see pulse XP for it.
            </p>
            <p>
              Want every command with short descriptions? Run{" "}
              <code className="mono text-[var(--accent)] text-[0.9em]">/help</code> in Discord — only you see that reply.
            </p>
            <p className="text-white/55 text-sm">
              Popular commands:{" "}
              <code className="mono text-[var(--accent)] text-[0.85em]">/profile</code>,{" "}
              <code className="mono text-[var(--accent)] text-[0.85em]">/enroll</code>,{" "}
              <code className="mono text-[var(--accent)] text-[0.85em]">/leaderboard</code>,{" "}
              <code className="mono text-[var(--accent)] text-[0.85em]">/pulse</code>,{" "}
              <code className="mono text-[var(--accent)] text-[0.85em]">/link-github</code> /{" "}
              <code className="mono text-[var(--accent)] text-[0.85em]">/unlink-github</code>,{" "}
              <code className="mono text-[var(--accent)] text-[0.85em]">/delete-account</code> (same effect as deleting from the site —
              no undo).
            </p>
            <p>
              Invite friends who&apos;d vibe with shipping and showing work — the more builders in the loop, the better each month
              gets.
            </p>
          </div>
        </div>
      </section>

      <section id="your-first-week" className="section scroll-mt-28 border-t border-[var(--border)]">
        <div className="container max-w-6xl">
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
                      Use <strong className="text-white/90">Join Server</strong> above (opens Discord in a new tab).
                      The server has channels for all three tracks.
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
                      <strong className="text-white/85">Profile</strong> from your avatar menu. Add GitHub, LinkedIn, Framer website,
                      bio, and tech stack for your public Members card. In Discord you can also run{" "}
                      <code className="mono text-[var(--accent)]">/profile</code> for a link to the same page.
                    </p>
                  </>
                ),
              },
              {
                title: "Pick your track",
                body: (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:items-stretch">
                    <div className="card flex min-h-[380px] sm:min-h-[420px] lg:min-h-[480px] h-full w-full flex-col p-6 sm:p-8 lg:p-9">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">🛠</span>
                        <h3 className="text-xl sm:text-2xl font-bold">Developer Track</h3>
                      </div>
                      <p className="text-white/60 text-sm sm:text-base mb-4 leading-relaxed">
                        Build a full project over the <strong className="text-white">monthly build window</strong>{" "}
                        (days 1–21). Choose a tier (Beginner, Intermediate, or Advanced) and ship something real — an
                        app, a library, a tool, anything.
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {["Web / API", "CLI & tooling", "Library / package", "Automation"].map((t) => (
                          <span
                            key={t}
                            className="tag text-[0.65rem]"
                            style={{
                              background: "#ccff0014",
                              borderColor: "#ccff004d",
                              color: "#ccff00",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <Link href="/challenges/developers" className="btn btn-primary mt-auto w-fit self-start pt-8">
                        View challenges →
                      </Link>
                    </div>

                    <div className="card flex min-h-[380px] sm:min-h-[420px] lg:min-h-[480px] h-full w-full flex-col p-6 sm:p-8 lg:p-9">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">🔒</span>
                        <h3 className="text-xl sm:text-2xl font-bold">Hacker Track</h3>
                      </div>
                      <p className="text-white/60 text-sm sm:text-base mb-4 leading-relaxed">
                        Same <strong className="text-white">monthly calendar</strong> as the developer track. Submit
                        CTF writeups, build security tools, research vulnerabilities, or run red team simulations — all
                        on the same build, vote, and publish rhythm.
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {["CTF Writeup", "Tool Build", "Vuln Research", "Red Team"].map((t) => (
                          <span
                            key={t}
                            className="tag text-[0.65rem]"
                            style={{
                              background: "#7c2feb1a",
                              borderColor: "#7c2feb4d",
                              color: "#ccff00",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <Link
                        href="/challenges/hackers"
                        className="btn mt-auto w-fit self-start pt-8"
                        style={{
                          borderColor: "#7c2feb66",
                          color: "#ccff00",
                        }}
                      >
                        View challenges →
                      </Link>
                    </div>

                    <div className="card flex min-h-[380px] sm:min-h-[420px] lg:min-h-[480px] h-full w-full flex-col p-6 sm:p-8 lg:p-9">
                      <div className="flex items-center gap-3 mb-4">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="shrink-0 text-[#D85A30]"
                          aria-hidden
                        >
                          <path
                            d="M4 20c5.5-1.5 11-6 14-12l2.5-4.5 2.2 2.2L18 8c-6 2-11.5 6.5-14 12"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M17 4l3 3M6 19l2-1"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                          />
                        </svg>
                        <h3 className="text-xl sm:text-2xl font-bold">Designer Challenge</h3>
                      </div>
                      <p className="text-white/60 text-sm sm:text-base mb-4 leading-relaxed">
                        Create posters, brand kits, UI mockups, or motion graphics. Submit a PNG, JPG, or WebP image
                        export — show your visual thinking, not just your tools.
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {["Poster", "Brand Identity", "UI Mockup", "Motion Graphic"].map((t) => (
                          <span
                            key={t}
                            className="tag text-[0.65rem]"
                            style={{
                              background: "#D85A301a",
                              borderColor: "#D85A304d",
                              color: "#fff",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                      <Link
                        href="/challenges/designer"
                        className="btn mt-auto w-fit self-start pt-8"
                        style={{
                          borderColor: "#D85A3088",
                          color: "#fff",
                          background: "#D85A3014",
                        }}
                      >
                        View challenges →
                      </Link>
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
                    submission any time before day 21 (UTC+2). Designers upload a PNG, JPG, or WebP image directly from the
                    submit page — no GitHub repo needed.
                  </p>
                ),
              },
              {
                title: "Vote and earn XP",
                body: (
                  <p className="text-white/65 text-sm sm:text-base leading-relaxed">
                    During the vote window (days 22–25 UTC+2), use the vote banner on the{" "}
                    <Link href="/challenges#monthly-calendar" className="text-[var(--accent)] hover:underline font-medium">
                      Challenges
                    </Link>{" "}
                    page, or open <strong className="text-white/85">Vote</strong> from your avatar menu. You have 3 votes per
                    month (1 per track). Votes on your project earn you XP.
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
