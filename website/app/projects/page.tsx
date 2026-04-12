import { formatTechStack, getPortfolio, PHASE_META } from "@/lib/api";

export const revalidate = 60;
export const metadata = { title: "Projects — H4cknStack" };

export default async function ProjectsPage() {
  const data = await getPortfolio().catch(() => null);
  const published = data?.published ?? {};
  const months = Object.keys(published).sort((a, b) => b.localeCompare(a));

  return (
    <>
      <section className="page-header min-h-hero-sm flex flex-col justify-center">
        <div className="container w-full">
          <p className="label">Portfolio</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">
            All Projects
          </h1>
          {data && (
            <span
              className="phase-badge"
              style={{
                background: `${PHASE_META[data.phase].color}18`,
                color: PHASE_META[data.phase].color,
                border: `1px solid ${PHASE_META[data.phase].color}40`,
              }}
            >
              <span
                className="pulse-dot"
                style={{ background: PHASE_META[data.phase].color }}
              />
              {PHASE_META[data.phase].label} — {data.month}
            </span>
          )}
        </div>
      </section>

      <section className="section min-h-section">
        <div className="container w-full">
          {months.length === 0 ? (
            <div className="empty-state">
              <p>No projects published yet. Check back on day 30.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-[clamp(3rem,12vw,5rem)]">
              {months.map((month) => {
                const subs = published[month] ?? [];
                return (
                  <div key={month}>
                    <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-4">
                      <h2 className="text-xl font-bold sm:text-2xl">{month}</h2>
                      <span className="tag">
                        {subs.length} project{subs.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
                      {subs.map((sub) => {
                        const stack = formatTechStack(sub.user.techStack);
                        return (
                          <article
                            key={sub.id}
                            className="card card-lift p-5 sm:p-6"
                          >
                            <div className="mb-3 flex justify-between gap-2">
                              <span className="tag tag-accent">{sub.tier}</span>
                              <span className="mono dim text-[0.7rem]">
                                ▲ {sub.votes} votes
                              </span>
                            </div>

                            <h3 className="mb-2 text-lg font-bold">{sub.title}</h3>
                            <p className="mb-5 text-sm leading-relaxed text-[var(--text-dim)]">
                              {sub.description}
                            </p>

                            {stack.length > 0 && (
                              <div className="mb-5 flex flex-wrap gap-1.5">
                                {stack.slice(0, 4).map((tech) => (
                                  <span key={tech} className="tag">
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
                              <span className="mono dim text-[0.72rem]">
                                @{sub.user.discordId.slice(-8)}
                              </span>
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={sub.repoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn px-2.5 py-1 text-[0.72rem]"
                                >
                                  Repo ↗
                                </a>
                                {sub.demoUrl && (
                                  <a
                                    href={sub.demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary px-2.5 py-1 text-[0.72rem]"
                                  >
                                    Demo ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
