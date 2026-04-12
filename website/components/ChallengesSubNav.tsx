"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/challenges", label: "Overview" },
  { href: "/challenges/developers", label: "Developer Track" },
  { href: "/challenges/hackers", label: "Hacker Track" },
];

export function ChallengesSubNav() {
  const pathname = usePathname();
  if (!pathname.startsWith("/challenges")) return null;

  return (
    <div className="border-b border-[var(--border)] bg-[rgba(8,8,8,0.92)] backdrop-blur-sm">
      <div className="container flex flex-wrap gap-1 sm:gap-4 py-2 text-xs sm:text-sm">
        {LINKS.map((l) => {
          const active =
            l.href === "/challenges"
              ? pathname === "/challenges"
              : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded px-2 py-1.5 font-display no-underline transition-colors ${
                active
                  ? "text-[var(--accent)] border border-[rgba(124,47,235,0.25)] bg-[rgba(124,47,235,0.06)]"
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
