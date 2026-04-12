import { getPortfolio, PHASE_META } from "@/lib/api";

export const revalidate = 60;
export const metadata = { title: "Projects — Hack & Stack" };

export default async function ProjectsPage() {
  const data = await getPortfolio().catch(() => null);
  const published = data?.published ?? {};
  const months = Object.keys(published).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <div className="page-header">
        <div className="container">
          <p className="label">Portfolio</p>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>All Projects</h1>
          {data && (
            <span
              className="phase-badge"
              style={{
                background: `${PHASE_META[data.phase].color}18`,
                color: PHASE_META[data.phase].color,
                border: `1px solid ${PHASE_META[data.phase].color}40`,
              }}
            >
              <span className="pulse-dot" style={{ background: PHASE_META[data.phase].color }}></span>
              {PHASE_META[data.phase].label} — {data.month}
            </span>
          )}
        </div>
      </div>

      <div className="section">
        <div className="container">
          {months.length === 0 ? (
            <div className="empty-state">
              <p>No projects published yet. Check back on day 30.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>
              {months.map((month) => {
                const subs = published[month] ?? [];
                return (
                  <div key={month}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
                      <h2 style={{ fontSize: "1.5rem" }}>{month}</h2>
                      <span className="tag">{subs.length} project{subs.length !== 1 ? "s" : ""}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
                      {subs.map((sub) => (
                        <article key={sub.id} className="card card-lift" style={{ padding: "1.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                            <span className="tag tag-accent">{sub.tier}</span>
                            <span className="mono dim" style={{ fontSize: "0.7rem" }}>▲ {sub.votes} votes</span>
                          </div>

                          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{sub.title}</h3>
                          <p style={{ color: "var(--text-dim)", fontSize: "0.875rem", lineHeight: "1.6", marginBottom: "1.25rem" }}>
                            {sub.description}
                          </p>

                          {(() => {
                            const stack = sub.user.techStack ?? [];
                            return stack.length > 0 ? (
                              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                                {(stack as string[]).slice(0, 4).map((tech) => (
                                  <span key={tech} className="tag">{tech}</span>
                                ))}
                              </div>
                            ) : null;
                          })()}

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                            <span className="mono dim" style={{ fontSize: "0.72rem" }}>
                              <@{sub.user.discordId.slice(-8)}>
                            </span>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <a href={sub.repoUrl} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: "0.72rem", padding: "0.3rem 0.7rem" }}>
                                Repo ↗
                              </a>
                              {sub.demoUrl && (
                                <a href={sub.demoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: "0.72rem", padding: "0.3rem 0.7rem" }}>
                                  Demo ↗
                                </a>
                              )}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
