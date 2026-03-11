# M002: Northbound

**Vision:** Add northbound 222 support so the app works for the return commute — walking north on Cahuenga Blvd back to Universal City station. Direction is detected automatically from GPS movement; the same glanceable walk-or-wait answer appears for whichever direction the user is walking.

## Success Criteria

- Walking north on Cahuenga, the app shows northbound 222 predictions and a correct walk-or-wait recommendation
- Walking south on Cahuenga, the app continues to show southbound predictions (no regression)
- Direction switches automatically based on GPS movement without manual intervention
- Detail panel shows the correct stops and route diagram for the active direction
- Direction indicator visible in UI so the user knows which direction is active
- Deployed to production and working end-to-end

## Key Risks / Unknowns

- **Direction detection from GPS** — Need enough position samples to determine heading. Standing still, starting a walk, or GPS drift could produce ambiguous direction. Must avoid flip-flopping.
- **Northbound stop IDs correctness** — Stop IDs sourced from Metro API v2 schedule endpoint; need to confirm they match real-time trip_detail data during service hours.

## Proof Strategy

- Direction detection works → retire in S01 by proving the detection function correctly classifies northbound/southbound from simulated GPS tracks, with stable behavior at walk start
- Northbound predictions flow end-to-end → retire in S02 by proving API routes accept direction parameter and return filtered northbound predictions, catch calculator produces correct northbound recommendations

## Verification Classes

- Contract verification: Unit tests for direction detection, northbound catch calculator scenarios, API direction filtering
- Integration verification: Full pipeline (GPS → direction detect → API fetch → calculate → render) works for both directions
- Operational verification: Deployed PWA switches direction correctly, northbound data displays properly
- UAT / human verification: Walk north on Cahuenga, see correct northbound recommendation

## Milestone Definition of Done

This milestone is complete only when all are true:

- All slice deliverables are complete and verified
- Northbound route data and stops are defined and tested
- Direction detection logic handles startup, steady walking, and ambiguous states
- API routes accept direction parameter and filter correctly
- Catch calculator produces correct recommendations for northbound scenarios
- UI shows correct direction indicator, stops, and route diagram
- Existing southbound behavior is preserved (no regression)
- App is deployed to production with northbound support
- All tests pass (existing 51 + new northbound tests)

## Requirement Coverage

- Covers: R011 (primary), R001, R002, R005, R006, R009
- Partially covers: none
- Leaves for later: R003, R004, R007 (real-walk validation), R010 (B Line integration)
- Orphan risks: none

## Slices

- [ ] **S01: Direction-Aware Data Layer** `risk:high` `depends:[]`
  > After this: Northbound route data (polyline + stops) exists, direction detection function classifies heading from GPS history, API routes accept a direction query parameter and return direction-filtered predictions. Verified by unit tests for direction detection and API responses with direction=0.

- [ ] **S02: Bidirectional Calculator & UI** `risk:medium` `depends:[S01]`
  > After this: The app automatically detects walking direction from GPS, passes it through the full pipeline (API → calculator → state → UI), shows correct stops and route diagram for the active direction, and displays a direction indicator. Verified by running the app in mobile viewport with both directions producing correct UI.

- [ ] **S03: Deploy & Regression Check** `risk:low` `depends:[S02]`
  > After this: App is deployed to production at the same URL, all tests pass, southbound behavior is preserved, northbound pipeline works end-to-end. Verified by production curl checks and browser verification.

## Boundary Map

### S01 → S02

Produces:
- `lib/route-data.ts` → `NORTHBOUND_WALKING_ROUTE: RoutePoint[]`, `NORTHBOUND_STOPS: Stop[]` with computed route distances
- `lib/route-data.ts` → `getRouteData(direction): { walkingRoute, stops, totalDistance }` accessor function
- `lib/direction.ts` → `detectDirection(positionHistory): 'northbound' | 'southbound' | null` pure function
- `lib/constants.ts` → `NORTHBOUND_DIRECTION_ID = 0`
- `app/api/metro/trip-updates/route.ts` → accepts `?direction=0` query parameter, filters Metro API and Swiftly data by requested direction
- `app/api/metro/vehicle-positions/route.ts` → accepts `?direction=0` query parameter
- `lib/metro-fetchers.ts` → parse functions accept direction parameter instead of using hardcoded DIRECTION_ID
- Unit tests for direction detection (various GPS track scenarios)
- Unit tests for northbound catch calculator scenarios

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- `lib/use-bus-catch.ts` → direction detection integrated, passes direction to API calls and calculator
- `components/glanceable-screen.tsx` → direction indicator badge
- `components/detail-panel.tsx` → renders correct stops/route diagram for active direction
- `lib/geo.ts` → `snapToRoute` accepts route parameter instead of using hardcoded WALKING_ROUTE
- `app/page.tsx` → no structural changes expected (thin orchestrator pattern preserved)

Consumes from S01:
- Direction detection function
- Direction-parameterized route data accessor
- Direction-parameterized API routes
- Direction-parameterized parse functions
