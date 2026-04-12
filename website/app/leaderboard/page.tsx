import Link from "next/link";
import { getLeaderboard } from "@/lib/api";

export const revalidate = 60;
export const metadata = { title: "Leaderboard — H4cknStack" };

export default async function LeaderboardPage() {
  const data = await getLeaderboard().catch(() => null);
  const rows = data?.leaderboard ?? [];

  return (
    <>
      <section className="page-header min-h-hero-sm flex flex-col justify-center">
        <div className="container w-full">
          <p className="label">Rankings</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">
            Leaderboard
          </h1>
          <p className="mono dim max-w-2xl text-sm">
            Points from votes, blog shares, GitHub pulse, and more. Data from{" "}
            <code className="mono">GET /api/leaderboard</code>.
          </p>
        </div>
      </section>

      <section className="section min-h-section">
        <div className="container w-full">
          {rows.length === 0 ? (
            <div className="empty-state">
              <p>
                No leaderboard data yet. Set{" "}
                <code className="mono">NEXT_PUBLIC_API_URL</code> and check your
                worker.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              {rows.map((m, i) => (
                <div
                  key={m.discordId}
                  className="blog-row flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5 last:border-b-0 sm:px-5"
                >
                  <span className="mono dim w-9 shrink-0 text-sm">#{i + 1}</span>
                  <span className="mono min-w-0 flex-1 truncate text-sm">
                    @{m.discordId.slice(-8)}
                  </span>
                  <span className="shrink-0 font-bold text-[var(--accent)]">
                    {m.points} XP
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mono dim mt-10 text-sm">
            <Link href="/" className="btn inline-flex">
              ← Home
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
