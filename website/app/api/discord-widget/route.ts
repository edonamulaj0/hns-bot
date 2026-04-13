import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const guildId =
    process.env.NEXT_PUBLIC_DISCORD_GUILD_ID?.trim() ||
    process.env.DISCORD_GUILD_ID?.trim() ||
    "";

  if (!guildId) {
    return NextResponse.json({ error: "missing_guild_id" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://discord.com/api/guilds/${encodeURIComponent(guildId)}/widget.json`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "widget_unavailable", status: res.status },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ error: "widget_fetch_failed" }, { status: 502 });
  }
}
