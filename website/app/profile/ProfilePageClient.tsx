"use client";

import { useEffect, useState } from "react";
import { fetchMe, fetchUserPublicProfile } from "@/lib/api-browser";
import type { ChallengeDto, PublicMemberProfile } from "@/lib/api";
import { getSessionClientWithRetry, loginUrl } from "@/lib/auth-client";
import { PublicProfileView } from "@/app/members/user/[discordId]/PublicProfileView";
import { ProfileChallengeStatus } from "@/components/ProfileChallengeStatus";

export function ProfilePageClient() {
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicMemberProfile | null>(null);
  const [enrollment, setEnrollment] = useState<{ challenge: ChallengeDto } | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const session = await getSessionClientWithRetry();
        if (!session) {
          if (alive) setNeedsSignIn(true);
          return;
        }

        if (alive) setNeedsSignIn(false);

        const profileRes = await fetchUserPublicProfile(session.discordId);
        if (!profileRes.ok) {
          if (alive) setError("Could not load your profile.");
          return;
        }

        const profile = (await profileRes.json()) as PublicMemberProfile;
        if (!alive) return;

        setData(profile);

        let nextEnrollment: { challenge: ChallengeDto } | null = null;
        try {
          const meRes = await fetchMe();
          if (meRes.ok) {
            const me = (await meRes.json()) as { enrollment: { challenge: ChallengeDto } | null };
            nextEnrollment = me.enrollment ?? null;
          }
        } catch {
          nextEnrollment = null;
        }
        if (alive) setEnrollment(nextEnrollment);
      } catch {
        if (alive) setError("Could not load your profile.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="section px-[clamp(1rem,4vw,2rem)]">
        <div className="container max-w-5xl space-y-4">
          <div className="skeleton h-8 w-40 rounded" aria-hidden="true" />
          <div className="skeleton h-40 w-full rounded" aria-hidden="true" />
          <div className="skeleton h-40 w-full rounded" aria-hidden="true" />
        </div>
      </section>
    );
  }

  if (needsSignIn) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-white/60 text-center max-w-md">
          Sign in with Discord to view your profile.
        </p>
        <a href={loginUrl()} className="btn btn-primary">
          Sign in with Discord
        </a>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-white/60 text-center max-w-md">
          {error || "Could not load your profile right now."}
        </p>
      </section>
    );
  }

  return (
    <>
      {enrollment !== undefined ? (
        <ProfileChallengeStatus phase={data.phase} month={data.month} enrollment={enrollment} />
      ) : null}
      <PublicProfileView
        data={data}
        isOwnProfile
        manageLinks={{
          submissions: "/profile/submissions",
          articles: "/profile/articles",
          projects: "/profile/projects",
        }}
      />
    </>
  );
}
