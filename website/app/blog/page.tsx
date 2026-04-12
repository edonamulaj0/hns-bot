import Link from "next/link";
import { getBlogs } from "@/lib/api";

export const revalidate = 60;
export const metadata = { title: "Blog — H4cknStack" };

export default async function BlogPage() {
  const data = await getBlogs().catch(() => null);
  const blogs = data?.blogs ?? [];

  return (
    <>
      <section className="page-header min-h-hero-sm flex flex-col justify-center">
        <div className="container w-full">
          <p className="label">Writing</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">
            Blog
          </h1>
          <p className="mono dim max-w-2xl text-sm">
            Articles shared with <code className="mono">/share-blog</code> in
            Discord. Served from <code className="mono">GET /api/blogs</code>.
          </p>
        </div>
      </section>

      <section className="section min-h-section">
        <div className="container w-full">
          {blogs.length === 0 ? (
            <div className="empty-state">
              <p>No blog posts yet. Share one from Discord to populate this list.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {blogs.map((b) => (
                <a
                  key={b.id}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="blog-row flex items-center justify-between gap-4 border-b border-[var(--border)] py-4 text-[var(--text)] no-underline first:pt-0 sm:py-5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{b.title}</p>
                    <p className="mono dim mt-1 text-[0.75rem]">
                      @{b.user.discordId.slice(-8)} · ▲ {b.upvotes}
                    </p>
                  </div>
                  <span className="mono dim shrink-0 text-[0.72rem]">↗</span>
                </a>
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
