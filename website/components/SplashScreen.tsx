"use client";

import { useEffect, useState } from "react";

const TOTAL_MS = 2800;
const EXIT_MS = 450;
const EXIT_AT = TOTAL_MS - EXIT_MS;
const REDUCED_TOTAL_MS = 550;

const FLOAT_SPECKS = [
  { left: "8%", top: "18%", delay: "0s", size: 3 },
  { left: "22%", top: "72%", delay: "0.4s", size: 2 },
  { left: "78%", top: "14%", delay: "0.2s", size: 2 },
  { left: "88%", top: "58%", delay: "0.7s", size: 3 },
  { left: "14%", top: "44%", delay: "0.5s", size: 2 },
  { left: "62%", top: "82%", delay: "0.1s", size: 2 },
  { left: "48%", top: "26%", delay: "0.9s", size: 3 },
  { left: "92%", top: "36%", delay: "0.3s", size: 2 },
];

export function SplashScreen() {
  const [phase, setPhase] = useState<"in" | "exit" | "done">("in");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motionReduced = mq.matches;
    setReducedMotion(motionReduced);

    if (motionReduced) {
      const done = window.setTimeout(() => setPhase("done"), REDUCED_TOTAL_MS);
      return () => clearTimeout(done);
    }

    const exitTimer = window.setTimeout(() => setPhase("exit"), EXIT_AT);
    const doneTimer = window.setTimeout(() => setPhase("done"), TOTAL_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  const exiting = phase === "exit";

  return (
    <>
      <style>{`
        @keyframes splash-bloom-a {
          0%, 100% { transform: translate(-12%, -8%) scale(1); opacity: 0.55; }
          50% { transform: translate(6%, 10%) scale(1.12); opacity: 0.85; }
        }
        @keyframes splash-bloom-b {
          0%, 100% { transform: translate(8%, 12%) scale(1.05); opacity: 0.4; }
          45% { transform: translate(-14%, -6%) scale(1.18); opacity: 0.75; }
        }
        @keyframes splash-grid-shift {
          0% { transform: perspective(420px) rotateX(58deg) translateZ(0) translateY(0); }
          100% { transform: perspective(420px) rotateX(58deg) translateZ(0) translateY(28px); }
        }
        @keyframes splash-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes splash-orbit-rev {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes splash-logo-rise {
          from {
            opacity: 0;
            transform: translateY(22px) scale(0.94);
            filter: blur(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
        @keyframes splash-tag-fade {
          from { opacity: 0; letter-spacing: 0.35em; }
          to { opacity: 0.72; letter-spacing: 0.12em; }
        }
        @keyframes splash-speck {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.35); }
        }
        @keyframes splash-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes splash-exit-root {
          to {
            opacity: 0;
            transform: translateY(-16px) scale(1.02);
            filter: blur(12px);
          }
        }
        @keyframes splash-ring-draw {
          from { stroke-dashoffset: 420; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>

      <div
        role="status"
        aria-live="polite"
        aria-label="H4ck and Stack loading"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050508",
          overflow: "hidden",
          animation: exiting && !reducedMotion ? `splash-exit-root ${EXIT_MS}ms cubic-bezier(0.45, 0, 0.55, 1) forwards` : undefined,
          pointerEvents: "none",
        }}
      >
        {!reducedMotion && (
          <>
            <div
              aria-hidden
              style={{
                position: "absolute",
                width: "140vmin",
                height: "140vmin",
                left: "-35vmin",
                top: "-40vmin",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 40% 45%, rgba(168, 85, 247, 0.35), transparent 55%)",
                filter: "blur(40px)",
                animation: "splash-bloom-a 4.5s ease-in-out infinite",
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                width: "120vmin",
                height: "120vmin",
                right: "-30vmin",
                bottom: "-35vmin",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 55% 50%, rgba(204, 255, 0, 0.22), transparent 52%)",
                filter: "blur(48px)",
                animation: "splash-bloom-b 5s ease-in-out infinite",
              }}
            />

            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: "-40% -20%",
                opacity: 0.07,
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)
                `,
                backgroundSize: "48px 48px",
                transformOrigin: "50% 0%",
                animation: "splash-grid-shift 10s linear infinite",
                maskImage: "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
              }}
            />

            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)",
                opacity: 0.35,
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                opacity: 0.06,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  height: "28%",
                  background:
                    "linear-gradient(to bottom, transparent, rgba(204,255,0,0.15), transparent)",
                  animation: "splash-scan 2.8s ease-in-out infinite",
                }}
              />
            </div>

            {FLOAT_SPECKS.map((s, i) => (
              <span
                key={i}
                aria-hidden
                style={{
                  position: "absolute",
                  left: s.left,
                  top: s.top,
                  width: s.size,
                  height: s.size,
                  borderRadius: "50%",
                  background: i % 2 === 0 ? "#c4b5fd" : "#d9ff66",
                  boxShadow: `0 0 ${s.size * 3}px currentColor`,
                  color: i % 2 === 0 ? "#a78bfa" : "#ccff00",
                  animation: `splash-speck ${2.2 + (i % 3) * 0.4}s ease-in-out infinite`,
                  animationDelay: s.delay,
                }}
              />
            ))}
          </>
        )}

        <svg
          aria-hidden
          style={{
            position: "absolute",
            width: "min(92vmin, 680px)",
            height: "min(92vmin, 680px)",
            opacity: reducedMotion ? 0.12 : 0.35,
          }}
          viewBox="0 0 400 400"
        >
          <defs>
            <linearGradient id="splash-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#ccff00" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <g style={{ transformOrigin: "200px 200px", animation: "splash-orbit 14s linear infinite" }}>
            <circle
              cx="200"
              cy="200"
              r="178"
              fill="none"
              stroke="url(#splash-ring-grad)"
              strokeWidth="1"
              strokeDasharray="90 120"
              opacity={0.55}
              style={{
                strokeDashoffset: reducedMotion ? 0 : undefined,
                animation: reducedMotion ? undefined : "splash-ring-draw 1.4s ease-out forwards",
              }}
            />
          </g>
          <g style={{ transformOrigin: "200px 200px", animation: "splash-orbit-rev 22s linear infinite" }}>
            <circle
              cx="200"
              cy="200"
              r="142"
              fill="none"
              stroke="#ccff00"
              strokeWidth="0.5"
              strokeDasharray="28 56"
              opacity={0.28}
            />
          </g>
          <g style={{ transformOrigin: "200px 200px", animation: "splash-orbit 28s linear infinite" }}>
            <circle
              cx="200"
              cy="200"
              r="108"
              fill="none"
              stroke="#a78bfa"
              strokeWidth="0.5"
              strokeDasharray="18 42"
              opacity={0.22}
            />
          </g>
        </svg>

        <div
          style={{
            position: "relative",
            zIndex: 10,
            textAlign: "center",
            padding: "0 1.25rem",
            maxWidth: "min(96vw, 640px)",
          }}
        >
          <div
            style={{
              fontFamily:
                "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "clamp(2.25rem, 9vw, 4.75rem)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.055em",
              userSelect: "none",
              animation: reducedMotion
                ? undefined
                : "splash-logo-rise 900ms cubic-bezier(0.22, 1, 0.36, 1) 180ms both",
              textShadow:
                "-2px 0 rgba(167, 139, 250, 0.45), 2px 0 rgba(204, 255, 0, 0.28), 0 0 60px rgba(0,0,0,0.9)",
            }}
          >
            <span style={{ color: "#d4c4ff" }}>H4ck</span>
            <span style={{ color: "#ccff00", padding: "0 0.02em" }}>&</span>
            <span style={{ color: "#e8ff99" }}>Stack</span>
          </div>

          <p
            style={{
              marginTop: "1.35rem",
              fontFamily:
                "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "clamp(0.65rem, 2vw, 0.8rem)",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.38)",
              animation: reducedMotion
                ? undefined
                : "splash-tag-fade 900ms ease 520ms forwards",
              opacity: reducedMotion ? 0.65 : 0,
            }}
          >
            developers · hackers · designers
          </p>

          {!reducedMotion && (
            <div
              aria-hidden
              style={{
                marginTop: "2rem",
                display: "flex",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 2,
                    background: i === 1 ? "#ccff00" : "#6b21a8",
                    opacity: 0.85,
                    boxShadow:
                      i === 1
                        ? "0 0 14px rgba(204,255,0,0.55)"
                        : "0 0 10px rgba(107,33,168,0.45)",
                    animation: `splash-speck ${1.4}s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
