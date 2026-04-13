import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Profile | H4ck&Stack",
  description: "Redirect to the member’s public profile on H4ck&Stack.",
};

const SNOWFLAKE_RE = /^\d{17,20}$/;

type PageProps = { params: Promise<{ discordId: string }> };

/** Legacy URL — public profiles live under `/members/user/[discordId]`. */
export default async function LegacyUserProfileRedirect({ params }: PageProps) {
  const { discordId } = await params;
  if (!SNOWFLAKE_RE.test(discordId)) {
    permanentRedirect("/members");
  }
  permanentRedirect(`/members/user/${discordId}`);
}
