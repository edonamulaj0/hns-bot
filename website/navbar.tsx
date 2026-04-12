"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/members", label: "Members" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav>
      <div className="container">
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "1rem",
            color: "var(--text)",
            letterSpacing: "-0.02em",
          }}>
            <span style={{ color: "var(--accent)" }}>H&amp;S</span>
            {" "}
            <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Hack&amp;Stack</span>
          </span>
        </Link>

        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          {NAV_LINKS.map((link) => {
            const active = link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "2px",
                  textDecoration: "none",
                  color: active ? "var(--accent)" : "var(--text-dim)",
                  background: active ? "rgba(249,115,22,0.08)" : "transparent",
                  border: active ? "1px solid rgba(249,115,22,0.2)" : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://discord.gg/YOUR_INVITE"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ marginLeft: "0.5rem" }}
          >
            Join Discord
          </a>
        </div>
      </div>
    </nav>
  );
}
