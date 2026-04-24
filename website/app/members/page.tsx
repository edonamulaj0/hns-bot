import type { Metadata } from "next";
import { Suspense } from "react";
import MembersHub from "./MembersHub";
import { getLeaderboard, getMembers } from "@/lib/api";

export const runtime = "edge";

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
          <div className="max-w-2xl space-y-2">
            <div className="skeleton h-3 w-64" aria-hidden="true" />
            <div className="skeleton h-3 w-52" aria-hidden="true" />
          </div>
        </div>
      </section>
      <section className="section pt-4">
        <div className="container w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="card p-4 sm:p-5">
                <div className="mb-3 flex items-start gap-3">
                  <div className="skeleton h-10 w-10 rounded-full shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="skeleton h-3 w-2/3" aria-hidden="true" />
                    <div className="skeleton h-3 w-1/2" aria-hidden="true" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="skeleton h-2.5 w-full" aria-hidden="true" />
                  <div className="skeleton h-2.5 w-5/6" aria-hidden="true" />
                  <div className="skeleton h-2.5 w-2/3" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default async function MembersPage() {
  const [membersRes, leaderboardRes] = await Promise.all([
    getMembers(),
    getLeaderboard(),
  ]);

  return (
    <Suspense fallback={<MembersFallback />}>
      <MembersHub
        initialMembers={membersRes.members}
        initialLeaderboard={leaderboardRes.leaderboard}
      />
    </Suspense>
  );
}
