"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { BRAND_LOGO_PNG, BRAND_LOGO_SVG, BRAND_NAME } from "@/lib/branding";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/challenges", label: "Challenges" },
  { href: "/members", label: "Members" },
  { href: "/activity", label: "Activity" },
  { href: "/about", label: "About" },
];

function linkActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavBrand() {
  const [step, setStep] = useState<"png" | "svg" | "text">("png");
  if (step === "text") {
    return (
      <span className="font-mono text-lg font-bold tracking-tight text-[var(--accent)]">
        {BRAND_NAME}
      </span>
    );
  }
  const src = step === "png" ? BRAND_LOGO_PNG : BRAND_LOGO_SVG;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={BRAND_NAME}
      width={220}
      height={40}
      className="h-8 w-auto max-h-9 max-w-[min(220px,58vw)] object-contain object-left"
      onError={() => setStep((s) => (s === "png" ? "svg" : "text"))}
    />
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  return (
    <nav className="sticky top-0 z-[100] border-b border-[var(--border)] bg-[rgba(5,5,5,0.92)] backdrop-blur-md supports-[backdrop-filter]:bg-[rgba(5,5,5,0.85)]">
      <div className="container flex min-h-[3.5rem] w-full items-center justify-between gap-3 py-2">
        <Link
          href="/"
          className="flex items-center no-underline shrink-0 min-w-0"
        >
          <NavBrand />
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
          className={`fixed left-0 right-0 top-[3.5rem] bottom-0 z-[99] h-[calc(100dvh-3.5rem)] border-t border-[var(--border)] bg-[var(--bg)] md:static md:inset-auto md:top-auto md:z-auto md:h-auto md:max-h-none md:flex md:flex-row md:items-center md:gap-1 md:overflow-visible md:border-t-0 md:bg-transparent md:p-0 ${
            open ? "flex" : "hidden md:flex"
          }`}
        >
          <div className="flex h-[calc(100dvh-3.5rem)] w-full flex-col justify-between overflow-y-auto px-[clamp(1rem,4vw,2rem)] py-[clamp(1.5rem,5vh,2.5rem)] md:h-auto md:w-auto md:flex-row md:items-center md:gap-1 md:overflow-visible md:p-0">
            <div className="flex flex-col gap-1 md:flex-row md:items-center">
              {NAV_LINKS.map((link) => {
                const active = linkActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex w-full items-center justify-between rounded px-4 py-3.5 text-left text-[clamp(1rem,4vw,1.2rem)] no-underline transition-colors md:w-auto md:px-3 md:py-1.5 md:text-sm ${
                      active
                        ? "border border-[rgba(204,255,0,0.35)] bg-[rgba(204,255,0,0.1)] text-[var(--accent)]"
                        : "border border-transparent text-[var(--text-dim)] hover:border-[var(--border-bright)] hover:text-[var(--text)]"
                    }`}
                  >
                    <span>{link.label}</span>
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--accent)",
                        opacity: active ? 1 : 0,
                      }}
                    />
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 md:ml-2 md:flex-row md:items-center md:gap-2 md:border-t-0 md:pt-0">
              <Link href="/join" className="btn btn-primary flex w-full justify-center md:w-auto">
                Join Us
              </Link>
              <AuthNav />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
