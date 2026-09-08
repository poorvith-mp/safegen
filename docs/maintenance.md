# Maintenance and deployment

## Local development

Use Node 22.13+ and the checked-in lockfile:

```text
npm ci
npm run dev
npm run lint
npm test
npm run build
```

`build:packages` cleans and builds core before CLI. Do not run it concurrently with tests that consume package output. The Vite site imports the built core. Build the site before running a production preview.

`npm run test:browser` checks the preview at `http://127.0.0.1:4173`. Start `npm run preview` first. It needs an existing Playwright install: set `SAFEGEN_PLAYWRIGHT_MODULE` to its module entry when outside this checkout; optionally set `SAFEGEN_BROWSER_CHANNEL=msedge`. `SAFEGEN_TEST_URL` selects a deployed site. The test uses a fresh profile and synthetic data. Browser automation is not a production dependency.

Browser routes are `/`, `/generator`, `/generator/history`, `/generator/estimate`, `/setup`, `/docs` and `/about`. Keep `App.tsx`, service-worker navigation paths and the sitemap consistent when adding public routes. Setup and docs use ordinary React content with shared copy blocks; no markdown runtime is needed. Maintain the repository guides alongside client-facing instructions.

## Existing Cloudflare deployment

The existing Workers Git integration builds `main` and serves `dist`. `wrangler.jsonc` defines the Worker and static-asset SPA fallback. Only public website assets deploy; no owner vault or broker belongs on Cloudflare.

1. Run the checks for the change and inspect the resulting diff.
2. Push the approved change. Check the `Workers Builds: safegen` result for that exact commit.
3. Verify the live landing page, deep links, setup copy controls and offline reload.
4. If a release fails, use the existing Cloudflare deployment history to restore the previous known-good version, then fix the source before redeploying.

Keep `Cache-Control: no-transform` in `public/_headers`: it prevents automatic Cloudflare Web Analytics injection ([Cloudflare FAQ](https://developers.cloudflare.com/web-analytics/faq/)). Keep shell HTML revalidated and hashed assets immutable. The service worker must cache canonical `/`, since `/index.html` redirects on Cloudflare and redirected cache entries can fail offline navigation. It caches only public assets and known navigation paths, never secrets or broker traffic.

## Owner maintenance

Stop the broker before backup/restore/password rotation. Run maintenance in the isolated owner account, following [the CLI reference](../packages/cli/README.md). Backups need the original password; rotation affects only the live vault. Keep private backups outside agent workspaces and cloud-synced folders. Revoke provider tokens at the provider when required.

Update owner code and dependencies as a trusted human operation. Agent-side changes must not modify the owner's installation. Never include real tokens, private URLs, vaults or screenshots of the owner session in bug reports.

## Release discipline

Source CLI 3 and npm publication are separate. Verify the published package version and behavior before recommending an npm install. This repository's action-only boundary must not be attributed to older credential-returning versions.

Local agent skills, implementation notes and generated tool caches are excluded from the product repository. Public documentation should explain behavior, interfaces and maintenance. Changes to secret handling need a dedicated security review; a UI smoke test does not establish isolation or audit the broker.
