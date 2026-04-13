import type { Metadata } from "next";
import { getAboutStats } from "@/lib/about-stats";
import AboutClient from "./AboutClient";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "About | H4ck&Stack",
  description:
    "Mission, community stats, and FAQ for H4ck&Stack — monthly build and security challenges for developers worldwide.",
};

export const revalidate = 60;

export default async function AboutPage() {
  const openStats = await getAboutStats();
  return <AboutClient openStats={openStats} />;
}
