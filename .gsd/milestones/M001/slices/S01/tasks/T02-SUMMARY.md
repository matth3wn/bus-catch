---
id: T02
parent: S01
milestone: M001
provides:
  - Metro API v2 fetch and parse module (lib/metro-fetchers.ts) with all exports needed by T03
  - getDayType, parseMetroTripDetail, parseScheduleResponse, parseMetroVehiclePositions parse functions
  - fetchMetroTripUpdates, fetchMetroVehiclePositions, fetchSchedulePredictions async fetch wrappers
  - VehicleInfo type export matching vehicle-positions/route.ts shape
  - METRO_API_BASE, AGENCY_ID, ROUTE_CODE constants in lib/constants.ts
key_files:
  - lib/metro-fetchers.ts
  - lib/constants.ts
key_decisions:
  - Parse functions separated from fetch functions so tests exercise parsing with fixtures (no network)
  - Schedule time conversion uses referenceDate's local timezone via setHours(0,0,0,0) for start-of-day — supports any timezone
  - Deduplication window of 60s for schedule times per stop to handle GTFS shape variants
  - VehicleInfo type defined in metro-fetchers.ts (not in types.ts) since it's specific to Metro API processing; matches existing shape in vehicle-positions/route.ts
  - Fetch functions throw on empty results (not just HTTP errors) — caller catches and falls through to next tier
patterns_established:
  - Parse functions accept unknown/unknown[] and use defensive type narrowing with optional chaining
  - Fetch functions return { data, source } on success or throw with descriptive [metro-fetchers] prefixed messages
  - Schedule-derived predictions use tripId format "schedule-{stopId}-{epochSeconds}"
  - All fetch functions use cache:"no-store" instead of next:{revalidate:0}
observability_surfaces:
  - console.error with [metro-fetchers] prefix on HTTP errors and network failures (includes URL and status code)
  - console.info with [metro-fetchers] prefix for empty real-time responses (expected off-hours)
  - Thrown errors include endpoint URL and HTTP status for caller to log
duration: 8m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Implement Metro API v2 fetchers and schedule parser

**Created `lib/metro-fetchers.ts` with parse functions for Metro API v2 trip_detail and route_stops responses, day-type classification, and async fetch wrappers — all 14 unit tests pass.**

## What Happened

Added `METRO_API_BASE`, `AGENCY_ID`, and `ROUTE_CODE` constants to `lib/constants.ts`.

Created `lib/metro-fetchers.ts` with these exports:

- **`getDayType(date)`** — classifies date as weekday/saturday/sunday using `getDay()`
- **`parseMetroTripDetail(data)`** — maps Metro API v2 trip_detail array to `BusPrediction[]`, filtering direction_id=1, extracting stop_time_updates as predictions with vehicle position
- **`parseMetroVehiclePositions(data)`** — extracts `VehicleInfo[]` from trip_detail, filtering direction_id=1 and requiring valid lat/lng
- **`parseScheduleResponse(data, referenceDate)`** — converts route_stops HH:MM:SS departure times to epoch seconds relative to referenceDate's local timezone. Handles GTFS >24:00 times by computing total seconds from start-of-day. Filters to direction_id=1, future times only, and deduplicates within 60s window per stop
- **`fetchMetroTripUpdates()`** — fetches `/LACMTA/trip_detail/route_code/222`, returns `{ predictions, source: 'metro-realtime' }`, throws on error/empty
- **`fetchMetroVehiclePositions()`** — same endpoint, returns `{ vehicles, source: 'metro-realtime' }`, throws on error/empty
- **`fetchSchedulePredictions()`** — fetches `/LACMTA/route_stops/222` with day_type param, returns `{ predictions, source: 'schedule' }`, throws on error/empty

All parse functions are independently testable without network calls. The `VehicleInfo` type matches the existing interface in `vehicle-positions/route.ts`.

## Verification

- `npx vitest run lib/__tests__/metro-fetchers.test.ts` — **14 tests pass** covering:
  - getDayType: weekday (Mon/Wed/Fri), saturday, sunday
  - parseMetroTripDetail: realistic response mapping, direction filtering, empty array, null input
  - parseScheduleResponse: HH:MM:SS conversion, future-only filtering, >24:00 GTFS times, direction filtering, empty stops
- `npx tsc --noEmit` — no type errors

### Slice verification status (intermediate — T02 of 3):
- `npx vitest run` — ❌ partial (14/25 pass)
- `lib/__tests__/metro-fetchers.test.ts` — ✅ 14/14 pass
- `app/api/metro/__tests__/trip-updates.test.ts` — ❌ 0/6 pass (expected: route handlers don't include `source` field yet — T03 wires fallback chain)
- `app/api/metro/__tests__/vehicle-positions.test.ts` — ❌ 0/5 pass (expected: same reason)

## Diagnostics

Import and call parse functions with sample data to verify behavior:
```ts
import { parseMetroTripDetail, parseScheduleResponse, getDayType } from "@/lib/metro-fetchers";
```

Console output uses `[metro-fetchers]` prefix for grep-ability. Fetch function errors include the endpoint URL and HTTP status code.

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `lib/constants.ts` — added METRO_API_BASE, AGENCY_ID, ROUTE_CODE constants
- `lib/metro-fetchers.ts` — new: complete Metro API v2 fetch/parse module with VehicleInfo type
