import type { Metadata } from "next";
import ActivityPageClient from "./ActivityPageClient";

export const metadata: Metadata = {
  title: "Activity | H4ck&Stack",
  description: "Recent submissions, shared articles, and community updates from H4ck&Stack.",
};

export default function ActivityRoutePage() {
  return <ActivityPageClient />;
}
