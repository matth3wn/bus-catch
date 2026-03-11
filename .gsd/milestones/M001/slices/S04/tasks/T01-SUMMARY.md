---
id: T01
parent: S04
milestone: M001
provides:
  - Correct manifest URL across layout, SW, and Next.js auto-injection
  - Clean production build with no PWA-blocking bugs
key_files:
  - app/layout.tsx
  - public/sw.js
key_decisions:
  - Rely entirely on Next.js auto-injection for manifest link (no hardcoded link in layout)
patterns_established:
  - none
observability_surfaces:
  - "/manifest.webmanifest endpoint returns valid JSON — confirms PWA config"
  - "grep -r manifest.json app/ public/ returns nothing — confirms no stale references"
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Fix PWA bugs and verify build

**Removed hardcoded manifest link from layout.tsx and fixed SW pre-cache URL from `/manifest.json` to `/manifest.webmanifest`.**

## What Happened

Two bugs blocked PWA installability:
1. `app/layout.tsx` had a hardcoded `<link rel="manifest" href="/manifest.json" />` but Next.js serves the manifest at `/manifest.webmanifest` (generated from `app/manifest.ts`). Removed the hardcoded link — Next.js auto-injects the correct one.
2. `public/sw.js` had `SHELL_ASSETS = ["/", "/manifest.json"]` which would 404 on install. Updated to `["/", "/manifest.webmanifest"]`.

Both fixes were straightforward one-line changes. All verification passed on first attempt.

## Verification

- `grep -r "manifest.json" app/ public/` — zero matches (no stale references) ✅
- `npm run build` — clean, zero errors, confirms `/manifest.webmanifest` route ✅
- `npx vitest run` — 51 tests pass across 5 files, zero failures ✅
- `curl http://localhost:3000/manifest.webmanifest | jq .name` — returns `"Bus Catch"` ✅
- `curl http://localhost:3000 | grep manifest` — returns `<link rel="manifest" href="/manifest.webmanifest"/>` (auto-injected by Next.js) ✅

### Slice-level checks (partial — T01 scope):
- `npm run build` clean ✅
- `npx vitest run` all pass ✅
- Remaining checks (deployed URL, real device) are T02/T03 scope

## Diagnostics

- `/manifest.webmanifest` endpoint returns valid JSON with correct PWA metadata
- If manifest URL regresses, browser console will show 404 for manifest fetch and PWA install prompt won't appear
- `grep -r "manifest.json" app/ public/` catches any stale reference re-introduction

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `app/layout.tsx` — removed hardcoded `<link rel="manifest" href="/manifest.json" />`, kept apple-touch-icon
- `public/sw.js` — updated SHELL_ASSETS from `/manifest.json` to `/manifest.webmanifest`
