import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found | H4ck&Stack",
  description: "The page you requested does not exist on H4ck&Stack.",
};

export default function NotFound() {
  return (
    <div className="section flex min-h-[70dvh] flex-col items-center justify-center px-[clamp(1rem,4vw,2rem)]">
      <div className="card max-w-2xl p-6 text-center sm:p-10">
        <p className="label mb-3">404</p>
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl lg:text-5xl">Page not found</h1>
        <p className="mx-auto mb-8 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
          This link does not resolve, but the launch loop is still live. Head back to the main paths below.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Home
          </Link>
          <Link href="/challenges" className="btn">
            Challenges
          </Link>
          <Link href="/members" className="btn">
            Members
          </Link>
          <Link href="/join" className="btn">
            Join Discord
          </Link>
        </div>
      </div>
    </div>
  );
}
