---
id: T03
parent: S01
milestone: M001
provides:
  - Full fallback chain in trip-updates route: Swiftly → Metro real-time → schedule → mock
  - Full fallback chain in vehicle-positions route: Swiftly → Metro real-time → mock
  - Every API response includes `source` field indicating which tier provided data
key_files:
  - app/api/metro/trip-updates/route.ts
  - app/api/metro/vehicle-positions/route.ts
key_decisions:
  - Swiftly tier is skipped entirely (no fetch attempt) when SWIFTLY_API_KEY is absent, rather than attempting and failing
  - Swiftly parsing logic kept in route files (not metro-fetchers.ts) since it uses GTFS-RT format while metro-fetchers handles Metro API v2 format
patterns_established:
  - Fallback chain pattern: sequential try/catch with console.warn logging tier name and failure reason at each transition
  - Source tagging pattern: every response object includes `source` string field for tier identification
  - Key safety pattern: SWIFTLY_API_KEY presence checked with boolean, value never logged
observability_surfaces:
  - console.info with [trip-updates] or [vehicle-positions] prefix on successful tier selection
  - console.warn with [trip-updates] or [vehicle-positions] prefix on each tier failure with reason
  - Response JSON `source` field exposes active tier to callers
duration: 10min
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Wire fallback chain into API route handlers and pass all tests

**Refactored both API route handlers to implement multi-tier fallback chains with structured logging and source tagging — all 25 tests pass, build clean.**

## What Happened

Rewrote `trip-updates/route.ts` with a 4-tier fallback (Swiftly → Metro real-time → schedule → mock) and `vehicle-positions/route.ts` with a 3-tier fallback (Swiftly → Metro real-time → mock). Each handler:

1. Checks for SWIFTLY_API_KEY presence before attempting Swiftly (no wasted fetch)
2. Extracts Swiftly fetch+parse into a `trySwiftly()` helper that throws on failure
3. Calls the imported `fetchMetroTripUpdates`/`fetchMetroVehiclePositions`/`fetchSchedulePredictions` from `lib/metro-fetchers.ts`
4. Catches at each tier, logs the failure with tier name and reason, falls through
5. Returns `{ predictions/vehicles, source }` with the winning tier's tag

The existing Swiftly GTFS-RT parsing was preserved and moved into `parseSwiftlyResponse()` helpers within each route file. Mock generators were kept as final fallback with `source: 'mock'`.

No test modifications were needed — the T01 integration tests matched the implementation contract exactly.

## Verification

- `npx vitest run` — **25/25 tests pass** (14 unit, 6 trip-updates integration, 5 vehicle-positions integration)
- `npm run build` — **succeeds with zero errors**
- `curl http://localhost:3000/api/metro/trip-updates` — returns `{ predictions: [...], source: "mock" }` (mock because off-hours, no Swiftly key)
- `curl http://localhost:3000/api/metro/vehicle-positions` — returns `{ vehicles: [...], source: "mock" }`
- Server logs show full fallback chain: `[trip-updates] metro-realtime failed: ... trying next tier` → `[trip-updates] schedule failed: ... trying next tier` → `[trip-updates] All tiers failed, serving mock data`

## Diagnostics

- **curl the routes** and check the `source` field — immediately shows which tier is active
- **Server logs** show fallback path: grep for `[trip-updates]` or `[vehicle-positions]` to see tier transitions
- Each tier failure includes the upstream error message (HTTP status, network error, empty data)
- `SWIFTLY_API_KEY` value is never logged — only "not set" / "skipping" messages

## Deviations

None. T01 integration tests matched the implementation contract without modification.

## Known Issues

None.

## Files Created/Modified

- `app/api/metro/trip-updates/route.ts` — Refactored with 4-tier fallback chain (Swiftly → Metro real-time → schedule → mock), source tagging, structured logging
- `app/api/metro/vehicle-positions/route.ts` — Refactored with 3-tier fallback chain (Swiftly → Metro real-time → mock), source tagging, structured logging
