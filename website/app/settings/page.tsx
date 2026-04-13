import type { Metadata } from "next";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | H4ck&Stack",
  description: "Update your H4ck&Stack profile, tech stack, linked accounts, and account preferences.",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
