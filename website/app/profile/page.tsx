import type { Metadata } from "next";
import { ProfilePageClient } from "./ProfilePageClient";

export const metadata: Metadata = {
  title: "Profile | H4ck&Stack",
  description: "View your public H4ck&Stack profile with your submissions and articles.",
};

export default function ProfilePage() {
  return <ProfilePageClient />;
}
