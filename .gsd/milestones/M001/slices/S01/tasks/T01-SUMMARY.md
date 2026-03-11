---
id: T01
parent: S01
milestone: M001
provides:
  - Vitest test framework configured with path aliases and happy-dom
  - Contract test files defining fallback pipeline behavior for T02/T03
key_files:
  - vitest.config.ts
  - lib/__tests__/metro-fetchers.test.ts
  - app/api/metro/__tests__/trip-updates.test.ts
  - app/api/metro/__tests__/vehicle-positions.test.ts
key_decisions:
  - Used vitest globals:true for cleaner test syntax (no explicit imports needed in future tests)
  - Test fixtures model Metro API v2 trip_detail as array of trip objects with direction_id, vehicle, stop_time_updates — matching research findings
  - Schedule fixtures model route_stops as {direction_id, stops: [{stop_id, departure_times}]} structure
  - Integration tests import GET handler directly and mock global fetch, rather than spinning up a test server
patterns_established:
  - Test files live in __tests__/ dirs adjacent to the code they test
  - Unit tests in lib/__tests__/, integration tests in app/api/metro/__tests__/
  - parseMetroTripDetail, parseScheduleResponse, getDayType are the exported function names from lib/metro-fetchers.ts
  - Schedule-derived predictions use tripId format "schedule-{stopId}-{time}"
observability_surfaces:
  - npx vitest run shows test names and pass/fail status
duration: 10m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Set up Vitest and write failing contract tests for the fallback pipeline

**Installed Vitest with happy-dom, configured path aliases, and created 3 test files (11 tests total) defining the exact contract for the Metro API v2 fallback pipeline.**

## What Happened

Installed vitest and happy-dom as dev dependencies. Created `vitest.config.ts` with `@/` path alias resolution matching tsconfig.json and happy-dom as the test environment. Added `test` script to package.json.

Created three test files:

1. **`lib/__tests__/metro-fetchers.test.ts`** (10 tests) — Unit tests for `getDayType()` (weekday/saturday/sunday detection), `parseMetroTripDetail()` (Metro API v2 trip_detail → BusPrediction[], empty/null handling, direction filtering), and `parseScheduleResponse()` (HH:MM:SS → epoch conversion, >24h GTFS times like 25:15:00, future-only filtering, direction_id filtering, empty stops).

2. **`app/api/metro/__tests__/trip-updates.test.ts`** (6 tests) — Integration tests for the trip-updates route: source field always present, Swiftly success returns `source:'swiftly'`, missing key falls to `source:'metro-realtime'`, empty Metro falls to `source:'schedule'`, all tiers fail returns `source:'mock'`, Swiftly 401 falls through to Metro.

3. **`app/api/metro/__tests__/vehicle-positions.test.ts`** (5 tests) — Integration tests for vehicle-positions route: source field always present, Swiftly success, missing key falls to Metro, all fail returns mock, Swiftly 403 falls to Metro (no schedule tier for positions).

Test fixtures use realistic Metro API v2 response shapes derived from S01-RESEARCH.md.

## Verification

- `npx vitest run` executes and finds all 3 test files (11 tests total)
- `lib/__tests__/metro-fetchers.test.ts` fails with `Failed to resolve import "@/lib/metro-fetchers"` — expected, module doesn't exist yet (T02 creates it)
- `app/api/metro/__tests__/trip-updates.test.ts` — 6 tests fail with assertion errors (no `source` field yet — T03 adds it)
- `app/api/metro/__tests__/vehicle-positions.test.ts` — 5 tests fail with assertion errors (no `source` field yet — T03 adds it)
- No vitest configuration errors or path resolution failures
- Path alias `@/` resolves correctly in all test files

### Slice verification status (intermediate — T01 of 3):
- `npx vitest run` — ❌ all tests fail (expected — implementation not started)
- `lib/__tests__/metro-fetchers.test.ts` — ❌ import error (T02 creates module)
- `app/api/metro/__tests__/trip-updates.test.ts` — ❌ assertion failures (T03 wires fallback)
- `app/api/metro/__tests__/vehicle-positions.test.ts` — ❌ assertion failures (T03 wires fallback)

## Diagnostics

Run `npx vitest run` to see all test names and their pass/fail status. Each test name describes the contract it enforces (e.g., "falls back to schedule with source: 'schedule' when Metro real-time returns empty").

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `package.json` — added vitest, happy-dom to devDependencies; added `test` script
- `vitest.config.ts` — new: Vitest config with @/ path alias and happy-dom environment
- `lib/__tests__/metro-fetchers.test.ts` — new: 10 unit tests for Metro API v2 parsing functions
- `app/api/metro/__tests__/trip-updates.test.ts` — new: 6 integration tests for trip-updates fallback chain
- `app/api/metro/__tests__/vehicle-positions.test.ts` — new: 5 integration tests for vehicle-positions fallback chain
