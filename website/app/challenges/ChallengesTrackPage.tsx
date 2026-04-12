import Link from "next/link";
import type { ChallengeDto } from "@/lib/api";

const TIERS = ["Beginner", "Intermediate", "Advanced"] as const;

function stripMarkdownSimple(s: string): string {
  return s
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\r?\n/g, " ")
    .trim();
}

type Props = {
  track: "DEVELOPER" | "HACKER";
  heading: string;
  description: string;
  otherLabel: string;
  otherHref: string;
  challenges: ChallengeDto[];
};

export default function ChallengesTrackPage({
  track,
  heading,
  description,
  otherLabel,
  otherHref,
  challenges,
}: Props) {
  const months = [...new Set(challenges.map((c) => c.month))].sort((a, b) =>
    b.localeCompare(a),
  );

  const byMonth = new Map<string, Map<string, ChallengeDto>>();
  for (const m of months) {
    const map = new Map<string, ChallengeDto>();
    for (const c of challenges.filter((x) => x.month === m)) {
      map.set(c.tier, c);
    }
    byMonth.set(m, map);
  }

  return (
    <>
      <section className="section-sm page-header min-h-[min(36dvh,360px)] flex flex-col justify-center">
        <div className="container w-full">
          <p className="label">Challenges</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">{heading}</h1>
          <p className="text-white/60 max-w-2xl text-sm sm:text-base mb-4">{description}</p>
          <p className="mono text-xs text-[var(--accent)] mb-4">
            {challenges.length} challenge{challenges.length !== 1 ? "s" : ""} loaded
          </p>
          <Link href={otherHref} className="text-sm text-[var(--accent)] hover:underline">
            {otherLabel}
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="container w-full space-y-16">
          {months.length === 0 ? (
            <div className="empty-state">
              <p>No challenges posted for this track yet.</p>
            </div>
          ) : (
            months.map((month) => {
              const tierMap = byMonth.get(month)!;
              return (
                <div key={month}>
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="mono text-lg text-white/90">{month}</h2>
                    <div className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TIERS.map((tier) => {
                      const ch = tierMap.get(tier);
                      if (!ch) {
                        return (
                          <article
                            key={tier}
                            className="card p-5 border-dashed border-[var(--border)] opacity-50"
                          >
                            <span className="tag text-xs mb-2">{tier}</span>
                            <p className="text-sm text-white/45">Challenge not yet posted</p>
                          </article>
                        );
                      }
                      const plain = stripMarkdownSimple(ch.description);
                      const excerpt =
                        plain.length > 220 ? `${plain.slice(0, 220)}…` : plain;
                      return (
                        <article key={ch.id} className="card p-5 flex flex-col h-full">
                          <span className="tag tag-accent text-xs mb-2">{ch.tier}</span>
                          <h3 className="text-lg font-bold mb-2 leading-tight">{ch.title}</h3>
                          <p className="text-sm text-white/55 line-clamp-3 mb-4 flex-1">
                            {excerpt}
                          </p>
                          {ch.resources?.trim() && (
                            <p className="text-xs mb-3">
                              <span className="text-white/40">Resources →</span>{" "}
                              <span className="mono text-[var(--accent)] line-clamp-2">
                                {stripMarkdownSimple(ch.resources).slice(0, 120)}
                              </span>
                            </p>
                          )}
                          <p className="mono text-[0.65rem] text-white/45 mb-4">
                            {ch.enrollmentCount} enrolled · {ch.submissionCount} approved submissions
                          </p>
                          <Link
                            href={`/challenges/${encodeURIComponent(ch.month)}?track=${track}&tier=${encodeURIComponent(ch.tier)}`}
                            className="btn text-xs w-fit mt-auto"
                          >
                            View submissions →
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                  <div className="mt-6 border-l-4 border-[var(--accent)] bg-[var(--bg-card)] px-4 py-3 rounded">
                    <p className="text-sm text-white/75">
                      Ready to take on this challenge? Enroll via{" "}
                      <code className="mono text-[var(--accent)]">/enroll</code> in Discord.
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
