import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { BRAND_NAME, BUILDER_SITE_URL, WIKI_URL } from "@/lib/branding";
import { Navbar } from "@/components/navbar";
import { ChallengesSubNav } from "@/components/ChallengesSubNav";
import { CookieConsent } from "@/components/CookieConsent";
import { ClientOverlays } from "@/components/ClientOverlays";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
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
    "Monthly build challenges for developers, hackers, and designers — on Discord.",
  openGraph: {
    title: `Home | ${BRAND_NAME}`,
    description:
      "Monthly build challenges for developers, hackers, and designers — on Discord.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Home | ${BRAND_NAME}`,
    description:
      "Monthly build challenges for developers, hackers, and designers — on Discord.",
    images: ["/og.png"],
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
        <ClientOverlays />
        <Navbar />
        <ChallengesSubNav />
        <main>{children}</main>
        <CookieConsent />
        <footer className="footer">
          <div className="container flex flex-col items-center gap-6 text-center text-sm md:flex-row md:items-center md:justify-between md:gap-8 md:text-left">
            <p className="mono dim m-0 shrink-0">
              © {new Date().getFullYear()} {BRAND_NAME}
            </p>
            <nav
              className="flex flex-wrap justify-center gap-x-8 gap-y-2 md:justify-center"
              aria-label="Legal and resources"
            >
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
            </nav>
            <a
              href={BUILDER_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mono shrink-0 text-white/50 hover:text-[var(--accent)] no-underline"
            >
              Built by Cyphera
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
