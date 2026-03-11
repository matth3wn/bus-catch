# S04: Deploy & Validate

**Goal:** App is deployed to a public URL, installable as PWA on iOS/Android, with proper service worker caching and manifest. The full flow works on a real phone.
**Demo:** Open the deployed URL on a phone, see the glanceable recommendation, tap for detail, add to home screen, reopen from home screen in standalone mode.

## Must-Haves

- Manifest URL mismatch fixed (remove hardcoded `/manifest.json` link, fix SW pre-cache)
- Service worker caches shell correctly with no 404s on install
- App deployed to a public Vercel URL
- Production build clean, all tests pass
- App loads from deployed URL in browser
- App installable as PWA (manifest served correctly at `/manifest.webmanifest`)
- API routes return data from deployed environment (Metro API v2 fallback works without Swiftly key)
- Real-device verification: GPS tracking, recommendation colors, detail panel, service worker caching

## Proof Level

- This slice proves: operational + final-assembly
- Real runtime required: yes — deployed Vercel environment with real API calls and GPS
- Human/UAT required: yes — real-device PWA install and GPS verification require a physical phone

## Verification

- `npm run build` — clean production build, zero errors
- `npx vitest run` — all tests pass (no regression from bug fixes)
- `curl -s <deployed-url>/manifest.webmanifest | jq .name` returns "Bus Catch"
- `curl -s -o /dev/null -w "%{http_code}" <deployed-url>` returns 200
- `curl -s -o /dev/null -w "%{http_code}" <deployed-url>/api/metro/trip-updates` returns 200
- Browser at deployed URL: page loads, service worker registers, no console errors
- Real device: app installs to home screen, opens in standalone mode, GPS activates, recommendation renders

## Observability / Diagnostics

- Runtime signals: Service worker install/activate events logged to console; API route responses include `source` field indicating active data tier
- Inspection surfaces: `/api/metro/trip-updates` and `/api/metro/vehicle-positions` are health-check proxies — 200 with `source` field confirms data pipeline; `/manifest.webmanifest` confirms PWA config; browser DevTools Application tab shows SW status and cache contents
- Failure visibility: SW install failure visible in browser console (cache.addAll rejection); manifest 404 visible in network tab; API errors surface via `dataError` field in UI alert badges
- Redaction constraints: `SWIFTLY_API_KEY` is server-side only, never exposed to client

## Integration Closure

- Upstream surfaces consumed: `app/page.tsx` (S03), `components/glanceable-screen.tsx` (S03), `components/detail-panel.tsx` (S03), `lib/use-bus-catch.ts` (S02), `app/api/metro/trip-updates/route.ts` (S01), `app/api/metro/vehicle-positions/route.ts` (S01), `app/manifest.ts` (existing), `public/sw.js` (existing), `app/layout.tsx` (S03)
- New wiring introduced in this slice: Vercel deployment (build + serverless), manifest URL fix (layout.tsx → Next.js auto-link), SW pre-cache fix (correct manifest URL), GitHub repo + remote
- What remains before the milestone is truly usable end-to-end: nothing — S04 is the final assembly slice; after this, the milestone definition of done is met

## Tasks

- [ ] **T01: Fix PWA bugs and verify build** `est:20m`
  - Why: Manifest URL mismatch blocks PWA installability; SW pre-cache 404 causes silent install failure. Must fix before deployment.
  - Files: `app/layout.tsx`, `public/sw.js`
  - Do: Remove hardcoded `<link rel="manifest" href="/manifest.json" />` from layout.tsx (keep apple-touch-icon). Update SW SHELL_ASSETS to use `/manifest.webmanifest` instead of `/manifest.json`. Verify `npm run build` is clean and `npx vitest run` passes. Verify the build output serves manifest at `/manifest.webmanifest`.
  - Verify: `npm run build` clean, `npx vitest run` all pass, dev server confirms `/manifest.webmanifest` returns valid JSON with `name: "Bus Catch"`, no `/manifest.json` reference in layout.tsx or sw.js
  - Done when: Build clean, tests pass, manifest URL consistent across layout/SW/Next.js generation

- [ ] **T02: Deploy to Vercel and verify production** `est:25m`
  - Why: App needs a public URL to be usable as a PWA and to validate real API routes from a production environment.
  - Files: `package.json` (no changes, just context), Vercel project config (external)
  - Do: Create GitHub repo and push code. Deploy to Vercel via CLI or GitHub integration. Add `SWIFTLY_API_KEY` as optional env var if available. Verify deployed URL loads, manifest is served correctly, API routes return real data.
  - Verify: Deployed URL returns 200, `/manifest.webmanifest` returns valid manifest, `/api/metro/trip-updates` returns predictions with `source` field, no console errors in browser at deployed URL
  - Done when: App is live at a public Vercel URL, API routes return real transit data, manifest is correct for PWA installation

- [ ] **T03: Real-device PWA validation** `est:20m`
  - Why: All prior slices were browser-only. PWA install, standalone mode, GPS tracking, service worker caching, and iOS Safari quirks must be verified on a real phone. This is the milestone's final acceptance gate.
  - Files: `.gsd/milestones/M001/slices/S04/S04-UAT.md` (new — UAT checklist)
  - Do: Write UAT checklist covering: PWA installability, standalone mode launch, GPS permission and tracking, recommendation color states (green/amber/gray), detail panel expand/collapse, service worker caching (airplane mode shell load), data source badge accuracy. Visit deployed URL on phone, run through checklist, document results.
  - Verify: UAT checklist completed with pass/fail for each item. Critical items: app installs, opens standalone, GPS activates, recommendation renders with correct color.
  - Done when: UAT checklist documents that the app installs as PWA, shows GPS-based recommendations, and works in standalone mode on a real device

## Files Likely Touched

- `app/layout.tsx`
- `public/sw.js`
- `.gsd/milestones/M001/slices/S04/S04-UAT.md`
