import {
  getPortfolio,
  getMembers,
  getBlogs,
  getLeaderboard,
  formatTechStack,
} from "@/lib/api";

export type AboutStatsPayload = {
  totalXp: number;
  totalProjects: number;
  totalBlogs: number;
  topStacks: { name: string; count: number }[];
  monthly: { month: string; count: number }[];
  topUser: {
    discordId: string;
    points: number;
    github: string | null;
  } | null;
};

export async function getAboutStats(): Promise<AboutStatsPayload> {
  try {
    const [portfolio, membersRes, blogsRes, lbRes] = await Promise.all([
      getPortfolio(),
      getMembers(),
      getBlogs(),
      getLeaderboard(),
    ]);

    const members = membersRes.members;
    const totalXp = members.reduce((s, m) => s + m.points, 0);
    const totalBlogs = blogsRes.blogs.length;

    let totalProjects = 0;
    const monthCount = new Map<string, number>();
    for (const [monthKey, subs] of Object.entries(portfolio.published ?? {})) {
      const n = Array.isArray(subs) ? subs.length : 0;
      totalProjects += n;
      monthCount.set(monthKey, (monthCount.get(monthKey) ?? 0) + n);
    }

    const stackMap = new Map<string, number>();
    for (const m of members) {
      for (const t of formatTechStack(m.techStack)) {
        const k = t.trim();
        if (!k) continue;
        stackMap.set(k, (stackMap.get(k) ?? 0) + 1);
      }
    }
    const topStacks = [...stackMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const monthly = [...monthCount.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    const top = lbRes.leaderboard[0];
    const topUser = top
      ? { discordId: top.discordId, points: top.points, github: top.github }
      : null;

    return {
      totalXp,
      totalProjects,
      totalBlogs,
      topStacks,
      monthly,
      topUser,
    };
  } catch {
    return {
      totalXp: 0,
      totalProjects: 0,
      totalBlogs: 0,
      topStacks: [],
      monthly: [],
      topUser: null,
    };
  }
}
