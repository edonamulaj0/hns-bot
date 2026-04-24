"use client";

import dynamic from "next/dynamic";

const AmbientBackground = dynamic(
  () => import("@/components/AmbientBackground").then((m) => m.AmbientBackground),
  { ssr: false },
);
const SplashScreen = dynamic(
  () => import("@/components/SplashScreen").then((m) => m.SplashScreen),
  { ssr: false },
);

export function ClientOverlays() {
  return (
    <>
      <SplashScreen />
      <AmbientBackground />
    </>
  );
}
