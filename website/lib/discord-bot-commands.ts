/** Copy for Discord slash commands shown on the site (keep in sync with bot `register.ts`). */

export type DiscordBotCommandRow = { cmd: string; desc: string };

export const DISCORD_BOT_COMMAND_ROWS: DiscordBotCommandRow[] = [
  {
    cmd: "/help",
    desc: "Shows the current Discord bot commands and what each one does.",
  },
  {
    cmd: "/profile",
    desc: "After signing in with Discord, complete your profile (bio, GitHub, LinkedIn, tech stack) for your public Members card. You can use /profile in Discord to view your profile.",
  },
  {
    cmd: "/enroll",
    desc: "Pick a monthly challenge (track + tier) before you can submit. Open during the build window (days 1–21 UTC+2).",
  },
  {
    cmd: "/pulse",
    desc: "Awards this month’s GitHub activity XP once per month and shows a month-end estimate.",
  },
  {
    cmd: "/leaderboard",
    desc: "Shows top builders by points for the current month in Discord.",
  },
  {
    cmd: "/ticket",
    desc: "Anonymous bugs and website feedback — opens a short form in Discord; maintainers get one DM from the bot (no username attached).",
  },
];
