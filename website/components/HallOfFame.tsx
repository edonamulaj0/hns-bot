"use client";

import type { PortfolioResponse, Submission } from "@/lib/api";
import { githubProfileHref } from "@/lib/url";

export function HallOfFame({ portfolio }: { portfolio: PortfolioResponse | null }) {
  if (!portfolio?.published) return null;

  const winners: { month: string; sub: Submission }[] = [];
  for (const [month, subs] of Object.entries(portfolio.published)) {
    const arr = subs as Submission[];
    if (!arr.length) continue;
    const top = [...arr].sort((a, b) => b.votes - a.votes)[0];
    if (top) winners.push({ month, sub: top });
  }

  if (!winners.length) return null;
  winners.sort((a, b) => b.month.localeCompare(a.month));

  return (
    <section className="mt-12 sm:mt-16">
      <h2 className="text-xl sm:text-2xl font-bold mb-2">Hall of Fame</h2>
      <p className="text-sm text-white/55 mb-6 max-w-2xl">
        Highest-voted approved project each month.
      </p>

      <div className="relative">
        <div
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none scroll-pl-4"
          style={{
            maskImage:
              "linear-gradient(to right, black 0%, black 75%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, black 0%, black 75%, transparent 100%)",
          }}
        >
          {winners.map(({ month, sub }) => {
            const gh = githubProfileHref(sub.user.github);
            return (
              <article
                key={month}
                className="snap-start shrink-0 w-[min(100%,340px)] min-w-[280px] sm:min-w-[340px] rounded border-2 p-5 bg-[var(--bg-card)] relative overflow-hidden"
                style={{ borderColor: "#FFD700" }}
              >
                <span className="absolute top-3 right-3 tag text-[0.65rem] bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/40">
                  Winner
                </span>
                <p className="mono text-[0.65rem] text-white/45 mb-2">{month}</p>
                <h3 className="font-bold text-lg mb-2 leading-tight">{sub.title}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="tag tag-accent text-xs">{sub.tier}</span>
                  <span className="mono text-xs text-[var(--accent)]">▲ {sub.votes}</span>
                </div>
                <p className="mono text-xs text-white/50 mb-4">
                  @{sub.user.discordId.slice(-8)}
                  {gh && (
                    <>
                      {" · "}
                      <a
                        href={gh}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent)] hover:underline"
                      >
                        GitHub
                      </a>
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={sub.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn text-xs py-1.5 px-3"
                  >
                    Repo
                  </a>
                  {sub.demoUrl && (
                    <a
                      href={sub.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn text-xs py-1.5 px-3"
                    >
                      Demo
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
