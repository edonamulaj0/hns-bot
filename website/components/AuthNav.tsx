"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  getSessionClient,
  loginUrl,
  type SessionUser,
} from "@/lib/auth-client";
import { userProfileAvatarUrl } from "@/lib/api";

function avatarUrl(u: SessionUser): string {
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

const AVATAR_BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMWExYTFhIi8+PC9zdmc+";

export function AuthNav() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  const label = user.displayName?.trim() || "Account";

  return (
    <div className="relative z-[10060] mt-2 md:mt-0 md:ml-2" ref={wrapRef}>
      <button
        type="button"
        className="flex items-center gap-2 rounded border border-[var(--border-bright)] bg-[var(--bg-card)] px-2 py-1.5 text-left text-sm"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Image
          src={avatarUrl(user)}
          alt={`${label} avatar`}
          width={28}
          height={28}
          quality={80}
          placeholder="blur"
          blurDataURL={AVATAR_BLUR_DATA_URL}
          className="rounded-full"
        />
        <span className="max-w-[8rem] truncate font-medium">{label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-[10070] mt-1 min-w-[11rem] rounded border border-[var(--border)] bg-[var(--bg)] py-1 shadow-lg">
          <Link
            href="/profile"
            className="block px-3 py-2 text-sm no-underline hover:bg-[var(--bg-raised)]"
            onClick={() => setOpen(false)}
          >
            My Profile
          </Link>
          <Link
            href="/settings"
            className="block px-3 py-2 text-sm no-underline hover:bg-[var(--bg-raised)]"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="w-full px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--bg-raised)]"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
