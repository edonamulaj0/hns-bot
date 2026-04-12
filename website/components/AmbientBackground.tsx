"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function AmbientBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  
  // Parallax effect for orbs (0.15x scroll speed)
  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden"
    >
      {/* Dot grid pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]">
        <defs>
          <pattern
            id="dot-grid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="12" cy="12" r="1" fill="rgba(255,255,255,1)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>
      
      {/* Orb 1 - drifts left-to-right */}
      <motion.div
        className="absolute top-[10%] left-[10%] w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,47,235,0.06) 0%, transparent 70%)",
        }}
        animate={{
          x: ["-8vw", "8vw", "-8vw"],
          y: ["-6vh", "6vh", "-6vh"],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "linear",
        }}
      />
      
      {/* Orb 2 - drifts right-to-left */}
      <motion.div
        className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(124,47,235,0.06) 0%, transparent 70%)",
          y: y2,
        }}
        animate={{
          x: ["8vw", "-8vw", "8vw"],
          y: ["6vh", "-6vh", "6vh"],
        }}
        transition={{
          duration: 60,
          repeat: Infinity,
          repeatType: "mirror",
          ease: "linear",
        }}
      />
      
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}