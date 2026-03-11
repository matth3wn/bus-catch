# S02: GPS & Calculation Reliability — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: S02 delivers pure functions and type extensions — all correctness is provable through unit tests and type checking without running the app. Real-world GPS and runtime validation is explicitly deferred to S04.

## Preconditions

- Node.js installed with project dependencies (`npm install` completed)
- No running server required — all tests are pure function tests with no network or browser dependencies

## Smoke Test

Run `npx vitest run` — expect 51 tests passing across 5 test files with 0 failures. This confirms both existing S01 tests and new S02 tests pass together.

## Test Cases

### 1. Catch calculator scenario coverage

1. Run `npx vitest run lib/__tests__/catch-calculator.test.ts`
2. **Expected:** 12 tests pass covering: no GPS, no predictions, all-past predictions, start of walk, mid-walk, at a stop, past all stops, fast walker, slow walker, single prediction, bus behind user, duplicate stop predictions

### 2. Geo function coverage

1. Run `npx vitest run lib/__tests__/geo.test.ts`
2. **Expected:** 14 tests pass covering: haversine known distances (4), route snapping on/off route and edges (6), walk time estimation (4)

### 3. Build type safety

1. Run `npm run build`
2. **Expected:** Zero type errors. BusCatchState with dataSource/staleness/dataError compiles through the entire app including page.tsx and use-bus-catch.ts

### 4. GPS threshold constants

1. Open `lib/constants.ts`
2. **Expected:** `MAX_GPS_ACCURACY = 50`, `MAX_OFF_ROUTE_DISTANCE = 100`, `STALENESS_WARNING_SECONDS = 60`, `STALENESS_ERROR_SECONDS = 120`

### 5. BusCatchState type contract

1. Open `lib/types.ts`
2. **Expected:** `BusCatchState` includes `dataSource: 'realtime' | 'schedule' | 'mock' | null`, `staleness: number | null`, `dataError: string | null`

### 6. API source passthrough

1. Open `lib/metro-api.ts`
2. **Expected:** Both `TripUpdateResponse` and `VehiclePositionResponse` types include `source: string`

## Edge Cases

### Off-route GPS rejection

1. In `geo.test.ts`, the "far off-route" test uses a point >500m from the route
2. **Expected:** `snapToRoute()` returns `offRouteDistance` > MAX_OFF_ROUTE_DISTANCE (100m), which means the reading would be dropped by use-bus-catch

### All predictions in the past

1. In `catch-calculator.test.ts`, the "all past predictions" test passes predictions with arrival times before NOW
2. **Expected:** `calculateCatch()` returns `action: 'walk'` with reason `'no-predictions'` — stale predictions are filtered out

### No GPS position

1. In `catch-calculator.test.ts`, the "no GPS" test passes null userPosition
2. **Expected:** `calculateCatch()` returns `action: 'wait'` with reason `'no-gps'` — conservative default when position unknown

## Failure Signals

- Any test failure in `npx vitest run` — indicates regression in core logic
- Type errors in `npm run build` — indicates BusCatchState contract broken
- Missing `source` field on metro-api response types — indicates S01→S02 boundary contract broken
- GPS constants still at old values (200/500) — indicates threshold tightening was not applied

## Requirements Proved By This UAT

- R005 (Reliable GPS tracking) — Geo functions (haversine, snapToRoute, walkTimeSeconds) proven correct by 14 unit tests with real route data. GPS thresholds tightened to real-world values. Full runtime validation deferred to S04.
- R006 (Accurate catch calculations) — Calculator proven correct for 12 scenarios covering all known use cases with real stop data. Buffer tuning deferred to S04.
- R009 (Failure visibility) — BusCatchState type contract extended with dataSource/staleness/dataError, verified by build type checking. Staleness wiring verified by code inspection. UI rendering deferred to S03.

## Not Proven By This UAT

- Real-world GPS accuracy on Cahuenga Blvd (deferred to S04 real-walk test)
- Whether 50m/100m GPS thresholds are appropriate for actual urban GPS noise (S04)
- Whether CATCH_BUFFER_SECONDS=90 produces trustworthy recommendations (S04)
- Staleness detection behavior under real API conditions (S04)
- UI rendering of dataSource/staleness/dataError fields (S03)
- estimateSpeed() correctness (extracted but not unit tested)

## Notes for Tester

- All tests use real route data from `route-data.ts` (real Cahuenga Blvd stops and polyline) — no synthetic geometry
- The catch calculator tests are characterization tests defining current behavior as correct. If behavior changes intentionally, tests need updating.
- The `makePrediction` and `makeUser` helpers use a fixed epoch (`NOW = 1704067200000`) for determinism — don't confuse test timestamps with real dates
