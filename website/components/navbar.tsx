"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/challenges", label: "Challenges" },
  { href: "/members", label: "Members" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

const DISCORD_INVITE = "https://discord.gg/hackandstack";

function linkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-[100] border-b border-[var(--border)] bg-[rgba(5,5,5,0.92)] backdrop-blur-md supports-[backdrop-filter]:bg-[rgba(5,5,5,0.85)]">
      <div className="container flex min-h-[3.5rem] w-full items-center justify-between gap-3 py-2">
        <Link
          href="/"
          className="font-mono text-lg font-bold tracking-tight text-[var(--accent)] no-underline shrink-0"
        >
          H4cknStack
        </Link>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded border border-[var(--border-bright)] text-[var(--text)] md:hidden"
          aria-expanded={open}
          aria-controls="nav-panel"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>

        <div
          id="nav-panel"
          className={`fixed inset-x-0 top-[3.5rem] bottom-0 z-[99] flex flex-col gap-1 overflow-y-auto border-t border-[var(--border)] bg-[var(--bg)] p-4 md:static md:inset-auto md:top-auto md:z-auto md:max-h-none md:flex-row md:items-center md:gap-1 md:overflow-visible md:border-t-0 md:bg-transparent md:p-0 ${
            open ? "flex" : "hidden md:flex"
          }`}
        >
          {NAV_LINKS.map((link) => {
            const active = linkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded px-3 py-2.5 font-display text-sm no-underline transition-colors md:py-1.5 ${
                  active
                    ? "border border-[rgba(204,255,0,0.35)] bg-[rgba(204,255,0,0.1)] text-[var(--accent)]"
                    : "border border-transparent text-[var(--text-dim)] hover:border-[var(--border-bright)] hover:text-[var(--text)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-2 justify-center md:mt-0 md:ml-2"
          >
            Join Discord
          </a>
        </div>
      </div>
    </nav>
  );
}
