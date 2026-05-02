import Link from "next/link";
import Image from "next/image";
import type { PublicMemberProfile } from "@/lib/api";
import { formatTechStack, userProfileAvatarUrl } from "@/lib/api";
import { BlogArticleCard } from "@/components/BlogArticleCard";
import { memberDisplayName } from "@/lib/member-label";
import { ensureAbsoluteUrl, githubProfileHref } from "@/lib/url";

type PublicProfileViewProps = {
  data: PublicMemberProfile;
  isOwnProfile?: boolean;
  manageLinks?: { submissions: string; articles: string; projects: string };
};

const AVATAR_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTYiIGhlaWdodD0iMjU2Ij48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzFhMWExYSIvPjwvc3ZnPg==";

export function PublicProfileView({ data, isOwnProfile = false, manageLinks }: PublicProfileViewProps) {
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
            <Image
              src={avatar}
              alt={`${memberDisplayName(u)} avatar`}
              width={256}
              height={256}
              quality={80}
              placeholder="blur"
              blurDataURL={AVATAR_BLUR_DATA_URL}
              className="rounded-xl border border-[var(--border)] mx-auto lg:mx-0"
              style={{ width: 160, height: 160 }}
            />
            <div className="text-center lg:text-left">
              <h1 className="font-bold text-xl">{memberDisplayName(u)}</h1>
            </div>
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
              <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-bold text-lg">Submissions</h2>
              {isOwnProfile && manageLinks ? (
                <Link href={manageLinks.submissions} className="btn text-xs py-1.5">
                  Manage submissions
                </Link>
              ) : null}
            </div>
              {data.submissions.length === 0 ? (
                <div className="empty-state">
                  <p>No published submissions to show yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.submissions.map((s) => {
                    const trackLabel =
                      (s.track ?? "DEVELOPER") === "HACKER"
                        ? "Hacker"
                        : (s.track ?? "DEVELOPER") === "DESIGNERS"
                          ? "Designer"
                          : "Developer";
                    const isDesigner = (s.track ?? "DEVELOPER") === "DESIGNERS";
                    return (
                      <article key={s.id} className="card p-4 sm:p-5 flex flex-col">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="tag tag-accent text-xs">{s.tier}</span>
                          <span className="tag text-xs">{trackLabel}</span>
                          <span className="mono text-[0.65rem] text-white/45 ml-auto">
                            {s.month} · ▲ {s.votes}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                        <p className="text-sm text-white/55 line-clamp-3 mb-3 flex-1">{s.description}</p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {isDesigner && s.attachmentUrl ? (
                            <a
                              href={s.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn text-xs py-1.5"
                            >
                              Image
                            </a>
                          ) : (
                            <a
                              href={s.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn text-xs py-1.5"
                            >
                              Repo
                            </a>
                          )}
                          <Link href={`/submissions/${s.id}`} className="btn text-xs py-1.5">
                            Detail
                          </Link>
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
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="font-bold text-lg">Other Projects</h2>
                {isOwnProfile && manageLinks ? (
                  <Link href={manageLinks.projects} className="btn text-xs py-1.5">
                    Manage projects
                  </Link>
                ) : null}
              </div>
              {(data.projects ?? []).length === 0 ? (
                <div className="empty-state">
                  <p>No extra projects shared yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(data.projects ?? []).map((project) => (
                    <article key={project.id} className="card p-4 sm:p-5 flex flex-col gap-3">
                      <h3 className="font-bold text-lg">{project.title}</h3>
                      {project.content?.trim() ? (
                        <p className="text-sm text-white/60 line-clamp-4">
                          {project.content.trim()}
                        </p>
                      ) : (
                        <p className="text-sm text-white/45">No markdown description provided.</p>
                      )}
                      <a
                        href={project.viewUrl ?? project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn text-xs w-fit mt-auto"
                      >
                        Open project →
                      </a>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-bold text-lg">Articles</h2>
              {isOwnProfile && manageLinks ? (
                <Link href={manageLinks.articles} className="btn text-xs py-1.5">
                  Manage articles
                </Link>
              ) : null}
            </div>
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
