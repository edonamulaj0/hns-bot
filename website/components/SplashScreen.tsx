"use client";

import { useEffect, useState, useRef } from "react";

const FULL_TEXT = "H4ck&Stack";
const CHAR_DELAY = 60;   // ms per character
const HOLD_MS   = 400;   // pause after fully typed
const FADE_MS   = 350;   // fade-out duration

interface SplashScreenProps {
  onComplete?: () => void;
  skip?: boolean; // pass true to skip on return visits
}

export default function SplashScreen({ onComplete, skip = false }: SplashScreenProps) {
  const [displayed, setDisplayed]   = useState("");
  const [visible,   setVisible]     = useState(!skip);
  const [opacity,   setOpacity]     = useState(1);
  const [showCursor, setShowCursor] = useState(true);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (skip) {
      onComplete?.();
      return;
    }

    let i = 0;

    const typeNext = () => {
      if (i < FULL_TEXT.length) {
        i++;
        setDisplayed(FULL_TEXT.slice(0, i));
        rafRef.current = setTimeout(typeNext, CHAR_DELAY);
      } else {
        // Hold, then fade
        rafRef.current = setTimeout(() => {
          setShowCursor(false);
          setOpacity(0);
          rafRef.current = setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, FADE_MS);
        }, HOLD_MS);
      }
    };

    rafRef.current = setTimeout(typeNext, 120); // tiny initial delay

    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [skip, onComplete]);

  if (!visible) return null;

  // Split for colour treatment matching the logo
  const hack  = displayed.slice(0, 4);   // "H4ck"
  const rest  = displayed.slice(4);      // "&Stack"

  return (
    <div
      aria-hidden="true"
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          9999,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        background:      "#07050f",
        opacity,
        transition:      `opacity ${FADE_MS}ms ease`,
        pointerEvents:   opacity === 0 ? "none" : "auto",
      }}
    >
      <span
        style={{
          fontFamily:     "'Courier New', Courier, monospace",
          fontSize:       "clamp(1.75rem, 5vw, 2.5rem)",
          fontWeight:     700,
          letterSpacing:  "0.04em",
          userSelect:     "none",
        }}
      >
        <span style={{ color: "#a855f7" }}>{hack}</span>
        <span style={{ color: "#a3e635" }}>{rest}</span>
        {showCursor && (
          <span
            style={{
              display:        "inline-block",
              width:          "2px",
              height:         "1.1em",
              background:     "#a3e635",
              marginLeft:     "3px",
              verticalAlign:  "middle",
              animation:      "blink 0.7s step-end infinite",
            }}
          />
        )}
      </span>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}