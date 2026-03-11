# M001: Ship It — Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

## Project Description

Bus Catch is a single-purpose PWA that tells the user whether to wait for the Metro 222 bus or keep walking during their daily commute from Universal City B Line station south along Cahuenga Blvd. A working prototype exists with GPS tracking, Swiftly API integration, catch calculator, and basic UI — but it's never been tested on a real walk and the UX isn't optimized for the user's core need: an instant, glanceable answer.

## Why This Milestone

The prototype exists but isn't usable in practice. Three gaps block real-world use:
1. **Data reliability** — Only Swiftly API supported, no public GTFS-RT fallback, no schedule-based fallback. If the API is down or key is missing, the app is useless.
2. **GPS/calculation reliability** — Never tested on a real walk. Route snapping, speed estimation, and catch buffer constants are all unvalidated.
3. **UX** — Current UI requires reading multiple cards to understand the recommendation. User wants a full-screen, one-glance answer.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Pull out their phone mid-walk and instantly see a full-screen color telling them to walk or wait
- Tap to see detailed stop times and bus positions
- Trust the recommendation because it's powered by real-time data with schedule fallback
- Install the app on their phone home screen and use it daily

### Entry point / environment

- Entry point: PWA opened from phone home screen (or browser URL)
- Environment: Mobile browser (iOS Safari, Chrome) in standalone PWA mode
- Live dependencies involved: LA Metro GTFS-RT feed (Swiftly or public), browser Geolocation API

## Completion Class

- Contract complete means: All components render, catch calculator produces correct results for known inputs, API routes return valid GTFS-RT data
- Integration complete means: GPS + API + calculator + UI work together on a real phone producing real recommendations
- Operational complete means: App is deployed, installable, and survives API failures gracefully with schedule fallback

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- App deployed to public URL, installable as PWA, opens in standalone mode
- On a phone with GPS, the app shows a glanceable walk-or-wait recommendation that updates as you move
- With Swiftly key: real predictions appear. Without key: public GTFS-RT works. With neither: schedule fallback provides approximate times.
- Tapping the glanceable screen reveals detailed stop information

## Risks and Unknowns

- **LA Metro public GTFS-RT availability** — Need to verify the public endpoint URL, auth requirements, and data format. If it differs significantly from Swiftly, parsing needs adjustment.
- **GPS accuracy on Cahuenga Blvd** — Urban canyon between hills could cause GPS drift. Route snapping may need tuning.
- **CATCH_BUFFER_SECONDS tuning** — 90 seconds may be wrong. Too conservative = never says wait. Too aggressive = user misses the bus.
- **GTFS static schedule data** — Need to source Route 222 schedule for fallback. Format and freshness matter.
- **Swiftly API auth format** — Code tries both raw and Bearer token. Need to confirm which works (or if the key even exists).

## Existing Codebase / Prior Art

- `lib/catch-calculator.ts` — Pure function: user position + predictions → per-stop analysis + recommendation. Well-structured, testable.
- `lib/route-data.ts` — Hardcoded walking polyline + 8 stops with route distance snapping. Module-load-time computation.
- `lib/use-bus-catch.ts` — Main state hook: GPS watch, API polling, calculation, vibration. Orchestrates everything.
- `lib/geo.ts` — Haversine distance, route snapping, walk time estimation.
- `lib/metro-api.ts` — Client-side API callers for the Next.js proxy routes.
- `lib/constants.ts` — Tuning constants (walk speed, poll interval, buffer, route IDs).
- `app/api/metro/trip-updates/route.ts` — Swiftly GTFS-RT proxy with mock fallback.
- `app/api/metro/vehicle-positions/route.ts` — Swiftly vehicle positions proxy with mock fallback.
- `components/status-banner.tsx` — Current recommendation banner (will be replaced by glanceable UX).
- `components/route-diagram.tsx` — Vertical route visualization with stop dots and bus markers.
- `components/stop-card.tsx` — Per-stop walk/bus time card.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R001 — Glanceable walk-or-wait (primary UX redesign in S03)
- R002 — Tap-to-expand detail (S03)
- R003 — Real-time bus predictions (S01 validates data pipeline)
- R004 — Dual API support (S01 adds public GTFS-RT)
- R005 — Reliable GPS tracking (S02 tests and tunes)
- R006 — Accurate catch calculations (S02 validates with real data)
- R007 — Schedule-based fallback (S01 adds static schedule layer)
- R008 — PWA deployment (S04 deploys and validates)
- R009 — Failure visibility (S02 adds staleness/error handling, S03 surfaces in UX)

## Scope

### In Scope

- Public GTFS-RT endpoint integration with Swiftly fallback
- Static GTFS schedule fallback for when real-time data is unavailable
- GPS and catch calculator reliability testing and tuning
- Glanceable full-screen UX redesign with tap-to-expand detail
- Failure/staleness indication in the UI
- PWA deployment with proper caching
- Route 222 southbound only

### Out of Scope / Non-Goals

- Northbound / return trip (deferred to future milestone)
- Full commute integration with B Line timing (deferred)
- Multi-route support
- User accounts or settings
- Push notifications

## Technical Constraints

- Next.js 16 + React 19 + Tailwind 4 (established stack, no changes)
- Must work in iOS Safari standalone mode (PWA)
- API keys must stay server-side (Next.js API routes as proxy)
- No backend/database — all state is ephemeral client-side
- Public GTFS-RT feeds may require protobuf parsing (GTFS-RT is protobuf by default, JSON only if provider supports it)

## Integration Points

- **Swiftly API** (`api.goswift.ly/real-time/lacmta`) — Existing integration for GTFS-RT in JSON format
- **LA Metro public GTFS-RT** — Need to discover endpoint URL and auth. Likely protobuf format.
- **Browser Geolocation API** — watchPosition with high accuracy for real-time GPS
- **Vercel** (likely deployment target) — Next.js hosting with serverless API routes

## Open Questions

- **Public GTFS-RT endpoint URL** — Need to confirm the actual URL for LA Metro's public feed. May be developer.metro.net or similar.
- **Protobuf parsing** — If public feed is protobuf-only, need a parser. `gtfs-realtime-bindings` npm package or similar.
- **Static GTFS schedule source** — Where to get Route 222 schedule data. GTFS static feed from Metro, or hardcode known schedule.
