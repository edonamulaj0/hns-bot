import type { Metadata } from "next";
import "./globals.css";
import { BRAND_NAME } from "@/lib/branding";
import { Navbar } from "@/components/navbar";
import { ChallengesSubNav } from "@/components/ChallengesSubNav";
import { SplashScreen } from "@/components/SplashScreen";
import { AmbientBackground } from "@/components/AmbientBackground";
import { CookieConsent } from "@/components/CookieConsent";

export const metadata: Metadata = {
  icons: { icon: "/icon.svg" },
  title: `Home | ${BRAND_NAME}`,
  description:
    "Monthly build challenges, community projects, and developer profiles for hackers and developers worldwide.",
  openGraph: {
    title: `Home | ${BRAND_NAME}`,
    description:
      "Monthly build challenges for the global hacker and developer community.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>
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
              <span className="mono dim">Built by Cyphera</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
