---
id: M002
provides:
  - Northbound Route 222 support with 7 stops (direction_id=0)
  - Automatic direction detection from GPS position history
  - Direction-parameterized API routes (?direction=0|1), parse functions, and catch calculator
  - Direction indicator badge on glanceable screen (↑ NB / ↓ SB)
  - Direction-aware detail panel label (Northbound/Southbound)
  - getRouteData() accessor for direction-aware polyline, stops, and total distance
  - snapToRoute() accepts route parameter for bidirectional snapping
  - 71 passing tests (20 new: 9 direction detection, 4 northbound calculator, 4 northbound geo, 3 API direction)
key_decisions:
  - D022: Reverse existing southbound polyline for northbound route (same sidewalk area, <20m difference)
  - D023: Direction detection via net latitude displacement (>30m threshold, ≥3 samples)
  - D024: API routes accept ?direction= query param, default to 1 (southbound) for backward compat
  - D025: Direction badge shows "↑ NB" / "↓ SB" — compact for mobile
patterns_established:
  - Direction as a parameter threading through the entire pipeline (API → parser → calculator → state → UI)
  - getRouteData(directionId) accessor pattern — single point of direction-aware data access
  - detectDirection() as a pure function consuming PositionSample[] — same testability pattern as catch calculator
  - All direction-dependent functions default to southbound for backward compatibility
observability_surfaces:
  - Direction badge on glanceable screen (visible when GPS determines direction)
  - API response source field still present (unchanged from M001)
  - Console logging includes direction parameter in API route logs
  - Detail panel footer shows "Metro 222 Northbound/Southbound · Cahuenga Blvd"
  - curl .../api/metro/trip-updates?direction=0 returns northbound-filtered predictions
requirement_outcomes:
  - id: R011
    from_status: active
    to_status: active
    proof: "Northbound data layer, direction detection, API parameterization, and UI wiring all implemented and tested (71 tests). Full validation requires real-walk test on Cahuenga Blvd walking northbound."
duration: ~45m across 3 slices (5 tasks)
verification_result: passed
completed_at: 2026-03-11
---

# M002: Northbound

**Added northbound Route 222 support with automatic GPS-based direction detection — the app now works for both directions of the daily commute.**

## What Happened

Three slices delivered northbound support as a parameterized extension of the existing southbound pipeline:

**S01 (Direction-Aware Data Layer)** added northbound route data (7 stops, reversed polyline), a direction detection module (`detectDirection()` — pure function computing net latitude displacement from GPS history), and parameterized all data-layer functions by direction. API routes now accept `?direction=0` for northbound, defaulting to `1` (southbound) for backward compatibility. Metro fetcher parse functions, fetch functions, and Swiftly parsing all accept direction. 20 new tests cover direction detection (9), northbound catch calculator (4), northbound geo (4), and API direction filtering (3).

**S02 (Bidirectional Calculator & UI)** wired direction detection into `useBusCatch` — GPS position history feeds `detectDirection()`, the result flows to API calls as a query parameter, to `snapToRoute()` with the correct polyline, and to `calculateCatch()` with the correct stops. Added direction indicator badge to GlanceableScreen ("↑ NB" / "↓ SB") and direction-aware label in DetailPanel ("Metro 222 Northbound/Southbound · Cahuenga Blvd"). `BusCatchState` extended with `direction` field.

**S03 (Deploy & Regression Check)** pushed to GitHub (auto-deploys to Vercel). Production verified: homepage 200, northbound API returns correct stop IDs (554, 558, 548, 556, 551, 9138, 30002), southbound API unchanged, manifest valid, zero console errors, zero failed requests.

## Cross-Slice Verification

| Criterion | Status | Evidence |
|---|---|---|
| Walking north shows northbound predictions | ✅ Structurally verified | Direction detection classifies northbound from GPS, API calls use direction=0, calculator uses northbound stops. 71 tests pass. Real-walk deferred. |
| Walking south continues to work | ✅ Verified | All existing tests pass (no regression). Production southbound API returns correct stop IDs. Default direction=1 preserved. |
| Direction switches automatically from GPS | ✅ Structurally verified | `detectDirection()` returns northbound/southbound/null from position history. 9 unit tests cover all cases. Real GPS deferred to device test. |
| Detail panel shows correct stops | ✅ Verified | Direction-aware stops passed to calculator → stopAnalyses → DetailPanel. Direction label updates. |
| Direction indicator visible | ✅ Verified | Badge renders when direction is non-null. Shows "↑ NB" or "↓ SB". |
| Deployed to production | ✅ Verified | https://bus-mu-ebon.vercel.app — 200, northbound API works, zero errors. |

## Requirement Changes

- R011 (Northbound support): deferred → **active** — fully implemented (direction detection, northbound data, bidirectional pipeline, UI), 71 tests pass. Full validation requires real northbound walk on Cahuenga Blvd.

## Forward Intelligence

### What the next milestone should know
- Direction detection needs real-world GPS data to validate. The 30m displacement threshold and 3-sample minimum are reasonable estimates but untested on a phone.
- The `?direction=` query parameter is backward compatible — omitting it gives southbound. Existing clients (the PWA) now send direction automatically.
- Northbound stop IDs (9138, 554, 558, 548, 556, 551, 30002) are from Metro API v2 schedule endpoint. They should match real-time trip_detail data but this hasn't been confirmed during service hours.

### What's fragile
- **Direction detection threshold (30m)** — may need tuning. Too low = flip-flopping from GPS noise. Too high = slow to detect direction at walk start.
- **Position history for direction (20 samples max)** — at one GPS reading per ~1-5 seconds, this covers 20-100 seconds. Enough for steady walking, but startup detection could be slow.
- **Reversed polyline for northbound** — the actual northbound sidewalk is across the street (~15m). For route snapping this is well within the 100m threshold, but if snapping precision matters in the future, a separate northbound polyline from GTFS shape data would be better.

### Authoritative diagnostics
- `curl https://bus-mu-ebon.vercel.app/api/metro/trip-updates?direction=0` — northbound predictions health check
- `npx vitest run` — 71 tests cover both directions
- Direction badge in the app UI — "↑ NB" or "↓ SB" confirms which direction the app detected

### What assumptions changed
- None — the plan was straightforward and executed as designed.

## Files Created/Modified

- `lib/route-data.ts` — NORTHBOUND_WALKING_ROUTE, NORTHBOUND_STOPS, getRouteData(), snapToRouteDistance parameterized
- `lib/direction.ts` — NEW: detectDirection() pure function
- `lib/constants.ts` — NORTHBOUND_DIRECTION_ID, DIRECTION_MIN_DISPLACEMENT, DIRECTION_MIN_SAMPLES
- `lib/types.ts` — BusCatchState.direction field
- `lib/metro-fetchers.ts` — direction parameter on all parse/fetch functions
- `lib/metro-api.ts` — direction parameter on client-side fetch functions
- `lib/catch-calculator.ts` — optional stops parameter
- `lib/geo.ts` — optional route parameter on snapToRoute
- `lib/use-bus-catch.ts` — direction detection integration, direction-aware API calls and calculation
- `app/api/metro/trip-updates/route.ts` — ?direction= query param, direction-aware mock generation
- `app/api/metro/vehicle-positions/route.ts` — ?direction= query param
- `app/page.tsx` — passes direction to components
- `components/glanceable-screen.tsx` — direction badge
- `components/detail-panel.tsx` — direction-aware label
- `lib/__tests__/direction.test.ts` — NEW: 9 direction detection tests
- `lib/__tests__/catch-calculator.test.ts` — 4 northbound scenarios added
- `lib/__tests__/geo.test.ts` — 3 northbound snap/route tests added
- `lib/__tests__/metro-fetchers.test.ts` — 3 direction parameter tests added
- `app/api/metro/__tests__/trip-updates.test.ts` — direction param tests, NextRequest mock
- `app/api/metro/__tests__/vehicle-positions.test.ts` — NextRequest mock
