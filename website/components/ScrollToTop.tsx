"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ScrollToTopInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    window.history.scrollRestoration = "manual";
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, searchParams]);

  return null;
}

export function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopInner />
    </Suspense>
  );
}
