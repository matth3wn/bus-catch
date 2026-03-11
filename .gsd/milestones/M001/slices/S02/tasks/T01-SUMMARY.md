---
id: T01
parent: S02
milestone: M001
provides:
  - Characterization tests for calculateCatch() covering 9 research scenarios + 3 edge cases
  - Unit tests for haversine(), snapToRoute(), walkTimeSeconds() geo functions
key_files:
  - lib/__tests__/catch-calculator.test.ts
  - lib/__tests__/geo.test.ts
key_decisions:
  - Used real route data (STOPS, WALKING_ROUTE) instead of mocking — tests validate against actual computed route distances
  - Fixed epoch NOW constant for deterministic prediction construction
patterns_established:
  - makePrediction/makeUser factory helpers for constructing test inputs from real stop IDs
  - Scenario-based test naming matching research table rows
observability_surfaces:
  - none — pure function tests, no runtime changes
duration: 1 task
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Unit tests for catch calculator and geo functions

**Added 26 unit tests (12 catch-calculator, 14 geo) covering all 9 research scenarios, 3 edge cases, and full geo function coverage.**

## What Happened

Created two test files for the pure-function modules at the core of the catch calculation pipeline. All tests use real route data from `route-data.ts` (no mocking) and are characterization tests defining correct behavior as a baseline.

**catch-calculator.test.ts (12 tests):**
- 9 scenario tests matching the S02-RESEARCH analysis table: no GPS, no predictions, all-past predictions, start of walk, mid-walk, at a stop, past all stops, fast walker, slow walker
- 3 edge cases: single-stop prediction, bus at stop behind user, multiple buses at same stop (earliest used)
- Each scenario asserts on `recommendation.action`, `recommendation.reason` or `waitStop`, and `catchable` state

**geo.test.ts (14 tests):**
- haversine: known distance (~1914m Universal City↔Barham), zero distance, short distance, symmetry
- snapToRoute (6 tests): on-route point, off-route point, route start, route end, far-off-route, monotonicity
- walkTimeSeconds (4 tests): normal case, behind-user, same position, speed proportionality

## Verification

- `npx vitest run` — **51 tests pass** (12 catch-calculator + 14 geo + 25 existing), 0 failures
- `npm run build` — succeeds with zero type errors

**Slice-level verification status (T01 is intermediate):**
- ✅ `npx vitest run` — all tests pass (25 existing + 26 new = 51)
- ✅ `npm run build` — zero type errors
- ✅ `lib/__tests__/catch-calculator.test.ts` — created with scenario-based tests
- ✅ `lib/__tests__/geo.test.ts` — created with haversine/snapToRoute/walkTimeSeconds tests

## Diagnostics

`npx vitest run` shows pass/fail for all scenarios. Test names describe the scenario being validated. Failure messages identify expected vs actual recommendation action/reason.

## Deviations

- Haversine known-distance test: research said ~1600m but actual haversine (straight line) is ~1914m. The 1600m was likely a route-distance estimate. Adjusted test expectation to match real haversine output (1800-2000m range).
- Off-route snap test: initial 0.0006° longitude offset only produced ~17m off-route distance due to route segment angles. Increased to 0.002° offset (~184m) and widened assertion range (50-250m).

## Known Issues

None.

## Files Created/Modified

- `lib/__tests__/catch-calculator.test.ts` — 12 tests covering 9 research scenarios + 3 edge cases for calculateCatch()
- `lib/__tests__/geo.test.ts` — 14 tests for haversine, snapToRoute, walkTimeSeconds
