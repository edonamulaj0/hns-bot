import Link from "next/link";
import { notFound, redirect } from "next/navigation";

function serverWorkerBase(): string {
  const raw =
    process.env.HNS_WORKER_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "";
  const base = raw.replace(/\/$/, "");
  if (!base || base.includes("YOUR_SUBDOMAIN")) {
    if (process.env.NODE_ENV === "development") return "http://127.0.0.1:8787";
    return "";
  }
  return base;
}

export default async function GoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug || slug.length > 32) notFound();

  const base = serverWorkerBase();
  if (!base) {
    return (
      <section className="section flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-white/60 text-center">
          API URL is not configured. Set <code className="mono">NEXT_PUBLIC_API_URL</code>.
        </p>
      </section>
    );
  }

  const res = await fetch(`${base}/api/redirect/${encodeURIComponent(slug)}`, {
    redirect: "manual",
    cache: "no-store",
  });

  if (res.status === 302) {
    const loc = res.headers.get("Location");
    if (loc) redirect(loc);
  }

  if (res.status === 404) notFound();

  if (res.headers.get("Content-Type")?.includes("application/json")) {
    const data = (await res.json()) as { status?: string; message?: string };
    return (
      <section className="section flex min-h-[50vh] items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-xl font-bold mb-3">Demo not public yet</h1>
          <p className="text-white/65 text-sm leading-relaxed mb-6">
            {data.message ??
              "This demo is hidden until publish day. Voting closes day 25; results and demos go live on day 29."}
          </p>
          <Link href="/challenges" className="btn">
            ← Back to challenges
          </Link>
        </div>
      </section>
    );
  }

  notFound();
}
