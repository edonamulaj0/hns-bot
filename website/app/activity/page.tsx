import type { Metadata } from "next";
import ActivityPageClient from "./ActivityPageClient";

export const metadata: Metadata = {
  title: "Activity | H4cknStack",
  description: "Recent submissions, shared articles, and community updates from H4cknStack.",
};

export default function ActivityRoutePage() {
  return <ActivityPageClient />;
}
