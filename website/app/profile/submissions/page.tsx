import type { Metadata } from "next";
import { SubmissionsClient } from "@/app/settings/submissions/SubmissionsClient";

export const metadata: Metadata = {
  title: "Manage Submissions | H4ck&Stack",
  description: "View, edit, and delete your challenge submissions.",
};

export default function ProfileSubmissionsPage() {
  return <SubmissionsClient backHref="/profile" />;
}
