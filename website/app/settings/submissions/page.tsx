import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { SubmissionsClient } from "./SubmissionsClient";

export const metadata: Metadata = {
  title: "My Submissions | H4ck&Stack",
};

export default async function SettingsSubmissionsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  return <SubmissionsClient />;
}
