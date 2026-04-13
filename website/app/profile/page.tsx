import type { Metadata } from "next";
import { ProfilePageClient } from "./ProfilePageClient";

export const metadata: Metadata = {
  title: "Profile | H4ck&Stack",
  description: "Edit your public H4ck&Stack profile: display name, bio, GitHub, LinkedIn, and tech stack.",
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
