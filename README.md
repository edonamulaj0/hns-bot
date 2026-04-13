## Bot Permissions

The Discord bot requires these permissions:

- `MANAGE_ROLES` (create + assign XP roles)
- `SEND_MESSAGES`
- `EMBED_LINKS`
- `CREATE_PUBLIC_THREADS`
- `SEND_MESSAGES_IN_THREADS`
- `READ_MESSAGE_HISTORY`
- `ADD_REACTIONS`

### Role hierarchy requirement

The bot role must be above the XP roles it manages:

- `🌱 Newcomer`
- `⚡ Builder`
- `🔥 Veteran`
- `💎 Elite`

After initial setup, server owners should drag the bot role above these XP roles in Discord Server Settings → Roles.
Discord does not allow bots to manage roles higher than their own role.

### Environment

Set `DISCORD_GUILD_ID` in Worker vars and keep it aligned with the auth worker value.

## Deployment

The website requires `NEXT_PUBLIC_API_URL` set in Cloudflare Pages -> Settings -> Environment variables. Without it, all API calls fail silently and pages show empty or perpetual loading states.

Set it to the full URL of the bot Worker:

- `https://hns-bot.YOUR_SUBDOMAIN.workers.dev`
- or your custom API subdomain if configured (for example `https://api.h4cknstack.com`)
