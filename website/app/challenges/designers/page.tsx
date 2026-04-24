import type { Metadata } from "next";
import { getChallenges } from "@/lib/api";
import ChallengesTrackPage from "../ChallengesTrackPage";

export const runtime = "edge";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Graphic Design Challenges | H4ck&Stack",
  description:
    "Monthly graphic design track briefs — Beginner, Intermediate, and Advanced. Submit PNG, JPG, or WebP image exports.",
};

export default async function DesignerChallengesPage() {
  let challenges: Awaited<ReturnType<typeof getChallenges>>["challenges"] = [];
  try {
    const res = await getChallenges("DESIGNERS");
    challenges = res.challenges;
  } catch {
    challenges = [];
  }

  return (
    <ChallengesTrackPage
      track="DESIGNERS"
      heading="Graphic Design Challenges"
      description="Design posters, brand kits, UI mockups, or motion graphics over the monthly build window. Submit a PNG, JPG, or WebP image export — show your visual thinking, not just your tools."
      otherLabel="Looking for the developer track? → Developer Challenges"
      otherHref="/challenges/developers"
      challenges={challenges}
    />
  );
}
