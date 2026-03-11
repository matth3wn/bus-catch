---
id: T02
parent: S02
milestone: M001
provides:
  - BusCatchState with dataSource, staleness, dataError fields — S03 boundary contract
  - Tightened GPS thresholds (50m accuracy, 100m off-route) for real-world noise rejection
  - metro-api.ts types pass source field through to callers
  - Pure estimateSpeed() function extracted to lib/speed.ts
  - Staleness detection with console.warn on transitions
key_files:
  - lib/constants.ts
  - lib/types.ts
  - lib/metro-api.ts
  - lib/use-bus-catch.ts
  - lib/speed.ts
key_decisions:
  - mapDataSource maps metro-realtime and swiftly both to 'realtime' — downstream consumers don't need to distinguish API tiers, only data quality level
  - Staleness computed on every recalculate and poll error, not on an independent timer — avoids extra setInterval overhead
  - dataError from staleness only overwrites if actively stale; fetch error takes priority when both present
patterns_established:
  - mapDataSource() pure function for API source → BusCatchState.dataSource mapping
  - lastSuccessfulFetch ref + computeStaleness() pattern for tracking data freshness
  - estimateSpeed as pure function in lib/speed.ts — position history, timestamp, window as inputs
observability_surfaces:
  - BusCatchState.dataSource — active data tier (realtime/schedule/mock/null)
  - BusCatchState.staleness — seconds since last successful fetch
  - BusCatchState.dataError — error message on stale data (>120s) or fetch failure
  - console.warn('[bus-catch] Data stale: Xs since last update') on staleness transition
  - console.error('[bus-catch] Poll error: ...') on fetch failures
duration: 12m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Tighten GPS thresholds and wire source/staleness into BusCatchState

**Tightened GPS accuracy to 50m/100m, added dataSource/staleness/dataError to BusCatchState, wired API source passthrough, and extracted estimateSpeed to lib/speed.ts.**

## What Happened

Five changes delivered in one pass:

1. **GPS thresholds tightened** in `lib/constants.ts`: `MAX_GPS_ACCURACY` 200→50, `MAX_OFF_ROUTE_DISTANCE` 500→100. Added `STALENESS_WARNING_SECONDS=60` and `STALENESS_ERROR_SECONDS=120`.

2. **BusCatchState extended** in `lib/types.ts` with three new fields: `dataSource: 'realtime' | 'schedule' | 'mock' | null`, `staleness: number | null`, `dataError: string | null`.

3. **metro-api.ts response types updated**: Both `TripUpdateResponse` and `VehiclePositionResponse` now include `source: string`. The JSON already contained this field from S01 — types now expose it to callers.

4. **useBusCatch wired up**: `mapDataSource()` maps API source strings to the simplified `dataSource` enum. `lastSuccessfulFetch` ref tracks when data was last received. `computeStaleness()` calculates freshness on every recalculate and error. On successful poll: `dataError` cleared, `staleness` reset to 0, `dataSource` set. On poll error: `dataError` set to error message, staleness computed. On staleness >120s: `dataError` set with human-readable message. `console.warn` fires on staleness transition (>60s).

5. **estimateSpeed extracted** to `lib/speed.ts` as a pure function taking `(history, now, window)` — replaces the inline closure in useBusCatch. `PositionRecord` interface exported from this module.

## Verification

- `npm run build` — zero type errors, all routes compile ✓
- `npx vitest run` — 51 tests pass (14 geo + 12 catch-calculator + 14 metro-fetchers + 5 vehicle-positions + 6 trip-updates) ✓
- Manual read confirms: `MAX_GPS_ACCURACY=50`, `MAX_OFF_ROUTE_DISTANCE=100` in constants ✓
- Manual read confirms: `BusCatchState` has `dataSource`, `staleness`, `dataError` ✓
- Manual read confirms: both metro-api response types include `source: string` ✓

### Slice-level verification (S02 final task):
- `npx vitest run` — all 51 tests pass ✓
- `npm run build` — succeeds with zero type errors ✓
- `lib/__tests__/catch-calculator.test.ts` — 12 scenario tests present and passing ✓
- `lib/__tests__/geo.test.ts` — 14 geo function tests present and passing ✓

## Diagnostics

- **BusCatchState.dataSource**: Check in React DevTools or read hook state. Values: `'realtime'` (metro-realtime or swiftly), `'schedule'`, `'mock'`, `null` (never fetched).
- **BusCatchState.staleness**: Seconds since last successful fetch. `null` before first fetch, `0` immediately after success, grows between polls.
- **BusCatchState.dataError**: `null` when healthy. Set to fetch error message on failure, or stale-data message when >120s since last success.
- **Console**: `[bus-catch] Data stale: Xs since last update` on warning transition. `[bus-catch] Poll error: ...` on fetch failure.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `lib/constants.ts` — tightened GPS thresholds, added staleness constants
- `lib/types.ts` — extended BusCatchState with dataSource, staleness, dataError
- `lib/metro-api.ts` — added source field to TripUpdateResponse and VehiclePositionResponse types
- `lib/use-bus-catch.ts` — wired dataSource mapping, staleness tracking, dataError surfacing; imports estimateSpeed from speed.ts
- `lib/speed.ts` — new: pure estimateSpeed() function and PositionRecord interface extracted from use-bus-catch.ts
