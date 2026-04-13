# H4ck&Stack Wiki (`hns-wiki`)

VitePress documentation (FMHY-derived, CC BY-SA 4.0) served at [wiki.h4cknstack.com](https://wiki.h4cknstack.com).

## Local development

```bash
cd hns-wiki
pnpm install
pnpm docs:dev
```

Production build: `pnpm docs:build` (output: `docs/.vitepress/dist`).

## Deployment

This site is usually deployed as a **separate Cloudflare Pages** project with **root directory** `hns-wiki`. See the monorepo [`DEPLOY.md`](../DEPLOY.md) for build commands and output paths.

Set **`FMHY_BUILD_NSFW=`** (empty) in Cloudflare Pages **environment variables** for Production (and Preview if you use it). **Never set it to `true`** — that would re-enable restricted sidebar and build paths from upstream FMHY tooling.

Leave **`FMHY_BUILD_API=`** empty unless you intentionally enable the upstream feedback/API hooks (not required for static wiki hosting).

For local builds, add a `.env` file in this directory with `FMHY_BUILD_NSFW=` and `FMHY_BUILD_API=` left empty (`.env` is gitignored and not committed).
