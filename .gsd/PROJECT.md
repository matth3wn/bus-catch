# Project

## What This Is

Bus Catch — a mobile PWA that answers one question during a daily commute: "Should I wait for the Metro 222 bus or keep walking?" The user walks ~1 mile from Universal City B Line station south along Cahuenga Blvd to work. The 222 bus covers that same stretch. The app uses real-time bus data and GPS to make a walk-or-wait recommendation.

## Core Value

Instant, glanceable walk-or-wait decision when the user pulls out their phone mid-walk. The answer must be visible in under 1 second with zero interaction.

## Current State

A working prototype with a resilient data pipeline:
- GPS tracking with route snapping along Cahuenga Blvd polyline
- **Multi-tier API fallback:** Swiftly → Metro API v2 real-time → schedule → mock (S01 complete)
- **Metro API v2 integration** for trip updates and vehicle positions (no API key needed)
- **Schedule fallback** using Metro `route_stops` endpoint with day-type detection and GTFS >24h time handling
- **Source tagging:** every API response includes `source` field indicating active data tier
- Catch calculator comparing per-stop walk time vs bus arrival time
- 8 hardcoded Route 222 southbound stops
- Dark-mode UI with status banner, route diagram, and stop cards
- PWA manifest and service worker registration
- 25 passing tests (Vitest) covering all fallback tiers and edge cases
- Never tested with real GPS on an actual walk

Next: S02 validates GPS tracking and catch calculations with real-world scenarios.

## Architecture / Key Patterns

- **Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript
- **Data flow:** GPS watchPosition → route snap → catch calculator (pure function) → UI state
- **API proxy:** Next.js API routes with multi-tier fallback: Swiftly GTFS-RT → Metro API v2 JSON → schedule → mock
- **Data fetchers:** `lib/metro-fetchers.ts` — pure parse functions + async fetch wrappers, separated for testability
- **Route data:** Hardcoded polyline + stops in `lib/route-data.ts`, computed at module load
- **State:** Single `useBusCatch` hook manages GPS, polling, calculation, and recommendations
- **PWA:** manifest.ts + public/sw.js, iOS install prompt
- **Testing:** Vitest + happy-dom, path aliases matching tsconfig

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Ship It — Fix reliability, redesign for glanceability, support public GTFS-RT, deploy as PWA
  - [x] S01: Resilient Data Pipeline
  - [ ] S02: GPS & Calculation Reliability
  - [ ] S03: Glanceable UX
  - [ ] S04: Deploy & Validate
