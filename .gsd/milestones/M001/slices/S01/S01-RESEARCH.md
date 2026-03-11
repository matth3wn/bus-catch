# S01: Resilient Data Pipeline — Research

**Date:** 2026-03-11

## Summary

S01 owns R003 (real-time predictions), R004 (dual API support), and R007 (schedule fallback). The existing codebase has a Swiftly-only pipeline with mock fallback — we need to add a public GTFS-RT source and a static schedule layer.

The key discovery is that LA Metro operates a **free public REST API at `https://api.metro.net`** (no API key required) that serves GTFS-RT data as JSON. This eliminates the anticipated need for protobuf parsing entirely. The API provides both real-time trip detail (`/{agency_id}/trip_detail/route_code/{route_code}`) and static schedule data (`/{agency_id}/route_stops/{route_code}`, `/{agency_id}/route_details/{route_code}`). The route_id for 222 in the current GTFS data is `222-13172` (the codebase has `222-13196`, which may be stale — needs verification with Swiftly).

The existing API routes (`app/api/metro/trip-updates/route.ts` and `vehicle-positions/route.ts`) have clean structure with good separation between fetching and parsing. Adding the Metro API v2 as a middle tier in the fallback chain is straightforward. The schedule fallback can use the `route_stops` endpoint which returns all departure times per stop by day type — no need to download or parse the 300MB+ GTFS static zip.

## Recommendation

**Use the LA Metro API v2 (`api.metro.net`) as the public GTFS-RT source, not raw protobuf feeds.**

Implement the fallback chain in both API routes:
1. **Swiftly** (existing, if `SWIFTLY_API_KEY` is set) — JSON GTFS-RT
2. **Metro API v2** (new, no key needed) — JSON real-time data via `trip_detail` endpoint
3. **Metro API v2 static schedule** (new, no key needed) — schedule times via `route_stops` endpoint
4. **Mock** (existing, dev only) — generated predictions

This avoids adding protobuf dependencies entirely. The Metro API v2 returns JSON natively and has the exact endpoints we need. The `trip_detail/route_code/222` endpoint returns real-time vehicle positions and predictions when buses are active (returns empty array when no buses are transmitting, which is the expected trigger for schedule fallback). The `route_stops/222` endpoint returns per-stop departure times by day type, giving us schedule fallback without downloading GTFS static files.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| GTFS-RT public data | LA Metro API v2 (`api.metro.net`) | Free, no API key, JSON format, already has route-filtered endpoints |
| Schedule data for fallback | Metro API v2 `route_stops` + `route_details` endpoints | Returns departure times by stop, direction, and day type — no GTFS zip parsing needed |
| Protobuf parsing | **Not needed** | Metro API v2 serves JSON; Swiftly also serves JSON with `?format=json` |

## Existing Code and Patterns

- `app/api/metro/trip-updates/route.ts` — Swiftly GTFS-RT proxy with mock fallback. Clean structure: `GET()` → fetch → `parseResponse()`. Handles both `Authorization` and `Bearer` token formats. Filters by `ROUTE_SHORT_NAME` and `DIRECTION_ID`. Extend this with Metro API v2 fallback between Swiftly and mock.
- `app/api/metro/vehicle-positions/route.ts` — Same pattern as trip-updates. Same extension strategy.
- `lib/constants.ts` — Has `ROUTE_ID = "222-13196"` and `SWIFTLY_API_BASE`. Need to add Metro API v2 base URL. The `ROUTE_ID` value may need updating — Metro API v2 shows `222-13172` as the current route_id.
- `lib/types.ts` — `BusPrediction` type with `tripId`, `vehicleId`, `stopId`, `arrivalTime`. This interface works for all three data sources (Swiftly, Metro API v2, schedule). No changes needed.
- `lib/route-data.ts` — `STOPS` array with 8 stops, all confirmed to exist in Metro API v2 `route_stops` endpoint with matching stop IDs (30002, 15025, 9141, 9144, 9133, 9146, 9142, 552). Stop IDs are stable.
- `lib/metro-api.ts` — Client-side fetch wrappers. Thin passthrough, no changes needed since the API routes handle the fallback internally.

## Constraints

- **Metro API v2 `trip_detail` returns empty when no buses are transmitting** — This is normal off-hours behavior, not an error. The fallback chain must detect this and fall through to schedule data.
- **Route ID mismatch** — Codebase uses `ROUTE_ID = "222-13196"`, but Metro API v2 shows `222-13172`. The route_id format includes a version suffix that changes when GTFS data is updated. The `ROUTE_SHORT_NAME = "222"` is the stable identifier — continue using `routeId.includes("222")` for filtering rather than exact match.
- **Shape ID also may have changed** — `SHAPE_ID = "2220081"` in constants, Metro API v2 shows `2220081_DEC23` as a shape suffix. Not relevant for S01 but noted.
- **Schedule times are strings** (`"13:15:00"`) in Metro API v2, not Unix timestamps — need conversion to epoch seconds relative to current day for `BusPrediction.arrivalTime`.
- **Day type detection needed** — Schedule endpoint uses `weekday`, `saturday`, `sunday` day types. Need to compute from current date.
- **Next.js 16 + React 19** — API routes use the App Router pattern (`export async function GET()`). Server-side only, no client bundle impact.
- **No new dependencies** — All data sources return JSON. Standard `fetch()` is sufficient.
- **API response caching** — Both API routes currently use `next: { revalidate: 0 }` (no cache). Metro API v2 data could benefit from short caching (15s matches the existing poll interval), but keeping `revalidate: 0` is safest since the client already polls at `POLL_INTERVAL_MS = 15_000`.

## Common Pitfalls

- **Metro API v2 trip_detail response shape differs from Swiftly GTFS-RT** — Swiftly returns standard GTFS-RT JSON (`{ entity: [{ tripUpdate: { trip, stopTimeUpdate } }] }`). Metro API v2 returns a custom format (array of trip objects with `vehicle`, `trip`, `route_code` fields). Need separate parse functions, not a shared parser.
- **Schedule fallback must produce `BusPrediction[]` with same interface** — Tempting to create a separate schedule type, but downstream code (catch calculator, UI) expects `BusPrediction[]`. Convert schedule times to the same shape: generate a `tripId` like `schedule-{stopId}-{time}`, use current-day epoch for `arrivalTime`.
- **Empty `trip_detail` response vs API failure** — Both return different signals. Empty array `[]` means "no active trips" (fall through to schedule). HTTP error or timeout means "API is down" (also fall through). Don't conflate them.
- **Stale `departure_times` strings may exceed 24:00** — GTFS uses times like `25:15:00` for service past midnight. Need to handle this in schedule parsing.
- **Multiple departure times per stop** — `route_stops` returns many times per stop. Need to filter to times after "now" and take the nearest few to produce meaningful predictions.

## Open Risks

- **Metro API v2 reliability is unproven** — It's a free public API with no SLA. During testing, `trip_detail/route_code/720` (a major route) returned 0 trips at 12:56 PM on a Wednesday, which suggests the real-time data layer may be intermittent. Mitigation: the three-tier fallback chain (Swiftly → Metro API → schedule) means at least schedule data is always available.
- **Metro API v2 `trip_detail` response format is undocumented at the field level** — The OpenAPI spec shows `any` as the response schema. We'll need to probe the actual response when buses are active to understand the exact field names for arrival predictions and vehicle positions. Mitigation: test during peak hours and code defensively with optional chaining.
- **Stop departure times from `route_stops` include all trips in both shapes** — Route 222 has two shape variants (`2220079_DEC23` and `2220081_DEC23`). The departure times list includes trips for both shapes, which may double-count some time slots. Mitigation: deduplicate times that are within 1-2 minutes of each other, or use `route_details` endpoint which groups by shape.
- **ROUTE_ID drift** — `222-13196` → `222-13172` is already a concrete example of route_id changing across GTFS versions. The Swiftly feed may use a different version than Metro API v2. Mitigation: filter by `ROUTE_SHORT_NAME` ("222") and `DIRECTION_ID` (1), not by full route_id.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| GTFS Realtime | `rand/cc-polymath@discover-realtime` (27 installs) | available — low relevance, generic realtime sync |
| Next.js | shadcn-ui, zod, validated-handler skills found | available — not relevant for API data pipeline work |
| Protobuf | **not needed** — Metro API v2 serves JSON | n/a |

No directly applicable skills found. The work is standard Next.js API route logic with REST API consumption — no specialized tooling needed.

## Sources

- LA Metro API v2 is a free, public, no-auth JSON API at `https://api.metro.net` with endpoints for both real-time and static GTFS data (source: [Metro API docs](https://lacmta.github.io/metro-api-v2/docs/api))
- Metro API v2 OpenAPI spec confirms `AgencyIdEnum` is `LACMTA` or `LACMTA_Rail`, and real-time endpoints include `trip_detail`, `trip_updates`, `vehicle_positions` (source: `https://api.metro.net/openapi.json`)
- Route 222 has `route_id: "222-13172"`, `route_code: "222"`, direction 1 = Southbound, description "Sun Valley to Hollywood" (source: `https://api.metro.net/LACMTA/route_overview/222`)
- All 8 stops in `STOPS` array confirmed present in Metro API v2 with matching stop IDs and direction_id=1 (source: `https://api.metro.net/LACMTA/route_stops/222`)
- Route 222 weekday schedule shows ~150 departures per direction with ~15-30 min headways (source: `https://api.metro.net/LACMTA/route_stops/222?daytype=weekday`)
- GTFS static data hosted at `https://gitlab.com/LACMTA/gtfs_bus/raw/master/gtfs_bus.zip` (300MB+), confirmed downloadable but unnecessarily large — Metro API v2 serves the same data via REST (source: [Transitland Atlas](https://raw.githubusercontent.com/transitland/transitland-atlas/master/feeds/lacmta.gitlab.com.dmfr.json))
- `gtfs-realtime-bindings` npm package (v1.1.1) exists for protobuf parsing but is **not needed** since both Swiftly and Metro API v2 serve JSON (source: npmjs.com)
