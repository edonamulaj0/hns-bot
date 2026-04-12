import Link from "next/link";
import { getPortfolio, getMembers, getLeaderboard, PHASE_META } from "@/lib/api";

export const revalidate = 60;

export default async function HomePage() {
  const [portfolio, members, leaderboard] = await Promise.allSettled([
    getPortfolio(),
    getMembers(),
    getLeaderboard(),
  ]);

  const portfolioData = portfolio.status === "fulfilled" ? portfolio.value : null;
  const membersData = members.status === "fulfilled" ? members.value : null;
  const leaderboardData = leaderboard.status === "fulfilled" ? leaderboard.value : null;

  const phase = portfolioData?.phase ?? "BUILD";
  const phaseMeta = PHASE_META[phase];
  const totalSubmissions = Object.values(portfolioData?.published ?? {}).flat().length;
  const totalMembers = membersData?.members.length ?? 0;
  const top3 = leaderboardData?.leaderboard.slice(0, 3) ?? [];

  return (
    <>
      {/* Hero */}
      <section className="section grid-bg" style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}>
        <div className="container">
          <div style={{ maxWidth: "720px" }}>
            <div className="fade-up" style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
              <span
                className="phase-badge"
                style={{ background: `${phaseMeta.color}18`, color: phaseMeta.color, border: `1px solid ${phaseMeta.color}40` }}
              >
                <span className="pulse-dot" style={{ background: phaseMeta.color }}></span>
                {phaseMeta.label}
              </span>
              <span className="mono dim">{phaseMeta.description}</span>
            </div>

            <h1 className="fade-up fade-up-1" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", marginBottom: "1.5rem" }}>
              Build. Ship.{" "}
              <span style={{ color: "var(--accent)", display: "block" }}>Get seen.</span>
            </h1>

            <p className="fade-up fade-up-2" style={{
              fontSize: "1.1rem",
              color: "var(--text-dim)",
              maxWidth: "540px",
              marginBottom: "2.5rem",
              lineHeight: "1.7",
            }}>
              Monthly build challenges for Kosovo &amp; Albanian developers.
              Submit your projects, earn XP, and build a portfolio that speaks for itself.
            </p>

            <div className="fade-up fade-up-3" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="https://discord.gg/YOUR_INVITE" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Join the Discord →
              </a>
              <Link href="/projects" className="btn">View Projects</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "2rem 0" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "2rem" }}>
            <div className="stat-block">
              <span className="value">{totalMembers}</span>
              <span className="label">Members</span>
            </div>
            <div className="stat-block">
              <span className="value">{totalSubmissions}</span>
              <span className="label">Projects shipped</span>
            </div>
            <div className="stat-block">
              <span className="value">{Object.keys(portfolioData?.published ?? {}).length}</span>
              <span className="label">Months active</span>
            </div>
            <div className="stat-block">
              <span className="value" style={{ color: "var(--accent-2)" }}>{portfolioData?.month}</span>
              <span className="label">Current month</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recent projects */}
      <section className="section">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
            <div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--accent)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Recent</p>
              <h2 style={{ fontSize: "2rem" }}>Latest Projects</h2>
            </div>
            <Link href="/projects" className="btn">All projects →</Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {Object.entries(portfolioData?.published ?? {})
              .flatMap(([, subs]) => subs)
              .slice(0, 6)
              .map((sub) => (
                <article key={sub.id} className="card card-lift" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <span className="tag tag-accent">{sub.tier}</span>
                    <span className="mono dim" style={{ fontSize: "0.7rem" }}>{sub.month}</span>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{sub.title}</h3>
                  <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: "1.6", marginBottom: "1.25rem" }}>
                    {sub.description.slice(0, 120)}{sub.description.length > 120 ? "…" : ""}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <a href={sub.repoUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: "0.72rem", padding: "0.3rem 0.7rem" }}>
                        Repo
                      </a>
                      {sub.demoUrl && (
                        <a href={sub.demoUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: "0.72rem", padding: "0.3rem 0.7rem" }}>
                          Demo
                        </a>
                      )}
                    </div>
                    <span className="mono dim" style={{ fontSize: "0.72rem" }}>▲ {sub.votes}</span>
                  </div>
                </article>
              ))}
          </div>

          {totalSubmissions === 0 && (
            <div className="empty-state">
              <p>No projects published yet. The first batch ships at the end of the month.</p>
            </div>
          )}
        </div>
      </section>

      {/* Leaderboard preview */}
      {top3.length > 0 && (
        <section className="section" style={{ background: "var(--bg-card)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
              <div>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--accent-2)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Top builders</p>
                <h2 style={{ fontSize: "2rem" }}>Leaderboard</h2>
              </div>
              <Link href="/leaderboard" className="btn">Full rankings →</Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {top3.map((member, i) => {
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={member.discordId} className="card" style={{ padding: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
                    <span style={{ fontSize: "1.5rem" }}>{medals[i]}</span>
                    <div>
                      <p className="mono" style={{ marginBottom: "0.2rem" }}>@{member.discordId.slice(-6)}</p>
                      <p style={{ color: "var(--accent)", fontWeight: 700 }}>{member.points} XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="section">
        <div className="container">
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--accent)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.75rem" }}>The loop</p>
          <h2 style={{ fontSize: "2rem", marginBottom: "3rem" }}>How It Works</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1px", background: "var(--border)" }}>
            {[
              { step: "01", title: "Join Discord", body: "Set up your profile with GitHub, LinkedIn, and tech stack via /setup-profile." },
              { step: "02", title: "Build (Days 1–21)", body: "Ship a project of any tier. Submit it before day 22 with /submit." },
              { step: "03", title: "Vote (Days 22–29)", body: "Community votes on approved submissions. Each vote earns the builder XP." },
              { step: "04", title: "Get Published", body: "On day 30, results go live here. Your project lives permanently in the portfolio." },
            ].map((item) => (
              <div key={item.step} style={{ background: "var(--bg)", padding: "2rem 1.5rem" }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-dimmer)", marginBottom: "0.75rem" }}>{item.step}</p>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{item.title}</h3>
                <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: "1.7" }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
