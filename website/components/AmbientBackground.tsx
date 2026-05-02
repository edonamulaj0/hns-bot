"use client";

export function AmbientBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[-1]"
      aria-hidden="true"
    />
  );
}