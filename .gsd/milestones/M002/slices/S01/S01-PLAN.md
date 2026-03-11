# S01: Direction-Aware Data Layer

**Goal:** Northbound route data exists, direction detection classifies heading from GPS history, API routes and parse functions accept direction parameter, and catch calculator works for northbound scenarios.
**Demo:** Unit tests pass for direction detection, northbound catch calculator, and direction-filtered API responses. `curl /api/metro/trip-updates?direction=0` returns northbound-filtered data.

## Must-Haves

- Northbound polyline (reversed southbound) and 7 northbound stops with computed route distances
- `getRouteData(direction)` accessor returning correct route/stops for either direction
- `detectDirection(positionHistory)` pure function returning 'northbound' | 'southbound' | null
- Metro fetcher parse functions parameterized by direction (not hardcoded DIRECTION_ID)
- API routes accept `?direction=0|1` query param, default to 1 (southbound) for backward compatibility
- Swiftly tier in API routes also filters by direction param
- Unit tests for direction detection (northbound walk, southbound walk, stationary, ambiguous)
- Unit tests for northbound catch calculator scenarios
- All existing 51 tests still pass (no regression)

## Proof Level

- This slice proves: contract
- Real runtime required: no (unit tests and curl check sufficient)
- Human/UAT required: no

## Verification

- `npx vitest run` — all existing tests pass + new tests for direction detection and northbound calculator
- `npm run build` — zero type errors
- `curl localhost:3000/api/metro/trip-updates?direction=0` — returns predictions (mock/schedule) with source field
- `curl localhost:3000/api/metro/trip-updates` — returns southbound predictions (backward compatible)

## Observability / Diagnostics

- Runtime signals: console.info with direction parameter in API route logging
- Inspection surfaces: API response unchanged shape, direction inferred from query param
- Failure visibility: direction detection returns null when ambiguous (not a random guess)
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: M001 codebase (route-data.ts, constants.ts, metro-fetchers.ts, catch-calculator.ts, API routes)
- New wiring introduced in this slice: direction parameter threading through parse functions and API routes; new route data module exports
- What remains before the milestone is truly usable end-to-end: S02 (wire direction detection into useBusCatch hook and UI), S03 (deploy)

## Tasks

- [ ] **T01: Northbound route data and direction detection** `est:25m`
  - Why: Foundation — northbound polyline, stops, and direction classification needed by everything else
  - Files: `lib/route-data.ts`, `lib/direction.ts`, `lib/constants.ts`, `lib/__tests__/direction.test.ts`
  - Do: Add NORTHBOUND_STOPS array (7 stops from Metro API data, ordered south→north for walking direction). Reverse WALKING_ROUTE to create NORTHBOUND_WALKING_ROUTE. Add `getRouteData(direction)` accessor. Add NORTHBOUND_DIRECTION_ID=0 to constants. Create `lib/direction.ts` with `detectDirection()` that computes bearing from recent GPS positions. Write tests for direction detection covering: clear northbound heading, clear southbound heading, stationary (null), too few samples (null), noisy but net-northbound.
  - Verify: `npx vitest run` — new direction tests pass, existing tests unbroken
  - Done when: `getRouteData(0)` returns northbound data, `getRouteData(1)` returns southbound, `detectDirection` correctly classifies GPS tracks

- [ ] **T02: Parameterize fetchers and API routes by direction** `est:25m`
  - Why: Metro fetchers and API routes hardcode DIRECTION_ID=1. Need to accept direction parameter so northbound data flows through.
  - Files: `lib/metro-fetchers.ts`, `app/api/metro/trip-updates/route.ts`, `app/api/metro/vehicle-positions/route.ts`, `lib/__tests__/metro-fetchers.test.ts`, `app/api/metro/__tests__/trip-updates.test.ts`, `app/api/metro/__tests__/vehicle-positions.test.ts`
  - Do: Add `directionId` parameter to `parseMetroTripDetail`, `parseMetroVehiclePositions`, `parseScheduleResponse`, and all `fetch*` functions (default=1 for backward compat). Update API routes to read `?direction=` from URL search params (default 1). Update Swiftly tier parsing to use direction param. Update existing tests to pass direction explicitly. Add at least one test per parse function with direction=0.
  - Verify: `npx vitest run` — all tests pass. `npm run build` — clean.
  - Done when: Parse functions filter by passed direction, API routes accept direction query param, all tests green

- [ ] **T03: Northbound catch calculator tests and geo parameterization** `est:15m`
  - Why: Catch calculator and geo.snapToRoute use hardcoded WALKING_ROUTE/STOPS. Need to accept route data for northbound scenarios. Need tests proving calculator works for northbound walks.
  - Files: `lib/catch-calculator.ts`, `lib/geo.ts`, `lib/__tests__/catch-calculator.test.ts`, `lib/__tests__/geo.test.ts`
  - Do: Add optional `route`/`stops` parameters to `snapToRoute` and `calculateCatch` (default to existing southbound for backward compat). Add northbound test scenarios to catch-calculator.test.ts (walk north from Lakeridge toward station, bus coming northbound). Add geo test for snapping to northbound route.
  - Verify: `npx vitest run` — all tests pass including new northbound scenarios
  - Done when: Calculator produces correct recommendations for northbound walk, snapToRoute works with northbound polyline

## Files Likely Touched

- `lib/route-data.ts` — northbound polyline + stops + accessor
- `lib/direction.ts` — new: direction detection
- `lib/constants.ts` — NORTHBOUND_DIRECTION_ID
- `lib/metro-fetchers.ts` — direction parameter on parse/fetch functions
- `lib/catch-calculator.ts` — optional stops parameter
- `lib/geo.ts` — optional route parameter on snapToRoute
- `app/api/metro/trip-updates/route.ts` — direction query param
- `app/api/metro/vehicle-positions/route.ts` — direction query param
- `lib/__tests__/direction.test.ts` — new: direction detection tests
- `lib/__tests__/catch-calculator.test.ts` — northbound scenarios
- `lib/__tests__/geo.test.ts` — northbound snap test
- `lib/__tests__/metro-fetchers.test.ts` — direction param tests
- `app/api/metro/__tests__/trip-updates.test.ts` — direction param tests
- `app/api/metro/__tests__/vehicle-positions.test.ts` — direction param tests
