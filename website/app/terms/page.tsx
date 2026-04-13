import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | H4ck&Stack",
};

export default function TermsPage() {
  return (
    <article className="section prose prose-invert max-w-3xl mx-auto px-[clamp(1rem,4vw,2rem)]">
      <p className="label">Legal</p>
      <h1 className="text-3xl sm:text-4xl font-bold mb-8">Terms of Service</h1>
      <p className="text-white/60 text-sm mb-10">
        Last updated: April 12, 2026. H4ck&Stack (“we”, “us”) operates the website and Discord
        community at <span className="mono">h4cknstack.com</span> and related services.
      </p>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">What H4ck&Stack is</h2>
        <p className="text-white/75 leading-[1.7]">
          H4ck&Stack is a volunteer-run community for developers and security researchers. We run
          monthly build and security-focused challenges, host project submissions and voting, and
          surface member portfolios and writing on our website. The platform includes a Discord
          server, a website, and automation (including bots and APIs) hosted on Cloudflare.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Eligibility</h2>
        <p className="text-white/75 leading-[1.7]">
          You must be at least <strong className="text-white">13 years old</strong> to use the
          service. Many flows require you to be a member of our Discord server; if you leave the
          server, some features (such as submitting or voting) may be unavailable until you
          rejoin and sign in again.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Your content</h2>
        <p className="text-white/75 leading-[1.7]">
          You retain ownership of submissions, articles, and profile content you provide. By
          submitting content, you grant H4ck&Stack a <strong className="text-white">non-exclusive,
          worldwide licence</strong> to host, display, reproduce, and distribute that content on
          the website, in Discord, and in community announcements, for as long as we operate the
          service or until you delete your account (subject to reasonable backup retention).
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Acceptable use</h2>
        <p className="text-white/75 leading-[1.7]">
          Do not harass others, spam the community, plagiarize work, attempt to break or overload
          our infrastructure, or use the platform for illegal activity. We may remove content or
          restrict access for behaviour that harms members or the integrity of challenges and
          voting.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Termination</h2>
        <p className="text-white/75 leading-[1.7]">
          You may delete your account at any time via the website where that feature is available,
          or by contacting an administrator. We may suspend or terminate access for violations of
          these terms or for operational or legal reasons, with or without notice where permitted by
          law.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Limitation of liability</h2>
        <p className="text-white/75 leading-[1.7]">
          The service is provided <strong className="text-white">“as is”</strong> without
          warranties of any kind. To the fullest extent permitted by law, H4ck&Stack and its
          operators are not liable for indirect, incidental, or consequential damages, or for loss
          of data, profits, or goodwill arising from your use of the community or website.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-xl font-bold">Changes</h2>
        <p className="text-white/75 leading-[1.7]">
          We may update these terms. Continued use after changes are posted constitutes acceptance
          of the revised terms. Material changes will be announced in Discord when practical.
        </p>
      </section>

      <section className="space-y-4 mb-12">
        <h2 className="text-xl font-bold">Contact</h2>
        <p className="text-white/75 leading-[1.7]">
          Questions about these terms: reach out to a server administrator in Discord or via the
          contact method published in the server.
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
