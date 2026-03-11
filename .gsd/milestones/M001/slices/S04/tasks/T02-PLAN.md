---
estimated_steps: 5
estimated_files: 3
---

# T02: Deploy to Vercel and verify production

**Slice:** S04 — Deploy & Validate
**Milestone:** M001

## Description

Create a GitHub repository, push the codebase, deploy to Vercel, and verify the production deployment serves the app correctly. This includes confirming the manifest is correct for PWA installability, API routes return real transit data from the Metro API v2 fallback chain, and the service worker registers successfully.

## Steps

1. Create a GitHub repository (ask user for repo name preference or use `bus-catch`). Initialize git remote and push the current branch and main.
2. Deploy to Vercel — either via `npx vercel --prod` CLI or by linking the GitHub repo through Vercel dashboard. If `SWIFTLY_API_KEY` is available, add it as an optional environment variable (server-side only). The app works without it via Metro API v2 + schedule fallback.
3. Verify the deployed URL returns 200 and the page HTML loads correctly.
4. Verify `/manifest.webmanifest` on the deployed URL returns valid JSON with correct PWA fields (`name`, `start_url`, `display`, `icons`).
5. Verify `/api/metro/trip-updates` returns a response with predictions array and `source` field (confirming the data pipeline works from Vercel's serverless environment). Open the deployed URL in the browser, confirm service worker registers, no console errors, page renders the glanceable screen.

## Must-Haves

- [ ] Code pushed to GitHub repository
- [ ] App deployed to a public Vercel URL
- [ ] Deployed URL returns 200 with correct page content
- [ ] `/manifest.webmanifest` returns valid PWA manifest
- [ ] `/api/metro/trip-updates` returns data with `source` field from production
- [ ] Browser loads deployed URL with no console errors and service worker registers

## Verification

- `curl -s -o /dev/null -w "%{http_code}" <deployed-url>` returns 200
- `curl -s <deployed-url>/manifest.webmanifest | jq .name` returns "Bus Catch"
- `curl -s <deployed-url>/api/metro/trip-updates | jq .source` returns a valid source string
- Browser at deployed URL: glanceable screen renders, service worker registered in Application tab, zero JS console errors

## Observability Impact

- Signals added/changed: Vercel deployment provides build logs, serverless function logs, and edge network metrics
- How a future agent inspects this: `curl <url>/api/metro/trip-updates` confirms API health; `curl <url>/manifest.webmanifest` confirms PWA config; Vercel dashboard shows deployment status and function invocation logs
- Failure state exposed: Vercel build failure visible in deploy logs; API route errors surface as HTTP 500 with error details; manifest 404 means `app/manifest.ts` isn't being processed

## Inputs

- T01 output — clean build with fixed manifest URLs
- `app/api/metro/trip-updates/route.ts` — API route (from S01) that must work from Vercel serverless
- `app/api/metro/vehicle-positions/route.ts` — API route (from S01)
- `app/manifest.ts` — manifest generator
- `.env.local` — `SWIFTLY_API_KEY` (optional, server-side only)

## Expected Output

- GitHub repository with full codebase pushed
- Live Vercel deployment at a public URL
- Verified: page loads, manifest served, API routes return real data, SW registers
