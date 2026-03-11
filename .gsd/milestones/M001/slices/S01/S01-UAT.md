# S01: Resilient Data Pipeline — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: artifact-driven
- Why this mode is sufficient: This slice implements API data-fetching and parsing logic with no user-facing UI changes. All behavior is verifiable through automated tests (25 passing) and curl commands against the API routes. No human judgment needed — correctness is objectively testable.

## Preconditions

- `npm install` has been run (vitest and happy-dom installed)
- Dev server running via `npm run dev` (for manual curl checks only — tests run standalone)

## Smoke Test

Run `npx vitest run` — all 25 tests pass across 3 test files. This confirms the entire fallback pipeline contract: parsing, schedule conversion, day-type detection, fallback ordering, and source tagging.

## Test Cases

### 1. All unit tests pass

1. Run `npx vitest run lib/__tests__/metro-fetchers.test.ts`
2. **Expected:** 14 tests pass — getDayType, parseMetroTripDetail, parseScheduleResponse, parseMetroVehiclePositions all produce correct output from fixtures

### 2. Trip-updates integration tests pass

1. Run `npx vitest run app/api/metro/__tests__/trip-updates.test.ts`
2. **Expected:** 6 tests pass — Swiftly success, Metro fallback, schedule fallback, mock fallback, Swiftly error fallthrough, source field always present

### 3. Vehicle-positions integration tests pass

1. Run `npx vitest run app/api/metro/__tests__/vehicle-positions.test.ts`
2. **Expected:** 5 tests pass — Swiftly success, Metro fallback, mock fallback, Swiftly error fallthrough, source field always present

### 4. Build succeeds

1. Run `npm run build`
2. **Expected:** Build completes with zero errors. Both API routes listed as dynamic (`ƒ`).

### 5. API routes return source field

1. Start dev server: `npm run dev`
2. Run `curl http://localhost:3000/api/metro/trip-updates`
3. **Expected:** JSON response with `predictions` array and `source` string field (value depends on time of day and API availability)
4. Run `curl http://localhost:3000/api/metro/vehicle-positions`
5. **Expected:** JSON response with `vehicles` array and `source` string field

## Edge Cases

### GTFS >24h schedule times

1. Covered by unit test: `parseScheduleResponse` correctly handles times like "25:15:00" by computing 25*3600 + 15*60 seconds from start of day
2. **Expected:** Test passes — these are valid GTFS times for after-midnight service

### Empty Metro API response

1. Covered by unit test: `parseMetroTripDetail` returns empty array for `[]` or `null` input
2. Covered by integration test: empty Metro triggers fallback to schedule tier
3. **Expected:** No crash, clean fallback

### Swiftly key absent vs Swiftly failure

1. Covered by integration tests: absent key skips Swiftly entirely (no fetch), HTTP error falls through with logged warning
2. **Expected:** Different log messages but same result — next tier is tried

## Failure Signals

- Any vitest test failure indicates a contract violation in the fallback pipeline
- `npm run build` type errors indicate interface mismatches between metro-fetchers and route handlers
- Missing `source` field in API response indicates broken source tagging
- Server console showing no `[trip-updates]` / `[vehicle-positions]` log lines indicates logging was lost

## Requirements Proved By This UAT

- R003 (Real-time bus predictions) — API routes fetch and parse Metro API v2 real-time data for Route 222 southbound, returning `BusPrediction[]`. Proven by integration tests exercising the Metro real-time tier with realistic fixtures.
- R004 (Dual API support) — Multi-tier fallback (Swiftly → Metro API v2 → mock) implemented and tested. Each tier independently tested for success and failure paths. Proven by 11 integration tests covering every fallback transition.
- R007 (Schedule-based fallback) — Schedule parser converts `route_stops` departure times to predictions with day-type detection and >24h time handling. Proven by unit tests for parsing and integration test for schedule fallback tier.

## Not Proven By This UAT

- Live Metro API v2 response shape — tests use fixtures, not live network calls. The real `trip_detail/route_code/222` and `route_stops/222` endpoints have not been confirmed during service hours.
- Swiftly tier with a real API key — no `SWIFTLY_API_KEY` available for testing; Swiftly path tested only via mocked fetch.
- Data freshness and accuracy of real-time predictions — S02 will validate that predictions produce correct catch calculations.
- End-to-end flow from API response through `useBusCatch` hook to UI — S02/S03 responsibility.

## Notes for Tester

The primary verification is `npx vitest run` — if all 25 tests pass, the slice contract is satisfied. The curl commands are supplementary and their output depends on time of day (off-hours will show `source: "mock"` because Metro has no active buses). During service hours (~5am-11pm PT), you may see `source: "metro-realtime"` or `source: "schedule"` with real prediction data.
