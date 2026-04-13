import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | H4ck&Stack",
};

export default function PrivacyPage() {
  return (
    <article className="section prose prose-invert max-w-3xl mx-auto px-[clamp(1rem,4vw,2rem)]">
      <p className="label">Legal</p>
      <h1 className="text-3xl sm:text-4xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-white/60 text-sm mb-10">
        Last updated: April 12, 2026. This policy describes how H4ck&Stack collects and uses data
        when you use our website, Discord OAuth sign-in, and related services.
      </p>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Data we collect</h2>
        <p className="text-white/75 leading-[1.7]">
          When you sign in with Discord we store your Discord user id, username (for account
          linking only), avatar hash, and the display name from Discord for your first visit. Your
          public name on the website is what you set in Settings or Profile (first name and optional
          last name), or your Discord login name by default; we do not show @handles on the site. If you complete a profile, we also store
          bio, GitHub and LinkedIn URLs, tech stack, and related metadata. Submissions may include
          titles, descriptions, repository and demo URLs, attachments, and voting records linked
          to your Discord id.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Data we do not collect</h2>
        <p className="text-white/75 leading-[1.7]">
          We do <strong className="text-white">not</strong> ask for passwords (Discord handles
          authentication). We do not collect payment card data. We do not require an email address
          for core community participation.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Why we use data</h2>
        <p className="text-white/75 leading-[1.7]">
          Data is used to operate challenges, profiles, leaderboards, voting, and website features;
          to verify you are a member of our Discord server; to prevent abuse; and to improve the
          service.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Discord OAuth</h2>
        <p className="text-white/75 leading-[1.7]">
          We request the <span className="mono">identify</span> and{" "}
          <span className="mono">guilds.members.read</span> scopes so we can confirm membership in
          our server. Your Discord access token may be stored <strong className="text-white">
            encrypted
          </strong>{" "}
          for a limited time so we can re-check membership on sensitive actions. If the token has
          expired, we skip that check until you sign in again.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Third parties</h2>
        <p className="text-white/75 leading-[1.7]">
          <strong className="text-white">Cloudflare</strong> hosts Workers, D1, Pages, and related
          infrastructure. <strong className="text-white">GitHub</strong> may be contacted when you
          use features that read public activity. <strong className="text-white">Anthropic</strong>{" "}
          (Claude API) may process challenge metadata (e.g. recent challenge titles) for automated
          challenge generation — not your private messages or unrelated personal data.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Cookies</h2>
        <p className="text-white/75 leading-[1.7]">
          We set a single session cookie (<span className="mono">hns_session</span>) that is{" "}
          <strong className="text-white">HttpOnly</strong>, <strong className="text-white">
            Secure
          </strong>{" "}
          on HTTPS, <strong className="text-white">SameSite=Lax</strong>, with roughly a{" "}
          <strong className="text-white">7-day</strong> lifetime. It keeps you signed in on the
          website.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Your rights</h2>
        <p className="text-white/75 leading-[1.7]">
          You may delete your account and associated data through the website where available, or by
          contacting an administrator. Deletion removes your profile, submissions, votes, and
          other linked records subject to technical and legal retention limits.
        </p>
      </section>

      <section className="space-y-4 mb-12">
        <h2 className="text-xl font-bold">Changes</h2>
        <p className="text-white/75 leading-[1.7]">
          We may update this policy. The “Last updated” date will change when we do. Continued use
          after updates means you accept the revised policy.
        </p>
      </section>

      <p className="text-sm text-white/45">
        <Link href="/" className="text-[var(--accent)] no-underline hover:underline">
          ← Home
        </Link>
      </p>
    </article>
  );
}
