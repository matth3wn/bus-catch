---
estimated_steps: 5
estimated_files: 6
---

# T01: Set up Vitest and write failing contract tests for the fallback pipeline

**Slice:** S01 — Resilient Data Pipeline
**Milestone:** M001

## Description

The project has no test framework. This task installs Vitest with happy-dom, configures it for the Next.js + TypeScript setup (path aliases, server-side modules), and writes all the test files for S01. The tests define the exact contract: what each function should accept and return, what each API route should respond with, and how edge cases (empty data, >24h GTFS times, day type detection) should be handled. Tests will fail initially because the implementation modules don't exist yet — that's correct and expected.

## Steps

1. Install vitest and happy-dom as dev dependencies
2. Create `vitest.config.ts` with path alias resolution matching `tsconfig.json` (`@/` → project root), and `happy-dom` as test environment
3. Update `tsconfig.json` if needed to include test files
4. Create `lib/__tests__/metro-fetchers.test.ts` with unit tests:
   - `getDayType()` returns correct day type for weekday, saturday, sunday dates
   - `parseMetroTripDetail()` maps a realistic Metro API v2 trip_detail response to `BusPrediction[]`
   - `parseMetroTripDetail()` returns empty array for empty response
   - `parseScheduleResponse()` converts `route_stops` response with HH:MM:SS times to epoch-based `BusPrediction[]`
   - `parseScheduleResponse()` handles >24:00 GTFS times (e.g., `25:15:00`)
   - `parseScheduleResponse()` filters to only future departure times
   - `parseScheduleResponse()` filters by direction_id=1 (southbound)
5. Create `app/api/metro/__tests__/trip-updates.test.ts` with integration tests:
   - Returns predictions with `source: 'swiftly'` when Swiftly succeeds
   - Falls back to Metro API v2 with `source: 'metro-realtime'` when Swiftly key missing
   - Falls back to schedule with `source: 'schedule'` when Metro real-time returns empty
   - Falls back to mock with `source: 'mock'` when all tiers fail (no API key, mocked fetch failures)
   - Response always contains `predictions` array and `source` string
6. Create `app/api/metro/__tests__/vehicle-positions.test.ts` with integration tests:
   - Returns vehicles with `source: 'swiftly'` when Swiftly succeeds
   - Falls back to Metro API v2 with `source: 'metro-realtime'` when Swiftly key missing
   - Falls back to mock with `source: 'mock'` when Metro real-time fails (no schedule tier for positions)
   - Response always contains `vehicles` array and `source` string

## Must-Haves

- [ ] Vitest installed and configured with path aliases
- [ ] All three test files created with meaningful assertions (not just `expect(true)`)
- [ ] Tests reference the actual function names and module paths that T02/T03 will implement
- [ ] Test fixtures use realistic Metro API v2 response shapes (based on research)
- [ ] Edge cases covered: empty responses, >24h GTFS times, day type detection

## Verification

- `npx vitest run` executes and finds all test files
- Tests fail with import/module-not-found or assertion errors (not config errors)
- No vitest configuration errors or path resolution failures

## Observability Impact

- Signals added/changed: None (test infrastructure only)
- How a future agent inspects this: `npx vitest run` shows test names and status
- Failure state exposed: Test failure messages describe what contract is broken

## Inputs

- `lib/types.ts` — `BusPrediction`, `LatLng` types that test assertions reference
- `lib/constants.ts` — `ROUTE_SHORT_NAME`, `DIRECTION_ID` used in filtering assertions
- `lib/route-data.ts` — `STOPS` array with stop IDs used in test fixtures
- S01-RESEARCH.md — Metro API v2 response shapes and endpoint details for realistic fixtures

## Expected Output

- `package.json` — vitest and happy-dom added to devDependencies
- `vitest.config.ts` — new config file with path aliases and happy-dom environment
- `lib/__tests__/metro-fetchers.test.ts` — unit test file with ~8-10 test cases
- `app/api/metro/__tests__/trip-updates.test.ts` — integration test file with ~5 test cases
- `app/api/metro/__tests__/vehicle-positions.test.ts` — integration test file with ~4 test cases
