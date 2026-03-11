# M002: Northbound — Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

## Project Description

Bus Catch is a deployed PWA at https://bus-mu-ebon.vercel.app that tells the user whether to walk or wait for the Metro 222 bus. Currently it only supports the southbound commute (Universal City station → work). The user also walks the reverse — from work back to Universal City station — and needs the same walk-or-wait answer for the northbound 222.

## Why This Milestone

The app is only useful for half the commute. Every afternoon the user walks north on Cahuenga Blvd back to the B Line station and the app is useless — it's looking at the wrong stops, wrong direction, wrong bus predictions. Adding northbound support doubles the app's daily utility with minimal new complexity since the architecture (API fallback, catch calculator, glanceable UX) is proven.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Walk north on Cahuenga Blvd toward Universal City station and see the same glanceable walk-or-wait answer for the northbound 222
- The app automatically detects which direction they're walking and shows the correct recommendation — no manual toggle needed
- If direction detection fails or is ambiguous, the user can see which direction is active and override it

### Entry point / environment

- Entry point: Same PWA opened from phone home screen
- Environment: Mobile browser (iOS Safari, Chrome) in standalone PWA mode
- Live dependencies involved: Metro API v2 (same as M001), browser Geolocation API

## Completion Class

- Contract complete means: Northbound route data, stops, and API filtering work correctly; catch calculator produces correct results for northbound scenarios; direction detection logic is tested
- Integration complete means: GPS + direction detection + northbound API data + calculator + UI all work together, switching automatically based on walking direction
- Operational complete means: Deployed to production, user can use the app walking in either direction without any manual intervention

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- App deployed to production with northbound support
- Opening the app while walking north on Cahuenga shows northbound bus predictions and correct recommendation
- Opening the app while walking south shows southbound predictions (existing behavior preserved)
- Direction switch happens automatically based on GPS movement — no manual toggle needed
- Detail panel shows correct northbound stops and route diagram

## Risks and Unknowns

- **Direction detection reliability** — Need enough GPS samples to determine walking direction. Early in a walk or while standing still, direction may be ambiguous. Must handle gracefully.
- **Northbound stop ID mapping** — Northbound stops have different IDs than southbound (different side of street). Must verify all 7 northbound stop IDs on Cahuenga are correct.
- **Walking route polyline accuracy** — The northbound walking route is approximately the reverse of the southbound polyline, but the actual sidewalk may differ slightly. Need to decide: reverse existing polyline or source a new one.
- **Shared Universal City station stop** — Stop 30002 appears in both directions. Route snapping and distance calculations need to handle this correctly.

## Existing Codebase / Prior Art

- `lib/route-data.ts` — Hardcoded southbound polyline (WALKING_ROUTE) and stops (STOPS). Both need northbound equivalents.
- `lib/constants.ts` — DIRECTION_ID=1 (southbound) hardcoded. Needs to support 0 (northbound).
- `lib/metro-fetchers.ts` — Filters by DIRECTION_ID in parseMetroTripDetail, parseMetroVehiclePositions, parseScheduleResponse. Needs direction parameter.
- `lib/catch-calculator.ts` — Uses STOPS from route-data. Needs to accept stops as parameter or use direction-aware data.
- `lib/use-bus-catch.ts` — Orchestrates everything. Needs direction detection and to pass correct direction through the pipeline.
- `app/api/metro/trip-updates/route.ts` — Filters Swiftly data by DIRECTION_ID. Needs direction as query param or to return both.
- `app/api/metro/vehicle-positions/route.ts` — Same DIRECTION_ID filtering. Needs direction parameter.
- `components/glanceable-screen.tsx` — Direction-agnostic (renders recommendation). May need direction indicator.
- `components/detail-panel.tsx` — Shows route diagram and stop cards. Needs to render correct stops for active direction.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R011 — Northbound / return trip support (this milestone's primary target, currently deferred)
- R001 — Glanceable walk-or-wait decision (must work for both directions)
- R002 — Tap-to-expand detail (must show correct northbound stops)
- R005 — Reliable GPS tracking (direction detection adds new GPS requirement)
- R006 — Accurate catch calculations (must work for northbound scenarios)
- R009 — Failure visibility (direction ambiguity is a new failure state to surface)

## Scope

### In Scope

- Northbound route data (polyline + stops) for Cahuenga Blvd segment
- Automatic direction detection from GPS movement
- Direction-aware API filtering (direction_id=0 for northbound)
- Direction-aware catch calculator
- Direction indicator in UI (which direction is active)
- Fallback behavior when direction is ambiguous
- Tests for northbound scenarios
- Deploy to production

### Out of Scope / Non-Goals

- Manual direction toggle UI (handle ambiguity with smart defaults, not a settings panel)
- Northbound stops outside the Cahuenga Blvd walking segment
- Full commute integration with B Line (R010)
- Swiftly API key integration (waiting on key, separate from this milestone)

## Technical Constraints

- Same stack: Next.js 16, React 19, Tailwind 4, TypeScript
- Must not break existing southbound behavior
- API routes must accept direction parameter without breaking existing callers
- Route data module currently computed at module load time — direction switching may need lazy or dual computation

## Integration Points

- **Metro API v2** — `trip_detail/route_code/222` returns both directions; filtering happens in parse functions
- **Metro schedule API** — `route_stops/222` returns both directions; same filtering
- **Browser Geolocation API** — watchPosition already in use; direction detection uses position history

## Open Questions

- **Reverse polyline or new data?** — The northbound sidewalk on Cahuenga is across the street from southbound. For route snapping purposes, the difference is likely <20m. Reversing the existing polyline is simpler and probably sufficient.
- **Direction detection threshold** — How many GPS samples and what heading consistency is needed before confidently determining direction? Need to balance responsiveness (detect quickly) vs stability (don't flip-flop).
- **API route parameter design** — Pass direction as query param (`?direction=northbound`) or have the API return both directions and let the client filter? Query param is simpler and matches existing server-side filtering.

## Northbound Route Data (from Metro API v2)

Northbound (direction_id=0) stops on Cahuenga Blvd segment, south to north:

| stop_id | stop_name | lat | lng |
|---|---|---|---|
| 9138 | Cahuenga / Lakeridge | 34.124128 | -118.342234 |
| 554 | Cahuenga / Barham | 34.128667 | -118.347312 |
| 558 | Cahuenga / Oakshire | 34.130549 | -118.350062 |
| 548 | Cahuenga / Universal Studios | 34.132332 | -118.353024 |
| 556 | Cahuenga / Broadlawn | 34.132970 | -118.355664 |
| 551 | Cahuenga / Regal Pl | 34.134975 | -118.360751 |
| 30002 | Universal / Studio City Station | 34.139051 | -118.363171 |

Compare southbound (direction_id=1) stop IDs: 30002, 15025, 9141, 9144, 9133, 9146, 9142, 552

Only stop 30002 (Universal City station) is shared between directions.
