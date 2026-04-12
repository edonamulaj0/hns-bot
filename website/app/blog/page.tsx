import Link from "next/link";
import { getBlogs } from "@/lib/api";

export const revalidate = 60;
export const metadata = { title: "Blog — Hack & Stack" };

export default async function BlogPage() {
  const data = await getBlogs().catch(() => null);
  const blogs = data?.blogs ?? [];

  return (
    <>
      <div className="page-header">
        <div className="container">
          <p className="label">Writing</p>
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>Blog</h1>
          <p className="mono dim" style={{ fontSize: "0.85rem" }}>
            Requires <code className="mono">GET /api/blogs</code> on your worker.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {blogs.length === 0 ? (
            <div className="empty-state">
              <p>No blog posts yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {blogs.map((b) => (
                <a
                  key={b.id}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="blog-row"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1.25rem 0",
                    borderBottom: "1px solid var(--border)",
                    textDecoration: "none",
                    color: "var(--text)",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 700 }}>{b.title}</p>
                    <p className="mono dim" style={{ fontSize: "0.75rem" }}>
                      @{b.user.discordId.slice(-8)} · ▲ {b.upvotes}
                    </p>
                  </div>
                  <span className="mono dim" style={{ fontSize: "0.72rem" }}>
                    ↗
                  </span>
                </a>
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
