import Link from "next/link";
import { formatTechStack, getMembers } from "@/lib/api";
import { ensureAbsoluteUrl, githubProfileHref } from "@/lib/url";

export const revalidate = 60;
export const metadata = { title: "Members — Hack & Stack" };

export default async function MembersPage() {
  const data = await getMembers().catch(() => null);
  const members = data?.members ?? [];

  return (
    <>
      <section className="page-header min-h-hero-sm flex flex-col justify-center">
        <div className="container w-full">
          <p className="label">Community</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">
            Members
          </h1>
          <p className="mono dim max-w-2xl text-sm">
            Profiles from <code className="mono">/setup-profile</code> in Discord.
            Data is served from{" "}
            <code className="mono">GET /api/members</code> on your worker.
          </p>
        </div>
      </section>

      <section className="section min-h-section">
        <div className="container w-full">
          {members.length === 0 ? (
            <div className="empty-state">
              <p>
                No members loaded yet. Point{" "}
                <code className="mono">NEXT_PUBLIC_API_URL</code> at your worker
                and implement <code className="mono">GET /api/members</code>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
              {members.map((m) => {
                const stack = formatTechStack(m.techStack);
                const gh = githubProfileHref(m.github);
                const li = ensureAbsoluteUrl(m.linkedin);
                return (
                  <article
                    key={m.discordId}
                    className="card member-card p-5 sm:p-6"
                  >
                    <p className="mono dim text-[0.72rem]">
                      @{m.discordId.slice(-8)}
                    </p>
                    <p className="mt-2 font-bold">
                      {m.points} XP · rank {m.rank}
                    </p>
                    {m.bio && (
                      <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
                        {m.bio}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {gh && (
                        <a
                          href={gh}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn px-2.5 py-1 text-[0.72rem]"
                        >
                          GitHub
                        </a>
                      )}
                      {li && (
                        <a
                          href={li}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn px-2.5 py-1 text-[0.72rem]"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                    {stack.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
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
