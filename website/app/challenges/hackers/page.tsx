import type { Metadata } from "next";
import { getChallenges } from "@/lib/api";
import ChallengesTrackPage from "../ChallengesTrackPage";

export const runtime = "edge";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Hacker Challenges | H4ck&Stack",
  description: "Monthly security track briefs — writeups, tools, and research.",
};

export default async function HackerChallengesPage() {
  let challenges: Awaited<ReturnType<typeof getChallenges>>["challenges"] = [];
  try {
    const res = await getChallenges("HACKER");
    challenges = res.challenges;
  } catch {
    challenges = [];
  }

  return (
    <ChallengesTrackPage
      track="HACKER"
      heading="Hacker Challenges"
      description="Focus on security outcomes each month: CTF writeups, tooling, vuln research, and red-team style work. Same calendar as the developer track — enroll, build during the window, submit via Discord."
      otherLabel="Looking for the build track? → Developer Challenges"
      otherHref="/challenges/developers"
      challenges={challenges}
    />
  );
}
