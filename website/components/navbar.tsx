"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthNav } from "@/components/AuthNav";
import { getSessionClient, loginUrl, type SessionUser } from "@/lib/auth-client";
import { BRAND_LOGO_PNG, BRAND_LOGO_SVG, BRAND_NAME } from "@/lib/branding";
import { utcMonthKey } from "@/lib/month";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  const voteMonth = utcMonthKey();

  useEffect(() => {
    getSessionClient().then(setSession);
  }, []);

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
            </div>
            <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 md:ml-2 md:flex-row md:items-center md:gap-2 md:border-t-0 md:pt-0">
              <div className="md:hidden w-full">
                {session ? (
                  <div
                    style={{
                      paddingTop: "1.5rem",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div
                      onClick={() => {
                        router.push("/profile");
                        setOpen(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.75rem 1rem",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "2px",
                        cursor: "pointer",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            session.avatarHash
                              ? `https://cdn.discordapp.com/avatars/${session.discordId}/${session.avatarHash}.png?size=64`
                              : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(session.discordId) % BigInt(6))}.png`
                          }
                          alt=""
                          style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)" }}
                        />
                        <div>
                          <p
                            style={{
                              fontWeight: 700,
                              fontSize: "0.875rem",
                              margin: 0,
                              color: "var(--text)",
                            }}
                          >
                            {session.displayName ?? session.discordUsername}
                          </p>
                          <p
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-dim)",
                              fontFamily: "var(--font-mono)",
                              margin: 0,
                            }}
                          >
                            @{session.discordUsername}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push("/settings");
                          setOpen(false);
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "2px",
                          padding: "0.375rem",
                          cursor: "pointer",
                          color: "var(--text-dim)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        aria-label="Settings"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                        </svg>
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Link
                        href="/submit"
                        onClick={() => setOpen(false)}
                        className="btn"
                        style={{ flex: 1, justifyContent: "center", fontSize: "0.8rem" }}
                      >
                        My Submission
                      </Link>
                      <Link
                        href={`/vote/${voteMonth}`}
                        onClick={() => setOpen(false)}
                        className="btn"
                        style={{ flex: 1, justifyContent: "center", fontSize: "0.8rem" }}
                      >
                        Vote
                      </Link>
                    </div>
                  </div>
                ) : (
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
              <Link
                href="/join"
                className="btn btn-primary hidden md:flex w-full items-center justify-center text-center md:w-auto"
              >
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
