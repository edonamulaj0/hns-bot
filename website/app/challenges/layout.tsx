import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Challenges | ${BRAND_NAME}`,
  description:
    "Monthly developer and hacker track challenges, briefs, published archive, and community voting on H4ck&Stack.",
};

export default function ChallengesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
