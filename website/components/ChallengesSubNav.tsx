"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/challenges", label: "Overview" },
  { href: "/challenges/developers", label: "Developer Track" },
  { href: "/challenges/hackers", label: "Hacker Track" },
  { href: "/challenges/designer", label: "Designer Track" },
];

export function ChallengesSubNav() {
  const pathname = usePathname();
  if (!pathname.startsWith("/challenges")) return null;

  return (
    <div className="border-b border-[var(--border)] bg-[var(--bg)]">
      <div className="container flex flex-wrap gap-1 sm:gap-2 md:gap-4 py-2 text-xs sm:text-sm">
        {LINKS.map((l) => {
          const active =
            l.href === "/challenges"
              ? pathname === "/challenges"
              : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 flex items-center font-display no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                active
                  ? "text-[var(--accent)] border border-[rgba(204,255,0,0.25)] bg-[rgba(204,255,0,0.06)]"
                  : "text-white/50 hover:text-white/90"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
