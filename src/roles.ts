export const XP_ROLES = [
  {
    key: "newcomer",
    name: "Newcomer",
    emoji: "🌱",
    minXp: 0,
    maxXp: 99,
    color: 0x888888,
    hoist: false,
  },
  {
    key: "builder",
    name: "Builder",
    emoji: "⚡",
    minXp: 100,
    maxXp: 499,
    color: 0x57f287,
    hoist: true,
  },
  {
    key: "veteran",
    name: "Veteran",
    emoji: "🔥",
    minXp: 500,
    maxXp: 1499,
    color: 0xf59e0b,
    hoist: true,
  },
  {
    key: "elite",
    name: "Elite",
    emoji: "💎",
    minXp: 1500,
    maxXp: Infinity,
    color: 0xccff00,
    hoist: true,
  },
] as const;

export type RoleKey = (typeof XP_ROLES)[number]["key"];

export function getRoleForXp(xp: number): (typeof XP_ROLES)[number] {
  return [...XP_ROLES].reverse().find((r) => xp >= r.minXp) ?? XP_ROLES[0];
}
