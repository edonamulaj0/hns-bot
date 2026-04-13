import Link from "next/link";
import type { PublicMemberProfile } from "@/lib/api";
import { formatTechStack, userProfileAvatarUrl } from "@/lib/api";
import { BlogArticleCard } from "@/components/BlogArticleCard";
import { memberDisplayName } from "@/lib/member-label";
import { ensureAbsoluteUrl, githubProfileHref } from "@/lib/url";

export function PublicProfileView({ data }: { data: PublicMemberProfile }) {
  const u = data.user;
  const avatar = userProfileAvatarUrl(
    {
      discordId: u.discordId,
      github: u.github,
      avatarHash: u.avatarHash,
      profileAvatarSource: u.profileAvatarSource,
    },
    256,
  );
  const gh = githubProfileHref(u.github);
  const li = ensureAbsoluteUrl(u.linkedin);
  const stack = formatTechStack(u.techStack as string[] | null | undefined);

  return (
    <section className="section px-[clamp(1rem,4vw,2rem)]">
      <div className="container max-w-5xl space-y-10">
        <nav className="text-sm">
          <Link href="/members" className="text-white/50 hover:text-[var(--accent)]">
            ← Members
          </Link>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr]">
          <aside className="h-fit space-y-4 rounded border border-[var(--border)] bg-[var(--bg-card)] p-5 lg:sticky lg:top-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar}
              alt=""
              width={160}
              height={160}
              className="rounded-xl border border-[var(--border)] mx-auto lg:mx-0"
            />
            <div className="text-center lg:text-left">
              <h1 className="font-bold text-xl">{memberDisplayName(u)}</h1>
            </div>
            <p className="mono text-[0.65rem] text-white/40 break-all text-center lg:text-left">
              Discord ID · {u.discordId}
            </p>
            <p className="text-sm text-[var(--accent)] text-center lg:text-left">
              Rank #{u.rank || "—"} · {u.points} XP
            </p>
            <p className="text-xs text-white/45 text-center lg:text-left">
              Submissions: {u.stats.submissions} · Articles: {u.stats.blogs} · Votes cast:{" "}
              {u.stats.votesCast}
            </p>
            {u.profileCompletedAt ? (
              <p className="text-xs text-white/40 text-center lg:text-left">
                Member since {new Date(u.profileCompletedAt).toLocaleDateString()}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {gh ? (
                <a href={gh} target="_blank" rel="noopener noreferrer" className="btn text-xs py-1.5">
                  GitHub
                </a>
              ) : null}
              {li ? (
                <a href={li} target="_blank" rel="noopener noreferrer" className="btn text-xs py-1.5">
                  LinkedIn
                </a>
              ) : null}
            </div>
          </aside>

          <div className="space-y-10 min-w-0">
            <div className="rounded border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6">
              <h2 className="font-bold text-lg mb-3">About</h2>
              {u.bio?.trim() ? (
                <p className="text-sm text-white/70 whitespace-pre-wrap">{u.bio}</p>
              ) : (
                <p className="text-sm text-white/45">No bio yet.</p>
              )}
              {stack.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {stack.map((t) => (
                    <span key={t} className="tag text-[0.65rem]">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <h2 className="font-bold text-lg mb-4">Submissions</h2>
              {data.submissions.length === 0 ? (
                <div className="empty-state">
                  <p>No published submissions to show yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.submissions.map((s) => {
                    const dev = (s.track ?? "DEVELOPER") === "DEVELOPER";
                    return (
                      <article key={s.id} className="card p-4 sm:p-5 flex flex-col">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="tag tag-accent text-xs">{s.tier}</span>
                          <span className="tag text-xs">{dev ? "Developer" : "Hacker"}</span>
                          <span className="mono text-[0.65rem] text-white/45 ml-auto">
                            {s.month} · ▲ {s.votes}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                        <p className="text-sm text-white/55 line-clamp-3 mb-3 flex-1">{s.description}</p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                          <a
                            href={s.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn text-xs py-1.5"
                          >
                            Repo
                          </a>
                          {s.demoUrl ? (
                            <a
                              href={s.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn text-xs py-1.5"
                            >
                              Demo
                            </a>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h2 className="font-bold text-lg mb-4">Articles</h2>
              {data.blogs.length === 0 ? (
                <div className="empty-state">
                  <p>No articles shared yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.blogs.map((blog) => (
                    <BlogArticleCard key={blog.id} blog={blog} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
