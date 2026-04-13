import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "What we do | H4ck&Stack",
  description: "Learn about H4ck&Stack’s mission, challenges, and community — see About.",
};

export default function WhatWeDoRedirectPage() {
  redirect("/about");
}
