import type { Metadata } from "next";
import { SubmitPageClient } from "./SubmitPageClient";

export const metadata: Metadata = {
  title: "Submit — H4cknStack",
};

export default function SubmitPage() {
  return <SubmitPageClient />;
}
