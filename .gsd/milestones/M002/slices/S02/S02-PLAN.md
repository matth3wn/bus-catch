# S02: Bidirectional Calculator & UI

**Goal:** App automatically detects walking direction from GPS, passes it through the full pipeline (API → calculator → state → UI), shows correct stops and route diagram for the active direction, and displays a direction indicator.
**Demo:** Running the app in mobile viewport shows direction badge. Northbound and southbound states produce correct stops in detail panel.

## Must-Haves

- `useBusCatch` integrates direction detection from GPS position history
- Direction passed to API calls (`?direction=0` or `?direction=1`)
- Direction passed to catch calculator with correct stops
- `snapToRoute` uses direction-appropriate route polyline
- Direction indicator badge on glanceable screen
- Detail panel shows correct stops/route diagram for active direction
- `BusCatchState` extended with `direction` field
- Client-side `fetchTripUpdates` and `fetchVehiclePositions` accept direction param

## Proof Level

- This slice proves: integration
- Real runtime required: yes (browser verification)
- Human/UAT required: no

## Verification

- `npx vitest run` — all tests pass (71+)
- `npm run build` — zero type errors
- Browser at mobile viewport: direction badge visible, detail panel shows correct stops

## Tasks

- [ ] **T01: Wire direction into state hook and API calls** `est:20m`
  - Why: Core wiring — direction detection feeds into API polling and calculator
  - Files: `lib/use-bus-catch.ts`, `lib/metro-api.ts`, `lib/types.ts`
  - Do: Add `direction` to BusCatchState. Import `detectDirection` in useBusCatch. Track direction from position history. Pass direction to `fetchTripUpdates`/`fetchVehiclePositions` as query param. Pass direction-appropriate stops to `calculateCatch`. Use direction-appropriate route in `snapToRoute`. Update `metro-api.ts` to accept direction param.
  - Verify: `npm run build` — compiles clean
  - Done when: Direction flows from GPS → detection → API calls → calculator → state

- [ ] **T02: Direction indicator and direction-aware UI** `est:20m`
  - Why: User needs to see which direction is active; detail panel must show correct stops
  - Files: `components/glanceable-screen.tsx`, `components/detail-panel.tsx`, `app/page.tsx`, `components/route-diagram.tsx`
  - Do: Add direction badge to GlanceableScreen (e.g. "↑ NORTHBOUND" or "↓ SOUTHBOUND"). Pass direction-appropriate stops to DetailPanel and RouteDiagram. Update page.tsx to pass direction from state. Handle null direction (startup) gracefully.
  - Verify: Browser at mobile viewport — direction badge visible, detail panel shows correct stops for each direction
  - Done when: UI correctly reflects active direction with indicator and correct stops

## Files Likely Touched

- `lib/types.ts`
- `lib/use-bus-catch.ts`
- `lib/metro-api.ts`
- `components/glanceable-screen.tsx`
- `components/detail-panel.tsx`
- `components/route-diagram.tsx`
- `app/page.tsx`
