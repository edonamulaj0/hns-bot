import type { Metadata } from "next";
import { SubmissionsClient } from "./SubmissionsClient";

export const metadata: Metadata = {
  title: "My Submissions | H4ck&Stack",
  description: "View, edit, and manage your monthly challenge submissions on H4ck&Stack.",
};

export default function SettingsSubmissionsPage() {
  return <SubmissionsClient />;
}
