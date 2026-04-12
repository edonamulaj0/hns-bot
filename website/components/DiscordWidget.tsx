"use client";

import { useState } from "react";

const DISCORD_INVITE = "https://discord.gg/hackandstack";

export function DiscordWidget({ className = "" }: { className?: string }) {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID?.trim() ?? "";
  const [failed, setFailed] = useState(false);

  if (!guildId || failed) {
    return (
      <div
        className={`rounded border border-[var(--border)] bg-[var(--bg-card)] p-6 ${className}`}
        style={{ borderRadius: "4px" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="pulse-dot shrink-0" style={{ background: "var(--accent)" }} />
          <h3 className="font-bold text-lg">Live on Discord</h3>
        </div>
        <p className="text-sm text-white/60 mb-4">
          Join the server for challenges, voice, and project feedback.
        </p>
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary inline-flex"
        >
          Join us on Discord
        </a>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-card)] ${className}`}
      style={{ borderRadius: "4px" }}
    >
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="pulse-dot shrink-0" style={{ background: "var(--accent)" }} />
          <h3 className="font-bold text-lg">Live on Discord</h3>
        </div>
        <p className="mono text-xs text-white/50">
          Online and member counts update inside the widget when Discord serves them.
        </p>
      </div>
      <iframe
        title="Discord server widget"
        src={`https://discord.com/widget?id=${encodeURIComponent(guildId)}&theme=dark`}
        width="100%"
        height={320}
        className="w-full border-0 bg-[var(--bg)] min-h-[280px]"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
