import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserPublicProfile } from "@/lib/api";
import { memberDisplayName } from "@/lib/member-label";
import { PublicProfileView } from "./PublicProfileView";

const SNOWFLAKE_RE = /^\d{17,20}$/;

type PageProps = { params: Promise<{ discordId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { discordId } = await params;
  if (!SNOWFLAKE_RE.test(discordId)) {
    return { title: "Member | H4ck&Stack" };
  }
  const data = await getUserPublicProfile(discordId);
  if (!data) {
    return { title: "Member not found | H4ck&Stack" };
  }
  const label = memberDisplayName(data.user);
  return {
    title: `${label} | H4ck&Stack`,
    description: data.user.bio?.trim().slice(0, 160) || undefined,
  };
}

export default async function UserPublicProfilePage({ params }: PageProps) {
  const { discordId } = await params;
  if (!SNOWFLAKE_RE.test(discordId)) notFound();
  const data = await getUserPublicProfile(discordId);
  if (!data) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="text-white/60 text-center max-w-md">
          There is no member with Discord ID <span className="mono text-white/80">{discordId}</span>, or
          the profile could not be loaded.
        </p>
        <Link href="/members" className="btn">
          Back to members
        </Link>
      </section>
    );
  }
  return <PublicProfileView data={data} />;
}
