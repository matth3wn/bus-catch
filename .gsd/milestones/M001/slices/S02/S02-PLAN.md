# S02: GPS & Calculation Reliability

**Goal:** Catch calculator produces correct recommendations for known scenarios, GPS handling rejects noise, and failure states (stale data, GPS denied, off-route) are detected and surfaced in `BusCatchState` for S03 to render.
**Demo:** `npx vitest run` passes all new tests covering catch calculator scenarios, geo functions, GPS threshold rejection, staleness detection, and `source` field propagation. `BusCatchState` exposes `dataSource`, `staleness`, and `dataError` fields consumed by S03.

## Must-Haves

- Unit tests for `calculateCatch()` covering: normal walk, mid-walk, at-stop, past-all-stops, no-GPS, no-predictions, past-predictions, fast-walker, slow-walker scenarios
- Unit tests for `geo.ts` covering: `haversine()`, `snapToRoute()`, `walkTimeSeconds()` with edge cases
- `MAX_GPS_ACCURACY` tightened to 50m, `MAX_OFF_ROUTE_DISTANCE` tightened to 100m
- `metro-api.ts` updated to pass `source` field from API responses through to callers
- `BusCatchState` type extended with `dataSource`, `staleness`, `dataError` fields
- `useBusCatch` hook wires `source` → `dataSource`, tracks staleness, surfaces errors
- Staleness detection: >60s since last API response marks data stale, >120s surfaces error

## Proof Level

- This slice proves: contract (pure function correctness via unit tests) + integration (state hook wiring verified by type checking and build)
- Real runtime required: no — pure function tests with synthetic inputs; hook wiring verified by `npm run build` type-checking
- Human/UAT required: no — deferred to S04 real-walk validation

## Verification

- `npx vitest run` — all tests pass (existing 25 + new catch-calculator tests + new geo tests)
- `npm run build` — succeeds with zero type errors (proves `BusCatchState` extensions compile through the entire app)
- New test files:
  - `lib/__tests__/catch-calculator.test.ts` — scenario-based tests for `calculateCatch()`
  - `lib/__tests__/geo.test.ts` — tests for `haversine()`, `snapToRoute()`, `walkTimeSeconds()`

## Observability / Diagnostics

- Runtime signals: `BusCatchState.dataSource` exposes active data tier (`'realtime' | 'schedule' | 'mock'`); `BusCatchState.staleness` exposes seconds since last successful API response; `BusCatchState.dataError` surfaces error string when data is stale or fetch fails
- Inspection surfaces: S03 UI will render these fields; until then, `console.warn` from `useBusCatch` on staleness transitions
- Failure visibility: GPS denied → `gpsError` (existing); data stale >60s → `staleness` field populated; data stale >120s → `dataError` populated; off-route → GPS reading silently dropped (logged at debug level, thresholds tightened)
- Redaction constraints: none (no secrets in GPS or prediction data)

## Integration Closure

- Upstream surfaces consumed: `app/api/metro/trip-updates/route.ts` response `{ predictions, source }`, `app/api/metro/vehicle-positions/route.ts` response `{ vehicles, source }`
- New wiring introduced in this slice: `metro-api.ts` passes `source` through → `useBusCatch` maps `source` to `BusCatchState.dataSource`, tracks staleness, surfaces `dataError`
- What remains before the milestone is truly usable end-to-end: S03 (UI rendering of state), S04 (deployment + real-walk validation of GPS thresholds and buffer tuning)

## Tasks

- [x] **T01: Unit tests for catch calculator and geo functions** `est:30m`
  - Why: R005 and R006 have zero test coverage. These pure functions are the core logic — tests define correct behavior before any hardening changes.
  - Files: `lib/__tests__/catch-calculator.test.ts`, `lib/__tests__/geo.test.ts`
  - Do: Write scenario-based tests for `calculateCatch()` using the 9 scenarios from research (normal walk, mid-walk, at-stop, past-all-stops, no-GPS, no-predictions, past-predictions, fast-walker, slow-walker). Write tests for `haversine()` (known distances), `snapToRoute()` (on-route, off-route, endpoints), `walkTimeSeconds()` (normal, behind-user, zero-speed). Use real route data from `route-data.ts` — no mocking needed since all functions are pure.
  - Verify: `npx vitest run` — all new tests pass alongside existing 25
  - Done when: 15+ test cases covering all scenarios from research, all passing

- [x] **T02: Tighten GPS thresholds and wire source/staleness into BusCatchState** `est:30m` ✅
  - Why: R005 needs real-world-appropriate GPS rejection (current 200m/500m thresholds are no-ops). R009 needs `dataSource`, `staleness`, `dataError` on `BusCatchState` so S03 can render failure states. The `source` field from S01's API routes is currently discarded by `metro-api.ts`.
  - Files: `lib/constants.ts`, `lib/types.ts`, `lib/metro-api.ts`, `lib/use-bus-catch.ts`
  - Do: (1) Tighten `MAX_GPS_ACCURACY` to 50m and `MAX_OFF_ROUTE_DISTANCE` to 100m in constants. (2) Add `dataSource`, `staleness`, `dataError` fields to `BusCatchState` type. (3) Update `metro-api.ts` response types and fetch functions to include `source` from API responses. (4) In `useBusCatch`: map API `source` → `dataSource`, track time since last successful fetch for `staleness`, set `dataError` when staleness >120s or fetch errors persist, add `console.warn` on staleness transitions. (5) Extract `estimateSpeed` into a pure exported function in a new `lib/speed.ts` for future testability.
  - Verify: `npm run build` — zero type errors. `npx vitest run` — all tests still pass (existing + T01 tests). Manual inspection: `BusCatchState` type has all three new fields.
  - Done when: `BusCatchState` has `dataSource`, `staleness`, `dataError` fields; `metro-api.ts` passes `source` through; GPS thresholds tightened; build succeeds

## Files Likely Touched

- `lib/__tests__/catch-calculator.test.ts` (new)
- `lib/__tests__/geo.test.ts` (new)
- `lib/constants.ts` (modify thresholds)
- `lib/types.ts` (extend `BusCatchState`)
- `lib/metro-api.ts` (add `source` to response types and passthrough)
- `lib/use-bus-catch.ts` (wire `dataSource`, `staleness`, `dataError`)
- `lib/speed.ts` (new — extracted `estimateSpeed` pure function)
