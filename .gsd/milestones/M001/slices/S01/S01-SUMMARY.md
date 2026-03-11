---
id: S01
parent: M001
milestone: M001
provides:
  - Three-tier fallback API for trip-updates: Swiftly → Metro API v2 real-time → schedule → mock
  - Three-tier fallback API for vehicle-positions: Swiftly → Metro API v2 real-time → mock
  - Metro API v2 fetcher module with pure parse functions and async fetch wrappers
  - Schedule parser handling GTFS >24h times, day-type detection, deduplication
  - Every API response includes `source` field indicating active data tier
  - Vitest test framework with 25 passing tests covering all fallback tiers and edge cases
requires:
  - slice: none
    provides: first slice — no upstream dependencies
affects:
  - S02
  - S03
key_files:
  - lib/metro-fetchers.ts
  - lib/constants.ts
  - app/api/metro/trip-updates/route.ts
  - app/api/metro/vehicle-positions/route.ts
  - vitest.config.ts
  - lib/__tests__/metro-fetchers.test.ts
  - app/api/metro/__tests__/trip-updates.test.ts
  - app/api/metro/__tests__/vehicle-positions.test.ts
key_decisions:
  - D006: Vitest + happy-dom for testing (fast, native ESM/TS)
  - D007: Metro API v2 JSON endpoints over raw GTFS-RT protobuf (free, no API key, no new dependency)
  - D008: API responses include `source` field for downstream observability
  - D009: Parse functions separated from fetch functions for deterministic testing
patterns_established:
  - Test files in __tests__/ dirs adjacent to code (lib/__tests__/, app/api/metro/__tests__/)
  - Fallback chain pattern: sequential try/catch with console.warn logging tier name and failure reason
  - Source tagging: every response includes `source` string for tier identification
  - Parse functions accept unknown/unknown[] with defensive type narrowing
  - Fetch functions return { data, source } on success or throw with [metro-fetchers] prefixed messages
  - Schedule-derived predictions use tripId format "schedule-{stopId}-{epochSeconds}"
observability_surfaces:
  - Response JSON `source` field exposes active data tier to any caller
  - console.warn with [trip-updates] or [vehicle-positions] prefix on each tier failure
  - console.info on successful tier selection
  - console.error with [metro-fetchers] prefix on HTTP errors (includes URL and status code)
  - console.info with [metro-fetchers] prefix for empty real-time responses (expected off-hours)
drill_down_paths:
  - .gsd/milestones/M001/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S01/tasks/T03-SUMMARY.md
duration: 28m
verification_result: passed
completed_at: 2026-03-11
---

# S01: Resilient Data Pipeline

**API routes return real bus predictions from Swiftly, Metro API v2, or static schedule — with graceful multi-tier fallback and source tagging in every response.**

## What Happened

Three tasks executed in sequence:

**T01** set up Vitest with happy-dom, configured `@/` path aliases, and wrote 25 contract tests across 3 files defining the exact behavior of the fallback pipeline — including Metro API v2 response parsing, schedule time conversion (with >24h GTFS times), day-type detection, fallback ordering in both route handlers, and `source` field presence.

**T02** created `lib/metro-fetchers.ts` with pure parse functions (`parseMetroTripDetail`, `parseScheduleResponse`, `parseMetroVehiclePositions`, `getDayType`) and async fetch wrappers (`fetchMetroTripUpdates`, `fetchMetroVehiclePositions`, `fetchSchedulePredictions`). Parse functions are independently testable without network calls. Added `METRO_API_BASE`, `AGENCY_ID`, `ROUTE_CODE` constants to `lib/constants.ts`.

**T03** rewired both API route handlers with complete fallback chains. `trip-updates` has 4 tiers (Swiftly → Metro real-time → schedule → mock), `vehicle-positions` has 3 tiers (Swiftly → Metro real-time → mock). Each tier catches its own errors and logs the failure before falling through. Every response includes a `source` field.

No test modifications were needed after implementation — T01's contract tests matched the implementation exactly.

## Verification

- `npx vitest run` — **25/25 tests pass** (14 unit + 6 trip-updates integration + 5 vehicle-positions integration)
- `npm run build` — succeeds with zero errors
- `curl localhost:3000/api/metro/trip-updates` — returns `{ predictions: [...], source: "mock" }` (mock because off-hours with no Swiftly key)
- `curl localhost:3000/api/metro/vehicle-positions` — returns `{ vehicles: [...], source: "mock" }`
- Server logs show structured fallback transitions with tier names and failure reasons

## Requirements Advanced

- R003 (Real-time bus predictions) — API routes now fetch and parse Metro API v2 real-time trip_detail responses for Route 222 southbound, mapped to `BusPrediction[]`. Integration proven by 25 passing tests with realistic fixtures.
- R004 (Dual API support) — Three-tier fallback chain (Swiftly → Metro API v2 → mock) implemented and tested. Expanded beyond original "dual" spec to include Metro API v2 as a middle tier.
- R007 (Schedule-based fallback) — Schedule parser fetches `route_stops/222` with day-type detection, converts HH:MM:SS times (including >24:00 GTFS convention) to epoch timestamps, filters future-only predictions. Integrated as third tier in trip-updates fallback chain.

## Requirements Validated

- none — R003, R004, R007 are advanced but not yet validated. Full validation requires S02 (catch calculator consuming real predictions) and live Metro API confirmation with real-time bus data during service hours.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- R004 re-scoped: Originally described as "Swiftly + public GTFS-RT" dual support. Actual implementation uses Metro API v2 JSON REST endpoints instead of raw GTFS-RT protobuf (D007). The requirement intent (multiple API sources with graceful degradation) is satisfied, but the specific "public GTFS-RT" mechanism changed. Updated notes should reflect Metro API v2 as the public fallback.

## Deviations

None. All three tasks executed per plan with no deviations or test modifications needed.

## Known Limitations

- Metro API v2 real-time data only available during service hours — off-hours returns empty arrays (handled gracefully, falls to schedule/mock)
- Schedule endpoint response structure is inferred from research and test fixtures; not yet confirmed against live `route_stops/222` response during service hours
- Vehicle positions have no schedule equivalent — when Metro real-time has no data, positions fall directly to mock
- Swiftly tier parsing lives in route files (not metro-fetchers.ts) since it uses GTFS-RT format vs Metro API v2 format

## Follow-ups

- none — all work deferred to S02+ is already captured in the roadmap

## Files Created/Modified

- `package.json` — added vitest, happy-dom devDependencies; added `test` script
- `vitest.config.ts` — new: Vitest config with @/ path alias and happy-dom environment
- `lib/constants.ts` — added METRO_API_BASE, AGENCY_ID, ROUTE_CODE constants
- `lib/metro-fetchers.ts` — new: Metro API v2 fetch/parse module with VehicleInfo type
- `lib/__tests__/metro-fetchers.test.ts` — new: 14 unit tests for Metro API v2 parsing
- `app/api/metro/__tests__/trip-updates.test.ts` — new: 6 integration tests for trip-updates fallback chain
- `app/api/metro/__tests__/vehicle-positions.test.ts` — new: 5 integration tests for vehicle-positions fallback chain
- `app/api/metro/trip-updates/route.ts` — refactored with 4-tier fallback chain, source tagging, structured logging
- `app/api/metro/vehicle-positions/route.ts` — refactored with 3-tier fallback chain, source tagging, structured logging

## Forward Intelligence

### What the next slice should know
- API routes return `{ predictions: BusPrediction[], source: string }` and `{ vehicles: VehicleInfo[], source: string }` — the `source` field is always present and is one of `'swiftly' | 'metro-realtime' | 'schedule' | 'mock'`
- The existing `useBusCatch` hook fetches from these routes but does not yet use the `source` field — S02 needs to wire `source` into `BusCatchState.dataSource`
- `lib/metro-fetchers.ts` exports both parse functions (for testing) and fetch functions (for route handlers) — S02 can import parse functions if it needs to unit test with custom fixtures

### What's fragile
- Schedule endpoint shape (`route_stops/222`) is based on research, not confirmed live response — if Metro changes the format, `parseScheduleResponse` will need updating. The parse function uses defensive optional chaining so it won't crash, but it may return empty arrays.
- Deduplication window of 60s for schedule times is a heuristic for GTFS shape variants — may need tuning with real data.

### Authoritative diagnostics
- `curl localhost:3000/api/metro/trip-updates` and check the `source` field — immediately shows which tier is active
- Server logs with `[trip-updates]` / `[vehicle-positions]` / `[metro-fetchers]` prefixes show the full fallback path
- `npx vitest run` exercises all tiers with mocked fetch — 25 tests confirm the contract

### What assumptions changed
- Original plan assumed "public GTFS-RT" (protobuf) — actual implementation uses Metro API v2 JSON REST endpoints, which are simpler (no protobuf dependency) and provide the same data
