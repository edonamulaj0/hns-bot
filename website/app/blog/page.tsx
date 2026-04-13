import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Blog | H4ck&Stack",
  description: "Community articles and writing — see the Activity feed on H4ck&Stack.",
};

export default function BlogRedirectPage() {
  redirect("/activity");
}
