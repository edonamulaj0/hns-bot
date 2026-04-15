"use client";

import { useEffect, useState } from "react";
import { fetchUserPublicProfile } from "@/lib/api-browser";
import type { PublicMemberProfile } from "@/lib/api";
import { getSessionClientWithRetry, loginUrl } from "@/lib/auth-client";
import { PublicProfileView } from "@/app/members/user/[discordId]/PublicProfileView";

export function ProfilePageClient() {
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicMemberProfile | null>(null);

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

        const res = await fetchUserPublicProfile(session.discordId);
        if (!res.ok) {
          if (alive) setError("Could not load your profile.");
          return;
        }

        const profile = (await res.json()) as PublicMemberProfile;
        if (alive) setData(profile);
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
          <div className="skeleton h-8 w-40 rounded" />
          <div className="skeleton h-40 w-full rounded" />
          <div className="skeleton h-40 w-full rounded" />
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
    <PublicProfileView
      data={data}
      isOwnProfile
      manageLinks={{
        submissions: "/profile/submissions",
        articles: "/profile/articles",
        projects: "/profile/projects",
      }}
    />
  );
}
