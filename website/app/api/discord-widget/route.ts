import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Proxies Discord's public widget JSON so the client can read live member/channel data
 * (browser requests to discord.com are blocked by CORS).
 */
export async function GET() {
  const guildId = process.env.NEXT_PUBLIC_DISCORD_GUILD_ID?.trim();
  if (!guildId) {
    return NextResponse.json({ error: "no_guild" }, { status: 404 });
  }

  const url = `https://discord.com/api/guilds/${encodeURIComponent(guildId)}/widget.json`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "widget_unavailable", status: res.status },
        { status: res.status === 403 || res.status === 404 ? 502 : res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
