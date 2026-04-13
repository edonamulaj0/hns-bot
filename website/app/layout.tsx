import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { BRAND_NAME, BUILDER_SITE_URL, WIKI_URL } from "@/lib/branding";
import { Navbar } from "@/components/navbar";
import { ChallengesSubNav } from "@/components/ChallengesSubNav";
import { SplashScreen } from "@/components/SplashScreen";
import { AmbientBackground } from "@/components/AmbientBackground";
import { CookieConsent } from "@/components/CookieConsent";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const metadataBaseUrl =
  process.env.NEXT_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ||
  "https://h4cknstack.com";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  icons: { icon: "/icon.svg" },
  title: `Home | ${BRAND_NAME}`,
  description:
    "Monthly build challenges, community projects, and developer profiles for hackers and developers worldwide.",
  openGraph: {
    title: `Home | ${BRAND_NAME}`,
    description:
      "Monthly build challenges for the global hacker and developer community.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <SplashScreen />
        <AmbientBackground />
        <Navbar />
        <ChallengesSubNav />
        <main>{children}</main>
        <CookieConsent />
        <footer className="footer">
          <div className="container flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <span className="mono dim text-sm">
              © {new Date().getFullYear()} {BRAND_NAME}
            </span>
            <div className="flex flex-wrap gap-4 text-sm">
              <a href="/terms" className="text-white/50 hover:text-[var(--accent)] no-underline">
                Terms
              </a>
              <a href="/privacy" className="text-white/50 hover:text-[var(--accent)] no-underline">
                Privacy
              </a>
              <a
                href={WIKI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/50 hover:text-[var(--accent)] no-underline"
              >
                Wiki
              </a>
              <a
                href={BUILDER_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mono dim text-white/50 hover:text-[var(--accent)] no-underline"
              >
                Built by Cyphera
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
