"use client";

import Link from "next/link";
import type { ActivityFeedItem } from "@/lib/activity-feed";
import { formatFeedTime } from "@/lib/relative-time";
import { memberDisplayName } from "@/lib/member-label";

export function ActivityFeedRow({
  item,
  compact,
}: {
  item: ActivityFeedItem;
  compact?: boolean;
}) {
  const time = formatFeedTime(item.at);

  if (item.type === "submission") {
    const tr = item.track ?? "DEVELOPER";
    const badge =
      tr === "HACKER" ? "Hacker" : tr === "DESIGNERS" ? "Designer" : "Developer";
    const thumb =
      item.attachmentUrl && tr === "DESIGNERS" ? (
        <img
          src={item.attachmentUrl}
          alt={`${item.title} submission image`}
          className="h-[72px] w-[72px] shrink-0 rounded object-cover border border-[var(--border)] bg-black/30"
        />
      ) : (
        <span className="text-lg shrink-0 w-[72px] text-center leading-none pt-0.5">🚀</span>
      );
    return (
      <div
        className={`flex flex-col items-center text-center gap-2 ${compact ? "py-3" : "py-4"} px-2 border-b border-[var(--border)] last:border-0`}
      >
        <span
          className="w-2 h-2 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)] shrink-0"
          aria-hidden
        />
        <div className="flex justify-center">{thumb}</div>
        <p className={`text-sm text-white/80 max-w-xl ${compact ? "line-clamp-3" : ""}`}>
          <span className="mono text-[0.6rem] text-[var(--accent)] block mb-1">{badge}</span>
          {memberDisplayName(item)} shipped {item.title} — {item.tier} · {item.month}
        </p>
        <span className="mono text-[0.65rem] text-white/40">{time}</span>
        <Link href={`/submissions/${item.id}`} className="btn text-[0.65rem] py-1 px-2 shrink-0">
          View →
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center text-center gap-2 ${compact ? "py-3" : "py-4"} px-2 border-b border-[var(--border)] last:border-0`}
    >
      <span
        className="w-2 h-2 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)] shrink-0"
        aria-hidden
      />
      <span className="text-lg leading-none">📝</span>
      <p className={`text-sm text-white/80 max-w-xl ${compact ? "line-clamp-3" : ""}`}>
        {memberDisplayName(item)} shared an article: {item.title}
      </p>
      <span className="mono text-[0.65rem] text-white/40">{time}</span>
      <Link href={`/articles/${item.id}`} className="btn text-[0.65rem] py-1 px-2 shrink-0">
        Read →
      </Link>
    </div>
  );
}

export function ActivityFeedList({
  items,
  compact,
  className = "",
}: {
  items: ActivityFeedItem[];
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {items.map((item) => (
        <ActivityFeedRow key={`${item.type}-${item.id}`} item={item} compact={compact} />
      ))}
    </div>
  );
}

export function SeeAllActivityLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/activity" className={`mono text-sm text-[var(--accent)] hover:underline ${className}`}>
      See all activity →
    </Link>
  );
}
