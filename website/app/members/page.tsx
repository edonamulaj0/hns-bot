import Link from "next/link";
import { formatTechStack, getMembers } from "@/lib/api";

export const revalidate = 60;
export const metadata = { title: "Members — Hack & Stack" };

export default async function MembersPage() {
  const data = await getMembers().catch(() => null);
  const members = data?.members ?? [];

  return (
    <>
      <div className="page-header">
        <div className="container">
          <p className="label">Community</p>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
            Members
          </h1>
          <p className="mono dim" style={{ fontSize: "0.85rem" }}>
            Profiles synced from Discord. API must expose{" "}
            <code className="mono">/api/members</code> on your worker.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {members.length === 0 ? (
            <div className="empty-state">
              <p>
                No members loaded yet. Point{" "}
                <code className="mono">NEXT_PUBLIC_API_URL</code> at your worker
                and implement <code className="mono">GET /api/members</code>.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {members.map((m) => {
                const stack = formatTechStack(m.techStack);
                return (
                  <article
                    key={m.discordId}
                    className="card member-card"
                    style={{ padding: "1.5rem" }}
                  >
                    <p className="mono dim" style={{ fontSize: "0.72rem" }}>
                      @{m.discordId.slice(-8)}
                    </p>
                    <p style={{ marginTop: "0.5rem", fontWeight: 700 }}>
                      {m.points} XP · rank {m.rank}
                    </p>
                    {m.bio && (
                      <p
                        style={{
                          marginTop: "0.75rem",
                          color: "var(--text-dim)",
                          fontSize: "0.875rem",
                          lineHeight: 1.6,
                        }}
                      >
                        {m.bio}
                      </p>
                    )}
                    <div
                      style={{
                        marginTop: "1rem",
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {m.github && (
                        <a
                          href={m.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}
                        >
                          GitHub
                        </a>
                      )}
                      {m.linkedin && (
                        <a
                          href={m.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn"
                          style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                    {stack.length > 0 && (
                      <div
                        style={{
                          marginTop: "1rem",
                          display: "flex",
                          gap: "0.35rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {stack.slice(0, 6).map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
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
