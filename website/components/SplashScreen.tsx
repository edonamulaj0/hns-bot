"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { BRAND_NAME } from "@/lib/branding";
const TOTAL_DURATION = 2500; // ms

export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Only show on first visit
    const hasSeen = sessionStorage.getItem("hns-splash-seen");
    if (hasSeen) return;

    setShow(true);
    sessionStorage.setItem("hns-splash-seen", "true");

    // Start fade out after total duration
    const fadeTimer = setTimeout(() => {
      setIsLeaving(true);
    }, TOTAL_DURATION - 500);

    // Remove splash after fade completes
    const removeTimer = setTimeout(() => {
      setShow(false);
    }, TOTAL_DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!show) return null;

  // Split brand name into characters, highlighting 4, &, and S
  const characters = BRAND_NAME.split("").map((char, i) => {
    const isHighlight = char === "4" || char === "S" || char === "&";
    return { char, isHighlight, index: i };
  });

  return (
    <AnimatePresence>
      {!isLeaving && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg)]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0, y: -20 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="flex text-[clamp(3rem,8vw,6rem)] font-bold tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {characters.map(({ char, isHighlight, index }) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isHighlight ? 1 : 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.09,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={isHighlight ? "text-[var(--accent)]" : "text-[var(--text)]"}
              >
                {char}
                {/* Blinking cursor after last character */}
                {index === characters.length - 1 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.09,
                      times: [0, 0.5, 1],
                      repeat: 1,
                    }}
                    className="inline-block w-[0.3em] h-[0.9em] ml-1 bg-[var(--accent)] align-middle"
                  />
                )}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}