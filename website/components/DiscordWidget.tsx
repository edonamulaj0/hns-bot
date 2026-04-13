"use client";

import { useEffect, useState } from "react";
import type { DiscordWidgetResponse } from "@/lib/api";
import { DISCORD_INVITE_URL } from "@/lib/branding";

function statusColor(status: string): string {
  switch (status) {
    case "online":
      return "#43b581";
    case "idle":
      return "#faa61a";
    case "dnd":
      return "#f04747";
    default:
      return "var(--text-dimmer)";
  }
}

export function DiscordWidget({ className = "" }: { className?: string }) {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID?.trim() ?? "";
  const [data, setData] = useState<DiscordWidgetResponse | null>(null);
  const [loading, setLoading] = useState(!!guildId);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    if (!guildId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/discord-widget", { cache: "no-store" });
        if (!res.ok) throw new Error("widget");
        const json = (await res.json()) as DiscordWidgetResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setStatsError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guildId]);

  const inviteHref =
    (data?.instant_invite && data.instant_invite.startsWith("http")
      ? data.instant_invite
      : null) || DISCORD_INVITE_URL;
  const serverName = data?.name ?? "H4ck&Stack";
  const totalMembers = data?.approximate_member_count;
  const online = data?.presence_count;
  const channels = [...(data?.channels ?? [])].sort((a, b) => a.position - b.position);
  const visibleChannels = channels.slice(0, 8);
  const members = [...(data?.members ?? [])].slice(0, 16);

  if (!guildId) {
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
          href={DISCORD_INVITE_URL}
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
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="pulse-dot shrink-0" style={{ background: "var(--accent)" }} />
            <div className="min-w-0">
              <h3 className="font-bold text-lg truncate">{serverName}</h3>
              <p className="mono text-[0.65rem] text-white/45 truncate">Live server · Discord</p>
            </div>
          </div>
          <a
            href={inviteHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary text-xs py-1.5 px-3 shrink-0"
          >
            Join →
          </a>
        </div>

        {loading ? (
          <p className="mono text-xs text-white/45">Loading live stats…</p>
        ) : statsError ? (
          <p className="mono text-xs text-white/50 leading-relaxed mb-2">
            Live counts need the server widget enabled (Discord → Server Settings → Integrations → Server
            Widget). The embed below still works when you are logged into Discord in this browser.
          </p>
        ) : data ? (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              {typeof totalMembers === "number" && (
                <div className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                  <p className="mono text-[0.6rem] text-white/45 uppercase tracking-wider mb-0.5">
                    Members
                  </p>
                  <p className="text-lg font-bold tabular-nums text-[var(--accent)]">
                    {totalMembers.toLocaleString()}
                  </p>
                </div>
              )}
              {typeof online === "number" && (
                <div className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                  <p className="mono text-[0.6rem] text-white/45 uppercase tracking-wider mb-0.5">
                    Online now
                  </p>
                  <p className="text-lg font-bold tabular-nums text-white/90">{online.toLocaleString()}</p>
                </div>
              )}
            </div>

            {visibleChannels.length > 0 && (
              <div className="mb-4">
                <p className="mono text-[0.6rem] text-white/45 uppercase tracking-wider mb-2">
                  Public channels
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {visibleChannels.map((ch) => (
                    <li
                      key={ch.id}
                      className="rounded border border-[var(--border-bright)] px-2 py-1 mono text-[0.65rem] text-white/70"
                    >
                      #{ch.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {members.length > 0 && (
              <div>
                <p className="mono text-[0.6rem] text-white/45 uppercase tracking-wider mb-2">
                  Online in widget
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto scrollbar-none">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5"
                    >
                      <span
                        className="shrink-0 rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: statusColor(m.status),
                        }}
                        aria-hidden
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt=""
                          width={22}
                          height={22}
                          className="rounded-full shrink-0"
                        />
                      ) : null}
                      <span className="mono text-[0.7rem] truncate text-white/80">
                        {m.nick || m.username}
                      </span>
                      {m.game?.name && (
                        <span className="mono text-[0.6rem] text-white/35 truncate ml-auto max-w-[40%]">
                          {m.game.name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </div>
      <iframe
        title="Discord server widget"
        src={`https://discord.com/widget?id=${encodeURIComponent(guildId)}&theme=dark`}
        width={350}
        height={500}
        allowTransparency
        frameBorder={0}
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        className="mx-auto block max-w-full border-0 bg-[var(--bg)]"
        style={{ width: "100%", maxWidth: 350, height: 500 }}
        loading="lazy"
      />
    </div>
  );
}
