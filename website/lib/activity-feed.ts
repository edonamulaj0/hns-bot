import type { Blog, PortfolioResponse, Submission } from "./api";

/** Row from GET /api/activity/submissions */
export type ActivityApiSubmission = {
  id: string;
  title: string;
  tier: string;
  month: string;
  track?: string | null;
  createdAt: string;
  user: { discordId: string; displayName?: string | null };
  attachmentUrl?: string | null;
};

/** Flatten portfolio published map into rows for the activity merger (e.g. home preview). */
export function submissionsFromPortfolio(
  portfolio: PortfolioResponse | null,
): ActivityApiSubmission[] {
  if (!portfolio?.published) return [];
  const items: ActivityApiSubmission[] = [];
  for (const subs of Object.values(portfolio.published)) {
    for (const s of subs as Submission[]) {
      items.push({
        id: s.id,
        title: s.title,
        tier: s.tier,
        month: s.month,
        track: s.track,
        createdAt: s.createdAt ?? `${s.month}-15T12:00:00.000Z`,
        user: { discordId: s.user.discordId, displayName: s.user.displayName },
        attachmentUrl: s.attachmentUrl ?? null,
      });
    }
  }
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items;
}

export type ActivityFeedItem =
  | {
      type: "submission";
      id: string;
      at: string;
      title: string;
      tier: string;
      month: string;
      track?: string;
      discordId: string;
      displayName?: string | null;
      attachmentUrl?: string | null;
    }
  | {
      type: "blog";
      id: string;
      at: string;
      title: string;
      discordId: string;
      displayName?: string | null;
      url: string;
    };

/**
 * Merge paginated activity submissions and blogs by date (`createdAt`).
 */
export function mergeActivityFeedItems(
  submissions: ActivityApiSubmission[],
  blogs: Blog[],
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [];

  for (const s of submissions) {
    items.push({
      type: "submission",
      id: s.id,
      at: s.createdAt,
      title: s.title,
      tier: s.tier,
      month: s.month,
      track: s.track ?? undefined,
      discordId: s.user.discordId,
      displayName: s.user.displayName,
      attachmentUrl: s.attachmentUrl ?? null,
    });
  }

  for (const b of blogs) {
    items.push({
      type: "blog",
      id: b.id,
      at: b.createdAt,
      title: b.title,
      discordId: b.user.discordId,
      displayName: b.user.displayName,
      url: b.url,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items;
}

export function buildActivityFeed(
  submissions: ActivityApiSubmission[],
  blogs: Blog[],
  limit: number,
): ActivityFeedItem[] {
  return mergeActivityFeedItems(submissions, blogs).slice(0, limit);
}
