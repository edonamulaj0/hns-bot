import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth-server";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings | H4ck&Stack",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }
  return <SettingsClient />;
}
