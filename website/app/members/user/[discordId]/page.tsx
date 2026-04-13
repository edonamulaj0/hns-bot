import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserPublicProfile } from "@/lib/api";
import { memberDisplayName } from "@/lib/member-label";
import { PublicProfileView } from "./PublicProfileView";

export const runtime = "edge";

const SNOWFLAKE_RE = /^\d{17,20}$/;

type PageProps = { params: Promise<{ discordId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { discordId } = await params;
  if (!SNOWFLAKE_RE.test(discordId)) {
    return {
      title: "Member | H4ck&Stack",
      description: "Browse community members, projects, and articles on H4ck&Stack.",
    };
  }
  const data = await getUserPublicProfile(discordId);
  if (!data) {
    return {
      title: "Member not found | H4ck&Stack",
      description: "This member profile could not be found on H4ck&Stack.",
    };
  }
  const label = memberDisplayName(data.user);
  const bio = data.user.bio?.trim().slice(0, 160);
  return {
    title: `${label} | H4ck&Stack`,
    description:
      bio ||
      `Public profile, portfolio submissions, and articles for ${label} on H4ck&Stack.`,
  };
}

export default async function MemberUserProfilePage({ params }: PageProps) {
  const { discordId } = await params;
  if (!SNOWFLAKE_RE.test(discordId)) notFound();
  const data = await getUserPublicProfile(discordId);
  if (!data) {
    return (
      <section className="section flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="text-white/60 text-center max-w-md">
          No row in the database for Discord ID{" "}
          <span className="mono text-white/80">{discordId}</span>. If you just signed in, confirm the{" "}
          <strong className="text-white/80">auth Worker</strong> and <strong className="text-white/80">bot Worker</strong>{" "}
          use the same D1 <span className="mono text-white/70">database_id</span> (see repo{" "}
          <span className="mono">auth/wrangler.toml</span> and <span className="mono">wrangler.toml</span>).
        </p>
        <p className="text-white/50 text-center max-w-md text-sm">
          After sign-in, your account is created on first successful OAuth. Try opening{" "}
          <span className="mono text-white/70">/profile</span> while logged in, then reload this page.
        </p>
        <Link href="/members" className="btn">
          Back to members
        </Link>
      </section>
    );
  }
  return <PublicProfileView data={data} />;
}
