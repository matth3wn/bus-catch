---
id: S02
parent: M001
milestone: M001
provides:
  - Unit tests for catch calculator (12 scenarios) and geo functions (14 tests) — baseline correctness proof
  - BusCatchState with dataSource, staleness, dataError fields — S03 boundary contract
  - Tightened GPS thresholds (50m accuracy, 100m off-route) for real-world noise rejection
  - metro-api.ts types pass source field through to callers
  - Pure estimateSpeed() function extracted to lib/speed.ts
requires:
  - slice: S01
    provides: API routes returning predictions with source field, multi-tier fallback chain
affects:
  - S03 — consumes BusCatchState.dataSource/staleness/dataError for failure visibility UI
  - S04 — validated calculator and GPS thresholds provide trustworthy state for deployment testing
key_files:
  - lib/__tests__/catch-calculator.test.ts
  - lib/__tests__/geo.test.ts
  - lib/constants.ts
  - lib/types.ts
  - lib/metro-api.ts
  - lib/use-bus-catch.ts
  - lib/speed.ts
key_decisions:
  - D010: GPS thresholds tightened to 50m accuracy, 100m off-route (revisable after S04 real-walk)
  - D011: Staleness thresholds — warn at 60s, error at 120s
  - D012: Source mapping simplifies API source strings to three-value dataSource enum
  - D013: Speed estimation extracted as pure function for testability
patterns_established:
  - Characterization test pattern — tests define correct behavior using real route data, no mocking
  - mapDataSource() pure function for API source → BusCatchState.dataSource mapping
  - lastSuccessfulFetch ref + computeStaleness() for tracking data freshness in hooks
  - estimateSpeed as pure function — position history, timestamp, window as inputs
observability_surfaces:
  - BusCatchState.dataSource — active data tier (realtime/schedule/mock/null)
  - BusCatchState.staleness — seconds since last successful fetch
  - BusCatchState.dataError — error message on stale data (>120s) or fetch failure
  - console.warn('[bus-catch] Data stale') on staleness transition
  - console.error('[bus-catch] Poll error') on fetch failures
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
duration: 2 tasks
verification_result: passed
completed_at: 2026-03-11
---

# S02: GPS & Calculation Reliability

**26 unit tests proving catch calculator and geo function correctness, plus BusCatchState extended with dataSource/staleness/dataError for failure visibility — GPS thresholds tightened for real-world use.**

## What Happened

Two tasks delivered the slice in sequence:

**T01 — Unit tests (26 tests):** Created characterization tests for the two core pure-function modules. `catch-calculator.test.ts` covers 9 research scenarios (no GPS, no predictions, all-past predictions, start/mid/end of walk, fast/slow walker) plus 3 edge cases (single prediction, bus behind user, duplicate stops). `geo.test.ts` covers haversine distance calculation (4 tests), route snapping (6 tests), and walk time estimation (4 tests). All tests use real route data from `route-data.ts` — no mocking. Factory helpers (`makePrediction`, `makeUser`) construct test inputs from real stop IDs with a fixed epoch for determinism.

**T02 — Thresholds, types, and wiring:** Tightened GPS thresholds from 200m/500m to 50m/100m — the old values were effective no-ops for Cahuenga Blvd walking. Extended `BusCatchState` with three new fields (`dataSource`, `staleness`, `dataError`) that S03 will render. Updated `metro-api.ts` response types to expose the `source` field that S01's API routes already return. Wired `useBusCatch` to map API source → simplified dataSource enum, track staleness via `lastSuccessfulFetch` ref, and surface errors when data is >120s stale or fetches fail. Extracted `estimateSpeed()` to `lib/speed.ts` as a pure function.

## Verification

- `npx vitest run` — **51 tests pass** (12 catch-calculator + 14 geo + 14 metro-fetchers + 5 vehicle-positions + 6 trip-updates), 0 failures
- `npm run build` — succeeds with zero type errors (proves BusCatchState extensions compile through entire app)
- `lib/__tests__/catch-calculator.test.ts` — 12 scenario-based tests present and passing
- `lib/__tests__/geo.test.ts` — 14 geo function tests present and passing
- Manual inspection confirms: `MAX_GPS_ACCURACY=50`, `MAX_OFF_ROUTE_DISTANCE=100` in constants
- Manual inspection confirms: `BusCatchState` has `dataSource`, `staleness`, `dataError` fields
- Manual inspection confirms: both metro-api response types include `source: string`

## Requirements Advanced

- R005 (Reliable GPS tracking) — GPS thresholds tightened to real-world values (50m/100m); geo functions tested with 14 unit tests covering haversine, route snapping, and walk time estimation. Full validation deferred to S04 real-walk test.
- R006 (Accurate catch calculations) — Catch calculator tested with 12 scenarios covering all known use cases. Pure function correctness proved; real-world buffer tuning deferred to S04.
- R009 (Failure visibility) — `BusCatchState` now exposes `dataSource`, `staleness`, `dataError` fields. Staleness detection wired with 60s warn / 120s error thresholds. S03 will render these fields in the UI.

## Requirements Validated

- none — R005, R006, R009 are advanced but not fully validated until S04 real-walk test (R005, R006) and S03 UI rendering (R009)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

- Haversine known-distance test: research estimated ~1600m for Universal City to Barham, but actual straight-line haversine is ~1914m. The 1600m was a route-following distance. Test adjusted to match real haversine output (1800-2000m range).
- Off-route snap test: initial offset produced only ~17m off-route due to route segment geometry. Increased offset to produce ~184m for meaningful threshold testing.

## Known Limitations

- GPS thresholds (50m/100m) are educated guesses — real-world validation in S04 may require tuning
- CATCH_BUFFER_SECONDS=90 unchanged — needs real-walk calibration
- Staleness thresholds (60s/120s) untested under real API conditions
- `estimateSpeed()` in speed.ts has no unit tests yet — extracted for testability but tests deferred
- No integration test exercises the full GPS → snap → calculate → recommend → state pipeline end-to-end

## Follow-ups

- S04: Validate GPS thresholds and catch buffer on real Cahuenga Blvd walk
- Consider adding unit tests for `estimateSpeed()` if speed estimation issues arise
- S03: Render `dataSource`, `staleness`, `dataError` in glanceable UI

## Files Created/Modified

- `lib/__tests__/catch-calculator.test.ts` — 12 scenario-based tests for calculateCatch()
- `lib/__tests__/geo.test.ts` — 14 tests for haversine, snapToRoute, walkTimeSeconds
- `lib/constants.ts` — tightened GPS thresholds (50m/100m), added staleness constants (60s/120s)
- `lib/types.ts` — extended BusCatchState with dataSource, staleness, dataError
- `lib/metro-api.ts` — added source field to TripUpdateResponse and VehiclePositionResponse types
- `lib/use-bus-catch.ts` — wired dataSource mapping, staleness tracking, dataError surfacing
- `lib/speed.ts` — new: pure estimateSpeed() function and PositionRecord interface

## Forward Intelligence

### What the next slice should know
- `BusCatchState` now has `dataSource` (realtime/schedule/mock/null), `staleness` (seconds | null), and `dataError` (string | null) — S03 must render all three for failure visibility (R009)
- The `dataSource` value is null before the first successful fetch, then stays at the last known source — treat null as "loading" in UI
- `staleness` is null before first fetch, 0 immediately after success, then grows — don't show staleness indicator until first fetch completes

### What's fragile
- GPS threshold values (50m accuracy, 100m off-route) are untested on real hardware — if S04 walk test shows GPS readings being rejected too aggressively, these need to be the first things tuned
- The staleness computation depends on the 15s poll interval assumption — if poll interval changes, the 60s/120s thresholds may trigger too early or too late

### Authoritative diagnostics
- `npx vitest run` — 51 tests, all passing — any regression in catch calculator or geo will show here immediately
- Console output from `useBusCatch`: `[bus-catch] Data stale:` and `[bus-catch] Poll error:` messages are the primary runtime diagnostic signals until S03 renders the fields visually

### What assumptions changed
- Haversine distance between Universal City and Barham is ~1914m (straight line), not ~1600m (route-following distance) — tests reflect actual haversine, not walking distance
- The original 200m GPS accuracy / 500m off-route thresholds were effectively no-ops — tightening to 50m/100m is the first time these filters will actually reject readings
