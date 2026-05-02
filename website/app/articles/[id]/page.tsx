import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleMarkdown } from "@/components/ArticleMarkdown";
import { getBlogArticle } from "@/lib/api";
import { memberDisplayName } from "@/lib/member-label";
import { formatFeedTime } from "@/lib/relative-time";

export const runtime = "edge";

const ARTICLE_ID_RE = /^c[a-z0-9]{20,}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!ARTICLE_ID_RE.test(id)) {
    return { title: "Article | H4ck&Stack" };
  }
  const blog = await getBlogArticle(id);
  if (!blog) {
    return { title: "Article | H4ck&Stack", description: "Community article on H4ck&Stack." };
  }
  const title = blog.title?.trim() || "Article";
  const desc =
    blog.content?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `Article by ${memberDisplayName(blog.user)} on H4ck&Stack.`;
  return {
    title: `${title} | H4ck&Stack`,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "article",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ARTICLE_ID_RE.test(id)) notFound();
  const blog = await getBlogArticle(id);
  if (!blog) notFound();

  const author = memberDisplayName(blog.user);
  const external = blog.url?.trim();

  return (
    <article className="section px-[clamp(1rem,4vw,2rem)] pb-[clamp(3rem,10vh,5rem)]">
      <div className="container max-w-[680px]">
        <nav className="mb-10 text-sm">
          <Link href="/activity" className="text-white/50 hover:text-[var(--accent)]">
            ← Activity
          </Link>
          <span className="text-white/25 mx-2">·</span>
          <Link
            href={`/members/user/${blog.user.discordId}`}
            className="text-white/50 hover:text-[var(--accent)]"
          >
            {author}
          </Link>
        </nav>

        <header className="mb-12 border-b border-[var(--border)] pb-10">
          <h1 className="font-bold text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.15] tracking-tight">
            {blog.title}
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/50">
            <Link
              href={`/members/user/${blog.user.discordId}`}
              className="text-[var(--accent)] hover:underline font-medium"
            >
              {author}
            </Link>
            <time dateTime={blog.createdAt} className="mono text-xs text-white/40">
              {formatFeedTime(blog.createdAt)}
            </time>
            <span className="mono text-xs text-white/35">👁 {blog.views}</span>
            <span className="mono text-xs text-[var(--accent)]">▲ {blog.upvotes}</span>
          </div>
          {external ? (
            <p className="mt-4 text-sm">
              <a
                href={external}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-subtle)] hover:underline"
              >
                Also published externally →
              </a>
            </p>
          ) : null}
        </header>

        <ArticleMarkdown markdown={blog.content} />
      </div>
    </article>
  );
}
