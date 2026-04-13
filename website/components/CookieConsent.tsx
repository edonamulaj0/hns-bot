"use client";

import { useEffect, useState } from "react";

const CONSENT_STORAGE_KEY = "hns_cookie_consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

type ConsentChoice = "accepted" | "rejected";

function persistConsent(choice: ConsentChoice) {
  localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  document.cookie = `hns_cookie_consent=${choice}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-[var(--border)] bg-[rgba(5,5,5,0.96)] p-4 backdrop-blur-md">
      <div className="container flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[var(--text-dim)]">
          We use cookies for authentication and basic analytics. You can accept or reject non-essential cookies.
        </p>
        <div className="flex w-full gap-2 md:w-auto">
          <button
            type="button"
            className="btn w-full justify-center md:w-auto"
            onClick={() => {
              persistConsent("rejected");
              setVisible(false);
            }}
          >
            Reject
          </button>
          <button
            type="button"
            className="btn btn-primary w-full justify-center md:w-auto"
            onClick={() => {
              persistConsent("accepted");
              setVisible(false);
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
