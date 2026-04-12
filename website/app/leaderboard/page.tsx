import Link from "next/link";
import { getLeaderboard } from "@/lib/api";

export const revalidate = 60;
export const metadata = { title: "Leaderboard — Hack & Stack" };

export default async function LeaderboardPage() {
  const data = await getLeaderboard().catch(() => null);
  const rows = data?.leaderboard ?? [];

  return (
    <>
      <div className="page-header">
        <div className="container">
          <p className="label">Rankings</p>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
            Leaderboard
          </h1>
          <p className="mono dim" style={{ fontSize: "0.85rem" }}>
            Requires <code className="mono">GET /api/leaderboard</code> on your
            worker.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {rows.length === 0 ? (
            <div className="empty-state">
              <p>No leaderboard data yet. Check your API URL and worker routes.</p>
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              {rows.map((m, i) => (
                <div
                  key={m.discordId}
                  className="blog-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span className="mono dim" style={{ width: "2.5rem" }}>
                    #{i + 1}
                  </span>
                  <span className="mono" style={{ flex: 1 }}>
                    @{m.discordId.slice(-8)}
                  </span>
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                    {m.points} XP
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mono dim" style={{ marginTop: "2rem", fontSize: "0.8rem" }}>
            <Link href="/" className="btn" style={{ display: "inline-flex" }}>
              ← Home
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
