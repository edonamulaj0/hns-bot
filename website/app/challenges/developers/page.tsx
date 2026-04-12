import type { Metadata } from "next";
import { getChallenges } from "@/lib/api";
import ChallengesTrackPage from "../ChallengesTrackPage";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Developer Challenges | H4ck&Stack",
  description: "Monthly developer track briefs — Beginner, Intermediate, and Advanced.",
};

export default async function DeveloperChallengesPage() {
  let challenges: Awaited<ReturnType<typeof getChallenges>>["challenges"] = [];
  try {
    const res = await getChallenges("DEVELOPER");
    challenges = res.challenges;
  } catch {
    challenges = [];
  }

  return (
    <ChallengesTrackPage
      track="DEVELOPER"
      heading="Developer Challenges"
      description="Ship a real project over the monthly build window. Any stack, any idea — tiers help you pick scope. Submit through Discord before the deadline, get votes from the community, and land in the public portfolio."
      otherLabel="Looking for the security track? → Hacker Challenges"
      otherHref="/challenges/hackers"
      challenges={challenges}
    />
  );
}
