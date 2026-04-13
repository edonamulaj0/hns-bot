## Deployment

The website requires `NEXT_PUBLIC_API_URL` set in Cloudflare Pages -> Settings -> Environment variables. Without it, all API calls fail silently and pages show empty or perpetual loading states.

Set it to the full URL of the bot Worker:

- `https://hns-bot.YOUR_SUBDOMAIN.workers.dev`
- or your custom API subdomain if configured (for example `https://api.h4cknstack.com`)
