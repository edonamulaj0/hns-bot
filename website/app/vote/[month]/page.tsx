import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const runtime = "edge";
import { VoteMonthClient } from "./VoteMonthClient";

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ month: string }>;
}): Promise<Metadata> {
  const { month } = await params;
  return {
    title: `Vote ${month} | H4ck&Stack`,
    description: `Cast your votes for ${month} challenge submissions on H4ck&Stack (signed-in members).`,
  };
}

export default async function VoteMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!MONTH_RE.test(month)) notFound();
  return <VoteMonthClient month={month} />;
}
