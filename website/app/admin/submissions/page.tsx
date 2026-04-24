import type { Metadata } from "next";
import { AdminSubmissionsClient } from "./AdminSubmissionsClient";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Admin · Submissions | H4ck&Stack",
  description: "Review pending challenge submissions.",
  robots: { index: false, follow: false },
};

export default function AdminSubmissionsPage() {
  return <AdminSubmissionsClient />;
}
