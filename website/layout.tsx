import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Hack & Stack — Kosovo Dev Community",
  description: "Monthly build challenges, community projects, and developer profiles for the Kosovo & Albanian tech scene.",
  openGraph: {
    title: "Hack & Stack",
    description: "Monthly build challenges for the Kosovo & Albanian tech community.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Navbar />
        <main>{children}</main>
        <footer className="footer">
          <div className="container">
            <span className="mono dim">© {new Date().getFullYear()} Hack & Stack</span>
            <span className="mono dim">Built in Kosovo 🦅</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
