---
estimated_steps: 5
estimated_files: 2
---

# T01: Unit tests for catch calculator and geo functions

**Slice:** S02 — GPS & Calculation Reliability
**Milestone:** M001

## Description

Write comprehensive unit tests for the two pure-function modules that form the core of the catch calculation pipeline: `catch-calculator.ts` and `geo.ts`. These functions have zero test coverage today. Tests use real route data (no mocking) and cover the 9 scenarios identified in S02 research plus geo edge cases. All tests should pass against the current code — these are characterization tests that define correct behavior as a baseline.

## Steps

1. Create `lib/__tests__/catch-calculator.test.ts` with test helpers: a `makePrediction()` factory that creates `BusPrediction` objects for a given stop ID and arrival time, and a `makeUser()` factory that creates `UserPosition` objects at a given route distance with optional speed override. Use real stop IDs and route distances from `STOPS` in `route-data.ts`.

2. Write catch calculator test scenarios (each as its own `it()` block):
   - **No GPS (null user):** Returns `NO_DATA` with "Waiting for GPS..." reason, all stops not catchable
   - **No predictions (empty array):** Returns `NO_DATA` with "No bus predictions" reason, walk times still calculated
   - **All predictions in past:** Returns `KEEP_WALKING` — past predictions filtered out (busSeconds ≤ 0)
   - **Start of walk, bus 5min out:** User at routeDist=0, bus 300s at all stops → `WAIT` at Lankershim (nearest catchable)
   - **Mid-walk, bus 5min out:** User at routeDist=1100, bus 300s at all stops → `KEEP_WALKING` (margin < 90s buffer)
   - **At a stop, bus 3.5min:** User at routeDist=70 (near Lankershim), bus 200s → `WAIT` with "Wait here" phrasing
   - **Past all stops:** User at routeDist=2500, any predictions → `KEEP_WALKING` (all stops behind)
   - **Fast walker (2.0 m/s):** User at routeDist=600, realistic per-stop predictions → reaches more stops, `WAIT` at Broadlawn
   - **Slow walker (0.8 m/s):** Same position but slower → fewer stops catchable, `KEEP_WALKING`

3. Write additional catch calculator edge case tests:
   - **Only one stop has a prediction:** Other stops show `busSeconds: null`, only the predicted stop can be catchable
   - **Bus arriving at stop behind user:** Stop behind user is skipped (routeDistance ≤ user routeDistance)
   - **Multiple buses at same stop:** Earliest arrival used (array sorting)

4. Create `lib/__tests__/geo.test.ts` with tests for all three exported functions:
   - **`haversine()`:** Known distance between Universal City station (34.139, -118.363) and Cahuenga/Barham (34.128, -118.347) — expect ~1600m ±50m. Also test zero distance (same point) and very short distance (<10m).
   - **`snapToRoute()`:** Point directly on route → offRouteDistance ≈ 0. Point 50m off route → offRouteDistance ≈ 50m. Point at route start → routeDistance ≈ 0. Point at route end → routeDistance ≈ TOTAL_ROUTE_DISTANCE. Point far off route → still snaps to nearest segment.
   - **`walkTimeSeconds()`:** Normal case (1000m at 1.4 m/s ≈ 714s). Behind user (toDistance < fromDistance → 0). Zero speed guard if applicable.

5. Run `npx vitest run` and confirm all new tests pass alongside existing 25 tests.

## Must-Haves

- [ ] 9 scenario-based tests for `calculateCatch()` matching research table
- [ ] 3+ edge case tests for `calculateCatch()` 
- [ ] Tests for `haversine()` with known distances
- [ ] Tests for `snapToRoute()` with on-route, off-route, and endpoint cases
- [ ] Tests for `walkTimeSeconds()` with normal, behind-user cases
- [ ] All tests pass alongside existing 25 tests

## Verification

- `npx vitest run` — all tests pass (25 existing + 15+ new = 40+ total)
- Each scenario test asserts on both `recommendation.action` and `recommendation.reason` (or `waitStop`) to verify the full output shape

## Observability Impact

- Signals added/changed: None — these are pure function tests, no runtime changes
- How a future agent inspects this: `npx vitest run` shows pass/fail for all scenarios; test names describe the scenario being validated
- Failure state exposed: Test failure messages identify exactly which scenario broke and what the expected vs actual recommendation was

## Inputs

- `lib/catch-calculator.ts` — the pure function to test (no changes needed)
- `lib/geo.ts` — the pure functions to test (no changes needed)
- `lib/route-data.ts` — `STOPS`, `WALKING_ROUTE`, `TOTAL_ROUTE_DISTANCE` for real route distances
- `lib/constants.ts` — `CATCH_BUFFER_SECONDS`, `DEFAULT_WALKING_SPEED` for expected behavior boundaries
- S02-RESEARCH scenario analysis table — defines expected inputs and outputs for each test case

## Expected Output

- `lib/__tests__/catch-calculator.test.ts` — 12+ test cases covering all research scenarios plus edge cases
- `lib/__tests__/geo.test.ts` — 8+ test cases for haversine, snapToRoute, walkTimeSeconds
- All tests passing: `npx vitest run` shows 40+ tests total, 0 failures
