---
estimated_steps: 5
estimated_files: 2
---

# T01: Fix PWA bugs and verify build

**Slice:** S04 — Deploy & Validate
**Milestone:** M001

## Description

Fix the manifest URL mismatch that blocks PWA installability and the service worker pre-cache 404. The research identified two bugs: `layout.tsx` hardcodes `<link rel="manifest" href="/manifest.json" />` but Next.js serves the manifest at `/manifest.webmanifest` (generated from `app/manifest.ts`), and `public/sw.js` pre-caches `/manifest.json` which will 404. Both must be corrected before deployment.

## Steps

1. In `app/layout.tsx`, remove the hardcoded `<link rel="manifest" href="/manifest.json" />` line from the `<head>`. Keep the `<link rel="apple-touch-icon" href="/icon-192.png" />` line. Next.js auto-injects the correct manifest link when `app/manifest.ts` exists.
2. In `public/sw.js`, update `SHELL_ASSETS` from `["/", "/manifest.json"]` to `["/", "/manifest.webmanifest"]` so the service worker pre-caches the correct manifest URL.
3. Run `npm run build` and verify clean build with zero errors.
4. Run `npx vitest run` and verify all tests pass (no regression).
5. Start the dev server, verify that `/manifest.webmanifest` returns valid JSON with `name: "Bus Catch"`, and verify the rendered HTML includes a `<link rel="manifest" href="/manifest.webmanifest">` tag auto-injected by Next.js (not the old `/manifest.json` path).

## Must-Haves

- [ ] Hardcoded `<link rel="manifest" href="/manifest.json" />` removed from layout.tsx
- [ ] SW SHELL_ASSETS references `/manifest.webmanifest` instead of `/manifest.json`
- [ ] `npm run build` clean
- [ ] `npx vitest run` all tests pass
- [ ] Dev server serves valid manifest at `/manifest.webmanifest`

## Verification

- `grep -r "manifest.json" app/ public/` returns zero matches (no stale references)
- `npm run build` exits 0 with no errors
- `npx vitest run` — all tests pass
- `curl http://localhost:3000/manifest.webmanifest | jq .name` returns "Bus Catch"
- Page HTML includes `<link rel="manifest" href="/manifest.webmanifest">`

## Observability Impact

- Signals added/changed: None — these are build-time/static fixes
- How a future agent inspects this: `grep -r "manifest.json" app/ public/` should return nothing; `/manifest.webmanifest` endpoint returns valid JSON
- Failure state exposed: If manifest URL is wrong, browser console shows 404 for manifest fetch and PWA install prompt never appears

## Inputs

- `app/layout.tsx` — current file with hardcoded manifest link (confirmed in research)
- `public/sw.js` — current file with `/manifest.json` in SHELL_ASSETS (confirmed in research)
- `app/manifest.ts` — existing Next.js manifest generator (no changes needed)
- S04 research identifying both bugs and the fix approach

## Expected Output

- `app/layout.tsx` — hardcoded manifest link removed, apple-touch-icon retained
- `public/sw.js` — SHELL_ASSETS updated to `/manifest.webmanifest`
- Clean build and passing tests confirming no regression
