import type { Blog, PortfolioResponse, Submission } from "./api";

export type ActivityFeedItem =
  | {
      type: "submission";
      id: string;
      at: string;
      title: string;
      tier: string;
      month: string;
      discordId: string;
    }
  | {
      type: "blog";
      id: string;
      at: string;
      title: string;
      discordId: string;
      url: string;
    };

/**
 * Merge approved submissions and blogs by date. Uses `createdAt` when present.
 * TODO: add XP milestone events when /api/activity exists.
 */
export function mergeActivityFeedItems(
  portfolio: PortfolioResponse | null,
  blogs: Blog[],
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [];
  const published = portfolio?.published ?? {};

  for (const subs of Object.values(published)) {
    for (const s of subs as Submission[]) {
      const at =
        s.createdAt ??
        `${s.month}-15T12:00:00.000Z`;
      items.push({
        type: "submission",
        id: s.id,
        at,
        title: s.title,
        tier: s.tier,
        month: s.month,
        discordId: s.user.discordId,
      });
    }
  }

  for (const b of blogs) {
    items.push({
      type: "blog",
      id: b.id,
      at: b.createdAt,
      title: b.title,
      discordId: b.user.discordId,
      url: b.url,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items;
}

export function buildActivityFeed(
  portfolio: PortfolioResponse | null,
  blogs: Blog[],
  limit: number,
): ActivityFeedItem[] {
  return mergeActivityFeedItems(portfolio, blogs).slice(0, limit);
}
