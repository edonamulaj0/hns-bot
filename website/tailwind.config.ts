import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        volt: "#7c2feb",
        charcoal: "#222222",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        default: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      minHeight: {
        hero: "min(88dvh, 900px)",
        "hero-sm": "min(64dvh, 720px)",
        section: "min(48dvh, 560px)",
      },
    },
  },
  plugins: [],
};

export default config;
