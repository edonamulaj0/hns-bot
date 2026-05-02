"use client";

import { AmbientBackground } from "@/components/AmbientBackground";
import { ScrollToTop } from "@/components/ScrollToTop";

export function ClientOverlays() {
  return (
    <>
      <ScrollToTop />
      <AmbientBackground />
    </>
  );
}
