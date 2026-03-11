---
estimated_steps: 5
estimated_files: 3
---

# T02: Implement Metro API v2 fetchers and schedule parser

**Slice:** S01 — Resilient Data Pipeline
**Milestone:** M001

## Description

Create the core data-fetching module `lib/metro-fetchers.ts` that talks to `api.metro.net`. This module handles two data paths: (1) real-time predictions from the `trip_detail` endpoint, and (2) schedule-based predictions from the `route_stops` endpoint. Each function fetches, filters to route 222 southbound, and returns `BusPrediction[]` in the same shape the existing code expects. Also adds the Metro API constants and a day-type utility. After this task, the unit tests from T01 should pass.

## Steps

1. Add constants to `lib/constants.ts`:
   - `METRO_API_BASE = "https://api.metro.net"`
   - `AGENCY_ID = "LACMTA"`
   - `ROUTE_CODE = "222"` (used for Metro API v2 route_code param, distinct from ROUTE_ID)
2. Create `lib/metro-fetchers.ts` with these exports:
   - `getDayType(date: Date): 'weekday' | 'saturday' | 'sunday'` — uses `getDay()` to classify
   - `parseMetroTripDetail(data: unknown[]): { predictions: BusPrediction[], vehicles: VehicleInfo[] }` — maps Metro API v2 trip_detail response to both predictions and vehicle positions. Filters by direction. Uses optional chaining for undocumented fields. Extracts `stop_time_updates` for predictions and `position` for vehicles.
   - `parseScheduleResponse(data: unknown, referenceDate: Date): BusPrediction[]` — takes `route_stops` response, filters to direction_id=1 stops matching our STOP_IDS, converts `HH:MM:SS` departure times to epoch seconds relative to referenceDate. Handles >24:00 times by adding a day's worth of seconds. Filters to times after `now`. Generates synthetic tripIds like `schedule-{stopId}-{time}`. Deduplicates times within 60s window.
   - `fetchMetroTripUpdates(): Promise<{ predictions: BusPrediction[], source: string }>` — calls `GET /LACMTA/trip_detail/route_code/222`, passes through `parseMetroTripDetail()`, returns `{ predictions, source: 'metro-realtime' }`. Throws on HTTP error or empty predictions.
   - `fetchMetroVehiclePositions(): Promise<{ vehicles: VehicleInfo[], source: string }>` — calls same endpoint, extracts vehicle positions, returns `{ vehicles, source: 'metro-realtime' }`. Throws on HTTP error or empty.
   - `fetchSchedulePredictions(): Promise<{ predictions: BusPrediction[], source: string }>` — calls `GET /LACMTA/route_stops/222`, passes day type, returns `{ predictions, source: 'schedule' }`. Throws on HTTP error or empty.
3. Ensure all parse functions are exported separately from fetch functions so tests can exercise parsing with fixtures without network calls
4. Make sure the `VehicleInfo` type matches what `vehicle-positions/route.ts` already uses (tripId, vehicleId, position: LatLng, timestamp)
5. Run `npx vitest run lib/__tests__/metro-fetchers.test.ts` and fix any failing unit tests

## Must-Haves

- [ ] `parseMetroTripDetail()` correctly maps the Metro API v2 trip_detail response shape to `BusPrediction[]` and `VehicleInfo[]`
- [ ] `parseScheduleResponse()` converts HH:MM:SS strings to epoch timestamps relative to a given date
- [ ] `parseScheduleResponse()` handles GTFS >24:00 times correctly (e.g., 25:15:00 → next day 1:15 AM)
- [ ] `parseScheduleResponse()` filters to future times only and direction_id=1
- [ ] `getDayType()` returns correct type for all 7 days of the week
- [ ] Parse functions are independently testable (no network dependency)
- [ ] Fetch functions use `METRO_API_BASE`, `AGENCY_ID`, `ROUTE_CODE` from constants

## Verification

- `npx vitest run lib/__tests__/metro-fetchers.test.ts` — all unit tests pass
- `npx tsc --noEmit` — no type errors

## Observability Impact

- Signals added/changed: Fetch functions log `[metro-fetchers]` prefixed messages on error. Empty real-time response logged as info (expected off-hours). HTTP errors logged with status code.
- How a future agent inspects this: Import and call parse functions with sample data. Check console output for `[metro-fetchers]` tags.
- Failure state exposed: Each fetch function throws with descriptive error messages including the endpoint URL and HTTP status, enabling the calling route handler to log and fall through.

## Inputs

- `lib/types.ts` — `BusPrediction`, `LatLng` types
- `lib/constants.ts` — existing constants, will be extended
- `lib/route-data.ts` — `STOPS` array for stop ID filtering
- S01-RESEARCH.md — Metro API v2 response shapes, endpoint URLs, field names
- `lib/__tests__/metro-fetchers.test.ts` — test file from T01 defining expected behavior

## Expected Output

- `lib/constants.ts` — extended with `METRO_API_BASE`, `AGENCY_ID`, `ROUTE_CODE`
- `lib/metro-fetchers.ts` — new module with all fetch/parse functions and types
- `lib/__tests__/metro-fetchers.test.ts` — all unit tests now passing
