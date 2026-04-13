"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSessionClient,
  loginUrl,
  type SessionUser,
} from "@/lib/auth-client";
import { utcMonthKey } from "@/lib/month";

function avatarUrl(u: SessionUser): string {
  if (u.avatarHash) {
    return `https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatarHash}.png?size=64`;
  }
  const idx = Number((BigInt(u.discordId) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

export function AuthNav() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const voteMonth = useMemo(() => utcMonthKey(), []);

  useEffect(() => {
    getSessionClient().then(setUser);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  if (user === undefined) {
    return (
      <span className="mono text-xs text-white/40 px-2" aria-hidden>
        …
      </span>
    );
  }

  if (!user) {
    return (
      <a
        href={loginUrl()}
        className="btn btn-primary text-xs sm:text-sm py-1.5 px-3 whitespace-nowrap"
      >
        Sign in
      </a>
    );
  }

  const label = user.displayName || user.discordUsername;

  return (
    <div className="relative mt-2 md:mt-0 md:ml-2" ref={wrapRef}>
      <button
        type="button"
        className="flex items-center gap-2 rounded border border-[var(--border-bright)] bg-[var(--bg-card)] px-2 py-1.5 text-left text-sm"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(user)}
          alt=""
          width={28}
          height={28}
          className="rounded-full"
        />
        <span className="max-w-[8rem] truncate font-medium">{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[120] mt-1 min-w-[11rem] rounded border border-[var(--border)] bg-[var(--bg)] py-1 shadow-lg">
          <Link
            href="/profile"
            className="block px-3 py-2 text-sm no-underline hover:bg-[var(--bg-raised)]"
            onClick={() => setOpen(false)}
          >
            My Profile
          </Link>
          <Link
            href="/submit"
            className="block px-3 py-2 text-sm no-underline hover:bg-[var(--bg-raised)]"
            onClick={() => setOpen(false)}
          >
            My Submission
          </Link>
          <Link
            href={`/vote/${voteMonth}`}
            className="block px-3 py-2 text-sm no-underline hover:bg-[var(--bg-raised)]"
            onClick={() => setOpen(false)}
          >
            Vote this month
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="w-full px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--bg-raised)]"
            >
              Sign out
            </button>
          </form>
          <Link
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.8rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-dim)",
              textDecoration: "none",
              borderTop: "1px solid var(--border)",
              marginTop: "0.25rem",
            }}
            onClick={() => setOpen(false)}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}
