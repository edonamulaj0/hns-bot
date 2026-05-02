"use client";

import { useEffect, useState } from "react";

const FULL_TEXT = "H4cknStack";
const PURPLE_CHARS = 4; // "H4ck"
const TYPING_MS = 1300;
const TOTAL_MS = 2000;
const EXIT_DELAY = TOTAL_MS - 350;

export function SplashScreen() {
  const [visibleChars, setVisibleChars] = useState(0);
  const [phase, setPhase] = useState<"typing" | "exit" | "done">("typing");

  useEffect(() => {
    const charDelay = TYPING_MS / FULL_TEXT.length;

    const typingTimer = window.setInterval(() => {
      setVisibleChars((n) => {
        if (n >= FULL_TEXT.length) {
          clearInterval(typingTimer);
          return n;
        }
        return n + 1;
      });
    }, charDelay);

    const exitTimer = window.setTimeout(() => setPhase("exit"), EXIT_DELAY);
    const doneTimer = window.setTimeout(() => setPhase("done"), TOTAL_MS);

    return () => {
      clearInterval(typingTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  const typed = FULL_TEXT.slice(0, visibleChars);
  const purplePart = typed.slice(0, PURPLE_CHARS);
  const limePart = typed.slice(PURPLE_CHARS);
  const cursorIsLime = visibleChars >= PURPLE_CHARS;
  const showCursor = phase === "typing";

  return (
    <>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes splashExit {
          to { opacity: 0; transform: scale(0.96); }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg, #09090b)",
          overflow: "hidden",
          animation: phase === "exit" ? "splashExit 0.35s cubic-bezier(0.4,0,1,1) forwards" : undefined,
        }}
      >
        <div
          aria-label={FULL_TEXT}
          style={{
            position: "relative",
            zIndex: 10,
            fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: "clamp(3.5rem, 14vw, 8rem)",
            fontWeight: 700,
            letterSpacing: "-0.06em",
            lineHeight: 1,
            userSelect: "none",
            filter: "drop-shadow(0 0 40px rgba(163,230,53,0.15))",
          }}
        >
          <span style={{
            color: "#a78bfa",
            textShadow: "0 0 20px rgba(167,139,250,0.5), 0 0 60px rgba(167,139,250,0.2)",
          }}>
            {purplePart}
          </span>
          <span style={{
            color: "#a3e635",
            textShadow: "0 0 20px rgba(163,230,53,0.5), 0 0 60px rgba(163,230,53,0.2)",
          }}>
            {limePart}
          </span>
          {showCursor && (
            <span style={{
              display: "inline-block",
              width: "0.11em",
              height: "0.85em",
              marginLeft: "0.06em",
              verticalAlign: "-0.05em",
              background: cursorIsLime ? "#a3e635" : "#a78bfa",
              boxShadow: cursorIsLime
                ? "0 0 12px rgba(163,230,53,0.8)"
                : "0 0 12px rgba(167,139,250,0.8)",
              animation: "blink 0.6s step-end infinite",
            }} />
          )}
        </div>
      </div>
    </>
  );
}