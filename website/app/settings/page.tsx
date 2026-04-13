import type { Metadata } from "next";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | H4ck&Stack",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
