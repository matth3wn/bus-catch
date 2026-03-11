# S01: Resilient Data Pipeline

**Goal:** API routes return real bus predictions from Swiftly, Metro API v2, or static schedule — with graceful fallback across all three tiers.
**Demo:** `curl localhost:3000/api/metro/trip-updates` returns `BusPrediction[]` from the first available data source (Swiftly → Metro API v2 → schedule). Same for vehicle-positions. Response includes a `source` field indicating which tier provided the data.

## Must-Haves

- Three-tier fallback chain in trip-updates: Swiftly → Metro API v2 real-time → Metro API v2 schedule → mock (dev only)
- Three-tier fallback chain in vehicle-positions: Swiftly → Metro API v2 real-time → mock (dev only, no schedule equivalent for positions)
- Metro API v2 real-time parsing: `trip_detail/route_code/222` response mapped to `BusPrediction[]`
- Schedule fallback: `route_stops/222` departure times converted to `BusPrediction[]` for today
- Response `source` field: `'swiftly' | 'metro-realtime' | 'schedule' | 'mock'` so downstream consumers know data quality
- Filtering by route 222 southbound (direction_id=1) at every tier
- Handle GTFS 25:00:00+ times in schedule parsing
- Day type detection (weekday/saturday/sunday) for schedule endpoint
- No new npm dependencies — standard fetch only
- Tests covering each fallback tier and edge cases

## Proof Level

- This slice proves: integration
- Real runtime required: yes — tests hit the real Metro API v2 to confirm response shape, with mocked variants for determinism
- Human/UAT required: no

## Verification

- `npx vitest run` — all tests pass
- `lib/__tests__/metro-fetchers.test.ts` — unit tests for Metro API v2 parsing, schedule conversion, fallback ordering, edge cases (empty responses, >24h times, day type detection)
- `app/api/metro/__tests__/trip-updates.test.ts` — integration test for the trip-updates route GET handler exercising each fallback tier
- `app/api/metro/__tests__/vehicle-positions.test.ts` — integration test for the vehicle-positions route GET handler exercising each fallback tier
- Manual verification: `curl http://localhost:3000/api/metro/trip-updates` returns predictions with a `source` field

## Observability / Diagnostics

- Runtime signals: Each API route logs which data source was used and why fallback occurred (e.g., `[trip-updates] Swiftly failed (401), trying Metro API v2`). Structured as `console.warn` with prefix tag for grep-ability.
- Inspection surfaces: Response JSON includes `source` field indicating active data tier. Future agents can `curl` the API routes to immediately see which tier is active.
- Failure visibility: Each tier logs its failure reason before falling through. If all real-time tiers fail and schedule is used, response includes `source: 'schedule'`. If even schedule fails, `source: 'mock'` (dev) or empty predictions with error field (prod).
- Redaction constraints: `SWIFTLY_API_KEY` never logged. Only key name presence/absence is logged.

## Integration Closure

- Upstream surfaces consumed: none (first slice)
- New wiring introduced in this slice: Metro API v2 fetcher module (`lib/metro-fetchers.ts`), schedule parser, updated API route handlers with fallback chain, `METRO_API_BASE` constant
- What remains before the milestone is truly usable end-to-end: S02 (catch calculator validation, GPS reliability, `dataSource` field on `BusCatchState`), S03 (glanceable UI), S04 (deployment)

## Tasks

- [x] **T01: Set up Vitest and write failing contract tests for the fallback pipeline** `est:45m`
  - Why: No test framework exists. Tests define the contract that remaining tasks must satisfy — each fallback tier, edge cases, and the `source` field.
  - Files: `package.json`, `vitest.config.ts`, `tsconfig.json`, `lib/__tests__/metro-fetchers.test.ts`, `app/api/metro/__tests__/trip-updates.test.ts`, `app/api/metro/__tests__/vehicle-positions.test.ts`
  - Do: Install vitest + happy-dom. Configure path aliases. Write tests that import the modules to be created (they will fail on import or assertion). Tests cover: Metro API v2 response parsing, schedule time conversion, >24h GTFS times, day type detection, fallback ordering in route handlers, `source` field in response.
  - Verify: `npx vitest run` exits with failures (expected — modules don't exist yet). Test file structure is valid.
  - Done when: vitest runs, finds all test files, and reports expected failures (not config errors).

- [x] **T02: Implement Metro API v2 fetchers and schedule parser** `est:1h`
  - Why: Core data-fetching module that talks to `api.metro.net`. Parses real-time `trip_detail` responses and schedule `route_stops` responses into `BusPrediction[]`. This is the main new code for the slice.
  - Files: `lib/metro-fetchers.ts`, `lib/constants.ts`, `lib/__tests__/metro-fetchers.test.ts`
  - Do: Add `METRO_API_BASE = "https://api.metro.net"` and `AGENCY_ID = "LACMTA"` to constants. Create `lib/metro-fetchers.ts` with: `fetchMetroTripUpdates()` → fetches `trip_detail/route_code/222`, filters direction_id=1, maps to `BusPrediction[]`; `fetchMetroVehiclePositions()` → fetches `trip_detail/route_code/222`, extracts vehicle positions; `fetchSchedulePredictions()` → fetches `route_stops/222` with day type param, filters to direction_id=1 and times after now, converts HH:MM:SS strings (including >24:00) to epoch timestamps, returns as `BusPrediction[]`; `getDayType(date)` → returns 'weekday'|'saturday'|'sunday'. Each function returns `{ data, source }` or throws. All filtering uses ROUTE_SHORT_NAME and DIRECTION_ID from constants.
  - Verify: `npx vitest run lib/__tests__/metro-fetchers.test.ts` — parsing tests pass with mocked responses.
  - Done when: All unit tests in `metro-fetchers.test.ts` pass. Functions correctly parse Metro API v2 response shapes, handle empty arrays, convert schedule times including >24h.

- [x] **T03: Wire fallback chain into API route handlers and pass all tests** `est:1h`
  - Why: Connects the Metro fetchers into the existing API routes, implementing the full Swiftly → Metro real-time → schedule → mock chain. Makes all integration tests pass.
  - Files: `app/api/metro/trip-updates/route.ts`, `app/api/metro/vehicle-positions/route.ts`, `app/api/metro/__tests__/trip-updates.test.ts`, `app/api/metro/__tests__/vehicle-positions.test.ts`
  - Do: Refactor both route handlers to: (1) try Swiftly if `SWIFTLY_API_KEY` is set, (2) try `fetchMetroTripUpdates()`/`fetchMetroVehiclePositions()`, (3) for trip-updates only: try `fetchSchedulePredictions()`, (4) fall back to mock. Add `source` field to every response. Log each fallback transition with tagged console.warn. Keep mock generation for dev. Ensure each tier catches its own errors and falls through cleanly.
  - Verify: `npx vitest run` — all tests pass. `npm run build` succeeds. Manual `curl` against dev server shows real data with `source` field.
  - Done when: All tests pass. Both API routes implement the complete fallback chain. Response always includes `source`. Build succeeds with no type errors.

## Files Likely Touched

- `package.json` — add vitest, happy-dom
- `vitest.config.ts` — new
- `tsconfig.json` — test include paths
- `lib/constants.ts` — METRO_API_BASE, AGENCY_ID
- `lib/metro-fetchers.ts` — new: Metro API v2 fetch + parse + schedule
- `lib/__tests__/metro-fetchers.test.ts` — new: unit tests
- `app/api/metro/trip-updates/route.ts` — refactor with fallback chain
- `app/api/metro/vehicle-positions/route.ts` — refactor with fallback chain
- `app/api/metro/__tests__/trip-updates.test.ts` — new: integration tests
- `app/api/metro/__tests__/vehicle-positions.test.ts` — new: integration tests
