import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { SplashScreen } from "@/components/SplashScreen";
import { AmbientBackground } from "@/components/AmbientBackground";

export const metadata: Metadata = {
  title: "H4cknStack — Global Hacker & Developer Community",
  description:
    "Monthly build challenges, community projects, and developer profiles for hackers and developers worldwide.",
  openGraph: {
    title: "H4cknStack",
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
        <main>{children}</main>
        <footer className="footer">
          <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="mono dim text-sm">
              © {new Date().getFullYear()} H4cknStack
            </span>
            <span className="mono dim text-sm">Built by Cyphera</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
