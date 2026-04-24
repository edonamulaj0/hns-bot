import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubmissionDetailClient } from "./SubmissionDetailClient";

export const runtime = "edge";

const SUBMISSION_ID_RE = /^c[a-z0-9]{20,}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Submission | H4ck&Stack`,
    description: `Challenge submission ${id} on H4ck&Stack.`,
    openGraph: {
      title: `Submission | H4ck&Stack`,
      description: `View this challenge submission on H4ck&Stack.`,
      type: "article",
      url: `https://h4cknstack.com/submissions/${id}`,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!SUBMISSION_ID_RE.test(id)) notFound();
  return <SubmissionDetailClient id={id} />;
}
