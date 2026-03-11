# Project

## What This Is

Bus Catch — a mobile PWA that answers one question during a daily commute: "Should I wait for the Metro 222 bus or keep walking?" The user walks ~1 mile from Universal City B Line station south along Cahuenga Blvd to work. The 222 bus covers that same stretch. The app uses real-time bus data and GPS to make a walk-or-wait recommendation.

## Core Value

Instant, glanceable walk-or-wait decision when the user pulls out their phone mid-walk. The answer must be visible in under 1 second with zero interaction.

## Current State

**Deployed and live at https://bus-mu-ebon.vercel.app** — a feature-complete PWA with glanceable UX, resilient data pipeline, validated core logic, and production deployment. M001 ("Ship It") is complete.

- **Deployed:** Vercel production at https://bus-mu-ebon.vercel.app, auto-deploys from GitHub (matth3wn/bus-catch)
- **Glanceable UX:** Full-screen color-coded recommendation (green/amber/gray) fills viewport with text-5xl headline, tap-to-expand detail panel with stop cards and route diagram
- **Dynamic theme-color:** Meta tag updates to match recommendation state for PWA status bar
- **Failure visibility:** Data source badge always visible (realtime/schedule/mock), staleness warning, gpsError/dataError alert badges
- **iOS PWA support:** viewport-fit: cover, safe-area padding utilities, standalone mode via manifest
- **Multi-tier API fallback:** Swiftly → Metro API v2 real-time → schedule → mock
- **Metro API v2 integration** for trip updates and vehicle positions (no API key needed)
- **Schedule fallback** using Metro `route_stops` endpoint with day-type detection and GTFS >24h time handling
- **Source tagging:** every API response includes `source` field indicating active data tier
- **Validated catch calculator:** 12 scenario-based tests prove correct walk-or-wait recommendations
- **Validated geo functions:** 14 tests cover haversine distance, route snapping, walk time estimation
- **Tightened GPS thresholds:** 50m accuracy, 100m off-route
- **PWA ready:** manifest, service worker with shell caching, HTTPS via Vercel
- 8 hardcoded Route 222 southbound stops
- 51 passing tests (Vitest)

## Architecture / Key Patterns

- **Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript
- **Data flow:** GPS watchPosition → route snap → catch calculator (pure function) → UI state
- **API proxy:** Next.js API routes with multi-tier fallback: Swiftly GTFS-RT → Metro API v2 JSON → schedule → mock
- **Data fetchers:** `lib/metro-fetchers.ts` — pure parse functions + async fetch wrappers, separated for testability
- **Route data:** Hardcoded polyline + stops in `lib/route-data.ts`, computed at module load
- **State:** Single `useBusCatch` hook manages GPS, polling, calculation, and recommendations
- **UI:** `page.tsx` orchestrates `GlanceableScreen` + `DetailPanel` with expand/collapse state; `RECOMMENDATION_STYLES` maps action → colors
- **PWA:** manifest.ts + public/sw.js, iOS install prompt in detail panel footer, dynamic theme-color meta
- **Deployment:** Vercel serverless with GitHub auto-deploy
- **Testing:** Vitest + happy-dom, path aliases matching tsconfig

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: Ship It — Fix reliability, redesign for glanceability, support public GTFS-RT, deploy as PWA
  - [x] S01: Resilient Data Pipeline
  - [x] S02: GPS & Calculation Reliability
  - [x] S03: Glanceable UX
  - [x] S04: Deploy & Validate
