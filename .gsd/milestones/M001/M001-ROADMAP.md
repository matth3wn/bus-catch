# M001: Ship It

**Vision:** Take the existing Bus Catch prototype from untested code to a deployed, glanceable PWA that reliably tells the user whether to wait for the Metro 222 or keep walking — powered by real-time data with schedule fallback, validated on real walks.

## Success Criteria

- User pulls out phone mid-walk and sees a full-screen walk-or-wait answer in <1 second
- Recommendation updates as user moves along Cahuenga Blvd
- Works with Swiftly API key, public GTFS-RT feed, or schedule fallback (graceful degradation)
- Tapping the screen reveals detailed stop times and bus positions
- App is deployed, installable as PWA, and usable on a daily commute

## Key Risks / Unknowns

- **Public GTFS-RT endpoint discovery** — URL, auth, and data format for LA Metro's public feed are unconfirmed
- **Protobuf parsing** — Public feed may be protobuf-only, requiring a new dependency
- **GPS reliability on Cahuenga Blvd** — Urban canyon GPS drift, route snapping accuracy under real conditions
- **Catch buffer tuning** — 90s buffer is a guess; could be too conservative or aggressive
- **Static schedule sourcing** — Need to find and parse GTFS static data for Route 222

## Proof Strategy

- Public GTFS-RT works → retire in S01 by proving the API route returns real predictions from the public feed
- GPS tracking is reliable → retire in S02 by validating route snapping and speed estimation with real GPS coordinates
- Catch calculations are accurate → retire in S02 by proving recommendations match reality for known scenarios
- Glanceable UX works on phone → retire in S03 by proving the redesigned UI renders correctly on mobile viewport
- App works end-to-end deployed → retire in S04 by proving the full flow on a real phone from a public URL

## Verification Classes

- Contract verification: Unit tests for catch calculator, route snapping, API parsing
- Integration verification: API routes returning real GTFS-RT data, GPS + calculator producing recommendations
- Operational verification: Deployed PWA loads, updates, and degrades gracefully
- UAT / human verification: Real walk test — recommendation feels correct and trustworthy

## Milestone Definition of Done

This milestone is complete only when all are true:

- All four slice deliverables are complete and verified
- API layer supports Swiftly, public GTFS-RT, and schedule fallback
- GPS tracking and catch calculator are validated with real-world scenarios
- Glanceable UX renders correctly on mobile with tap-to-expand detail
- App is deployed to a public URL, installable as PWA
- Final acceptance: open app on phone during a walk, see correct recommendation, tap for detail

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009
- Partially covers: none
- Leaves for later: R010 (full commute integration), R011 (northbound support)
- Orphan risks: none

## Slices

- [x] **S01: Resilient Data Pipeline** `risk:high` `depends:[]`
  > After this: API routes return real bus predictions from either Swiftly or public GTFS-RT, with schedule-based fallback when neither has data. Verified by hitting the API routes and seeing real prediction payloads.

- [x] **S02: GPS & Calculation Reliability** `risk:medium` `depends:[S01]`
  > After this: Catch calculator produces correct recommendations for known test scenarios, GPS handling is robust against noise, and failure states (stale data, GPS denied, off-route) are properly detected and surfaced. Verified by unit tests and simulated walk scenarios.

- [x] **S03: Glanceable UX** `risk:medium` `depends:[S02]`
  > After this: App shows a full-screen color-coded walk-or-wait answer, with tap-to-expand detail view showing stop cards and route diagram. Verified in mobile viewport browser rendering.

- [ ] **S04: Deploy & Validate** `risk:low` `depends:[S03]`
  > After this: App is deployed to a public URL, installable as PWA on iOS/Android, with proper service worker caching. Verified by installing on a real phone and loading from home screen.

## Boundary Map

### S01 → S02

Produces:
- `app/api/metro/trip-updates/route.ts` → GET handler returning `{ predictions: BusPrediction[] }` from Swiftly, public GTFS-RT, or static schedule
- `app/api/metro/vehicle-positions/route.ts` → GET handler returning `{ vehicles: VehicleInfo[] }` from Swiftly or public GTFS-RT
- `lib/constants.ts` → PUBLIC_GTFS_RT_BASE URL constant, updated ROUTE_ID if needed
- `lib/types.ts` → `BusPrediction` type unchanged (same interface regardless of data source)
- Schedule data source (embedded or fetched) for Route 222 southbound stop times

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- Same API contract as S01→S02 (UI consumes predictions through existing `useBusCatch` hook)

### S02 → S03

Produces:
- `lib/catch-calculator.ts` → `calculateCatch()` with validated buffer constant, same interface
- `lib/use-bus-catch.ts` → `BusCatchState` with new fields: `dataSource: 'realtime' | 'schedule' | 'mock'`, `staleness: number | null`, `dataError: string | null`
- `lib/geo.ts` → `snapToRoute()` with validated accuracy thresholds
- `lib/constants.ts` → Tuned CATCH_BUFFER_SECONDS, MAX_GPS_ACCURACY, MAX_OFF_ROUTE_DISTANCE

Consumes from S01:
- API routes returning real predictions (or schedule fallback) in `BusPrediction[]` format

### S02 → S04

Produces:
- Validated, reliable state hook that S04 can trust during deployment testing

### S03 → S04

Produces:
- `app/page.tsx` → Redesigned glanceable UI with tap-to-expand
- `components/` → Updated/new components for full-screen recommendation + expandable detail
- `app/globals.css` → Any animation/transition styles for expand gesture
- `app/manifest.ts` → Updated if icon/theme changes needed

Consumes from S02:
- `BusCatchState` with `dataSource`, `staleness`, `dataError` fields for failure visibility
- Validated `calculateCatch()` producing trustworthy recommendations
