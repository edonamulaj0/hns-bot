import type { Metadata } from "next";
import { Suspense } from "react";
import MembersHub from "./MembersHub";

export const metadata: Metadata = {
  title: "Members | H4ck&Stack",
  description:
    "Community profiles, shipped projects, and articles — explore members, tech stacks, and hall of fame winners.",
};

function MembersFallback() {
  return (
    <>
      <section className="page-header min-h-[min(28dvh,280px)] flex flex-col justify-center">
        <div className="container w-full">
          <p className="label">Community</p>
          <h1 className="mb-3 text-3xl font-bold sm:text-4xl md:text-5xl">Members</h1>
          <p className="text-white/60 max-w-2xl text-sm sm:text-base">Loading hub…</p>
        </div>
      </section>
      <section className="section pt-4">
        <div className="container w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 rounded bg-white/5" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default function MembersPage() {
  return (
    <Suspense fallback={<MembersFallback />}>
      <MembersHub />
    </Suspense>
  );
}
