import Link from "next/link";
import { notFound } from "next/navigation";

export const runtime = "edge";
import {
  getPortfolio,
  PHASE_META,
  formatTechStack,
  type PortfolioResponse,
  type Submission,
} from "@/lib/api";
import { githubProfileHref } from "@/lib/url";
import { memberDisplayName } from "@/lib/member-label";

export const revalidate = 60;

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  return { title: `${month} Challenges | H4ck&Stack` };
}

export default async function ChallengeMonthPage({
  params,
  searchParams,
}: {
  params: Promise<{ month: string }>;
  searchParams: Promise<{ track?: string; tier?: string }>;
}) {
  const { month } = await params;
  const sp = await searchParams;
  if (!MONTH_RE.test(month)) notFound();

  let data: PortfolioResponse | null = null;
  try {
    data = await getPortfolio();
  } catch {
    data = null;
  }

  const allSubs = (data?.published?.[month] ?? []) as Submission[];
  const trackFilter = (sp.track ?? "").toUpperCase();
  let subs = allSubs;
  if (trackFilter === "DEVELOPER" || trackFilter === "HACKER") {
    subs = subs.filter((s) => (s.track ?? "DEVELOPER") === trackFilter);
  }
  const tierFilter = sp.tier?.trim();
  if (tierFilter) {
    subs = subs.filter((s) => s.tier === tierFilter);
  }

  const phase = data?.phase;
  const phaseMeta = phase ? (PHASE_META[phase] ?? PHASE_META.BUILD) : null;
  const hasFilters = Boolean(
    (trackFilter === "DEVELOPER" || trackFilter === "HACKER") || tierFilter,
  );

  return (
    <>
      <section className="section-sm page-header min-h-[min(42dvh,520px)] flex flex-col justify-center px-[clamp(1rem,4vw,2rem)]">
        <div className="container w-full">
          <p className="label">Monthly challenge</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4">
            {month}
          </h1>
          <p className="text-white/60 max-w-2xl text-sm sm:text-base mb-4">
            Submissions published after community review and the monthly publish
            window. Voting and submissions happen in Discord.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <Link href="/challenges" className="btn text-xs sm:text-sm">
              ← All challenges
            </Link>
            <Link href="/challenges" className="btn text-xs sm:text-sm">
              All months →
            </Link>
            {hasFilters && (
              <Link href={`/challenges/${month}`} className="btn text-xs sm:text-sm">
                Clear filters
              </Link>
            )}
            {phaseMeta && data && (
              <span
                className="phase-badge"
                style={{
                  background: `${phaseMeta.color}18`,
                  color: phaseMeta.color,
                  border: `1px solid ${phaseMeta.color}40`,
                }}
              >
                <span
                  className="pulse-dot"
                  style={{ background: phaseMeta.color }}
                />
                {phaseMeta.label} — {data.month}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="section min-h-[min(50dvh,600px)] px-[clamp(1rem,4vw,2rem)]">
        <div className="container w-full">
          {!data ? (
            <div className="empty-state">
              <p>
                Could not load portfolio data. Set{" "}
                <code className="mono">NEXT_PUBLIC_API_URL</code> to your worker
                URL and ensure <code className="mono">GET /api/portfolio</code>{" "}
                is available.
              </p>
            </div>
          ) : subs.length === 0 ? (
            <div className="empty-state">
              <p>
                {hasFilters ? (
                  <>
                    No published projects match these filters for{" "}
                    <span className="mono">{month}</span>.{" "}
                    <Link href={`/challenges/${month}`} className="text-[var(--accent)] underline">
                      Show all for this month
                    </Link>
                  </>
                ) : (
                  <>
                    No published projects for <span className="mono">{month}</span>{" "}
                    yet. Check another month or visit after publish day.
                  </>
                )}
              </p>
            </div>
          ) : (
            <>
              {hasFilters && (
                <p className="text-sm text-white/55 mb-6">
                  Filtered
                  {trackFilter === "DEVELOPER" || trackFilter === "HACKER"
                    ? ` · track: ${trackFilter}`
                    : ""}
                  {tierFilter ? ` · tier: ${tierFilter}` : ""}
                  {" · "}
                  <Link href={`/challenges/${month}`} className="text-[var(--accent)] underline">
                    clear
                  </Link>
                </p>
              )}
              <div className="flex flex-wrap items-end justify-between gap-4 mb-8 sm:mb-10">
                <h2 className="text-xl sm:text-2xl font-bold">
                  {subs.length} project{subs.length !== 1 ? "s" : ""}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {subs.map((sub) => {
                  const stack = formatTechStack(sub.user.techStack);
                  const gh = githubProfileHref(sub.user.github);
                  return (
                    <article
                      key={sub.id}
                      className="card card-lift p-4 sm:p-6 flex flex-col min-h-[min(280px,45vh)]"
                    >
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="tag tag-accent shrink-0">{sub.tier}</span>
                        <span className="mono dim text-[0.65rem] sm:text-xs whitespace-nowrap">
                          ▲ {sub.votes} votes
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold mb-2">
                        {sub.title}
                      </h3>
                      <p className="text-white/60 text-xs sm:text-sm leading-relaxed mb-4 flex-1">
                        {sub.description}
                      </p>
                      {stack.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {stack.slice(0, 5).map((t) => (
                            <span key={t} className="tag text-[0.65rem]">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="pt-4 mt-auto border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2">
                        <span className="mono dim text-[0.65rem] sm:text-xs">
                          {memberDisplayName(sub.user)}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {gh && (
                            <a
                              href={gh}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn text-[0.65rem] sm:text-xs py-1 px-2"
                            >
                              GitHub
                            </a>
                          )}
                          <a
                            href={sub.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn text-[0.65rem] sm:text-xs py-1 px-2"
                          >
                            Repo
                          </a>
                          {sub.demoUrl && (
                            <a
                              href={sub.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-primary text-[0.65rem] sm:text-xs py-1 px-2"
                            >
                              Demo
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
