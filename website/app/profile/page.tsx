import type { Metadata } from "next";
import { ProfilePageClient } from "./ProfilePageClient";

export const metadata: Metadata = {
  title: "Profile | H4ck&Stack",
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
