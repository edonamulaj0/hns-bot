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
        <span className="text-lg shrink-0 w-[72px] text-center leading-none">🚀</span>
      );
    return (
      <div
        className={`flex gap-3 items-center ${compact ? "py-2" : "py-3"} pl-5 border-b border-[var(--border)] last:border-0`}
      >
        <div className="-ml-[1.375rem] shrink-0 w-3 flex justify-center self-center">
          <span
            className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)]"
            aria-hidden
          />
        </div>
        {thumb}
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className={`text-sm text-white/80 ${compact ? "line-clamp-2" : ""}`}>
            <span className="mono text-[0.6rem] text-[var(--accent)] mr-1">{badge}</span>
            {memberDisplayName(item)} shipped {item.title} — {item.tier} · {item.month}
          </p>
          <span className="mono text-[0.65rem] text-white/40">{time}</span>
          <Link href={`/submissions/${item.id}`} className="btn text-[0.65rem] py-1 px-2 shrink-0">
            View →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 items-center ${compact ? "py-2" : "py-3"} pl-5 border-b border-[var(--border)] last:border-0`}
    >
      <div className="-ml-[1.375rem] shrink-0 w-3 flex justify-center self-center">
        <span
          className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] ring-4 ring-[var(--bg)]"
          aria-hidden
        />
      </div>
      <span className="text-lg shrink-0 w-6 text-center leading-none">📝</span>
      <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className={`text-sm text-white/80 flex-1 min-w-[12rem] ${compact ? "line-clamp-2" : ""}`}>
          {memberDisplayName(item)} shared an article: {item.title}
        </p>
        <span className="mono text-[0.65rem] text-white/40">{time}</span>
        <Link href={`/articles/${item.id}`} className="btn text-[0.65rem] py-1 px-2 shrink-0">
          Read →
        </Link>
      </div>
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
    <div className={`border-l-2 border-[var(--border)] ml-3 ${className}`}>
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
