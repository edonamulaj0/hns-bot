"use client";

import dynamic from "next/dynamic";
import { ScrollToTop } from "@/components/ScrollToTop";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => m.AmbientBackground),
  { ssr: false },
);

export function ClientOverlays() {
  return (
    <>
      <ScrollToTop />
      <AmbientBackground />
    </>
  );
}
