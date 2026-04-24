"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { getSessionClient, loginUrl, type SessionUser } from "@/lib/auth-client";
import { userProfileAvatarUrl } from "@/lib/api";
import { BRAND_LOGO_PNG, BRAND_LOGO_SVG, BRAND_NAME } from "@/lib/branding";
import { getMonthKey } from "@/lib/month";

const VISITED_KEY = "hns_has_visited";
const AVATAR_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMWExYTFhIi8+PC9zdmc+";

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

/** Account / settings links: avoid `/settings` matching `/settings/submissions`. */
function sessionAvatarUrl(u: SessionUser): string {
  return userProfileAvatarUrl(
    {
      discordId: u.discordId,
      github: u.github ?? null,
      avatarHash: u.avatarHash,
      profileAvatarSource: u.profileAvatarSource,
    },
    64,
  );
}

function accountLinkActive(pathname: string, href: string): boolean {
  if (href === "/settings/submissions") {
    return pathname === "/settings/submissions" || pathname.startsWith("/settings/submissions/");
  }
  if (href === "/settings") {
    if (pathname === "/settings") return true;
    if (!pathname.startsWith("/settings/")) return false;
    return !pathname.startsWith("/settings/submissions");
  }
  if (href === "/profile") {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }
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
    <Image
      src={src}
      alt={BRAND_NAME}
      width={220}
      height={40}
      priority
      className="h-8 w-auto max-h-9 max-w-[min(220px,58vw)] object-contain object-left"
      onError={() => setStep((s) => (s === "png" ? "svg" : "text"))}
    />
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  /** null = before hydration; false = first visit; true = returning visitor */
  const [hasVisitedBefore, setHasVisitedBefore] = useState<boolean | null>(null);
  const voteMonth = getMonthKey();

  useEffect(() => {
    const prev = localStorage.getItem(VISITED_KEY);
    setHasVisitedBefore(prev === "1");
    if (prev !== "1") localStorage.setItem(VISITED_KEY, "1");
  }, []);

  useEffect(() => {
    getSessionClient().then(setSession);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.documentElement.style.setProperty("--scroll-y", `${window.scrollY}px`);
      document.body.style.cssText =
        "position:fixed;top:calc(-1 * var(--scroll-y));width:100%;overflow:hidden";
    } else {
      const restoreY = parseInt(
        document.documentElement.style.getPropertyValue("--scroll-y") || "0",
        10,
      );
      document.body.style.cssText = "";
      window.scrollTo(0, restoreY);
    }
    return () => {
      const restoreY = parseInt(
        document.documentElement.style.getPropertyValue("--scroll-y") || "0",
        10,
      );
      document.body.style.cssText = "";
      window.scrollTo(0, restoreY);
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
          className="inline-flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded border border-[var(--border-bright)] text-[var(--text)] md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
          className={`fixed left-0 right-0 top-[3.5rem] z-[99] h-[calc(100dvh-3.5rem)] border-t border-[var(--border)] bg-[var(--bg)] md:static md:inset-auto md:top-auto md:z-auto md:h-auto md:max-h-none md:flex md:flex-row md:items-center md:gap-1 md:overflow-visible md:border-t-0 md:bg-transparent md:p-0 ${
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
                      className="md:hidden"
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
              {session && (
                <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 md:hidden">
                  <div className="flex items-center gap-2 rounded border border-[var(--border-bright)] bg-[var(--bg-card)] px-3 py-2.5">
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="flex min-w-0 flex-1 items-center gap-3 no-underline text-[var(--text)]"
                    >
                      <Image
                        src={sessionAvatarUrl(session)}
                        alt=""
                        width={40}
                        height={40}
                        quality={80}
                        placeholder="blur"
                        blurDataURL={AVATAR_BLUR_DATA_URL}
                        className="shrink-0 rounded-full"
                      />
                      <span className="truncate text-left text-[clamp(1rem,4vw,1.1rem)] font-medium">
                        {session.displayName?.trim() || "Account"}
                      </span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setOpen(false)}
                      aria-label="Settings"
                      className={`shrink-0 rounded border p-2.5 no-underline transition-colors ${
                        accountLinkActive(pathname, "/settings")
                          ? "border-[rgba(204,255,0,0.35)] bg-[rgba(204,255,0,0.1)] text-[var(--accent)]"
                          : "border-transparent text-[var(--text-dim)] hover:border-[var(--border-bright)] hover:text-[var(--text)]"
                      }`}
                    >
                      <svg
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                      </svg>
                    </Link>
                  </div>
                  <div className="flex flex-col gap-1">
                    {(
                      [
                        { href: "/profile/submissions", label: "My Submissions" },
                        { href: `/vote/${voteMonth}`, label: "Vote" },
                      ] as const
                    ).map((item) => {
                      const active = accountLinkActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={`flex w-full items-center justify-between rounded px-4 py-3 text-left text-[clamp(1rem,4vw,1.05rem)] no-underline transition-colors ${
                            active
                              ? "border border-[rgba(204,255,0,0.35)] bg-[rgba(204,255,0,0.1)] text-[var(--accent)]"
                              : "border border-transparent text-[var(--text-dim)] hover:border-[var(--border-bright)] hover:text-[var(--text)]"
                          }`}
                        >
                          <span>{item.label}</span>
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
                  <form action="/auth/logout" method="post" className="border-t border-[var(--border)] pt-4">
                    <button
                      type="submit"
                      className="btn btn-primary w-full justify-center py-3.5 text-[clamp(1rem,4vw,1.05rem)] font-bold"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 md:ml-2 md:flex-row md:items-center md:gap-2 md:border-t-0 md:pt-0">
              <div className="md:hidden w-full">
                {!session && (
                  <div style={{ paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
                    <a
                      href={loginUrl()}
                      className="btn btn-primary"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Sign in with Discord
                    </a>
                  </div>
                )}
              </div>
              {!session && hasVisitedBefore === false && (
                <Link
                  href="/join"
                  className="btn btn-primary hidden md:inline-flex w-full items-center justify-center text-center md:w-auto"
                >
                  Join Us
                </Link>
              )}
              <div className="hidden md:block">
                <AuthNav />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
