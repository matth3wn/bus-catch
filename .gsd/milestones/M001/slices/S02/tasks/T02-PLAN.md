---
estimated_steps: 5
estimated_files: 6
---

# T02: Tighten GPS thresholds and wire source/staleness into BusCatchState

**Slice:** S02 — GPS & Calculation Reliability
**Milestone:** M001

## Description

Three changes that close the slice: (1) tighten GPS accuracy thresholds from no-op values to real-world-appropriate ones, (2) update `metro-api.ts` to pass the `source` field from S01's API responses through to callers, and (3) extend `BusCatchState` with `dataSource`, `staleness`, and `dataError` fields wired in `useBusCatch`. This delivers R005 (GPS rejection), R009 (failure visibility), and the boundary contract S03 depends on.

## Steps

1. **Tighten GPS thresholds in `lib/constants.ts`:**
   - Change `MAX_GPS_ACCURACY` from 200 to 50
   - Change `MAX_OFF_ROUTE_DISTANCE` from 500 to 100
   - Add `STALENESS_WARNING_SECONDS = 60` and `STALENESS_ERROR_SECONDS = 120` constants

2. **Extend types and metro-api passthrough:**
   - In `lib/types.ts`: Add `dataSource: 'realtime' | 'schedule' | 'mock' | null` to `BusCatchState`, add `staleness: number | null`, add `dataError: string | null`
   - In `lib/metro-api.ts`: Add `source` field to `TripUpdateResponse` and `VehiclePositionResponse` types. Both fetch functions already get it in the JSON — just need the types to include it so callers see it.

3. **Extract `estimateSpeed` to `lib/speed.ts`:**
   - Create `lib/speed.ts` exporting `estimateSpeed(history: PositionRecord[], now: number, window: number): number` as a pure function
   - Export the `PositionRecord` interface from this module (move from `use-bus-catch.ts`)
   - Update `use-bus-catch.ts` to import from `speed.ts` instead of defining inline

4. **Wire `dataSource`, `staleness`, `dataError` in `lib/use-bus-catch.ts`:**
   - Initialize `dataSource: null`, `staleness: null`, `dataError: null` in initial state
   - In the poll function: on successful fetch, record `lastSuccessfulFetch` timestamp (ref), set `dataSource` from `tripData.source` (map `'metro-realtime'` → `'realtime'`, `'swiftly'` → `'realtime'`, `'schedule'` → `'schedule'`, `'mock'` → `'mock'`), clear `dataError`
   - In the poll function: on fetch error, set `dataError` to the error message
   - Add a staleness check: compute `staleness = (Date.now() - lastSuccessfulFetch) / 1000` whenever state updates. If staleness > `STALENESS_ERROR_SECONDS`, set `dataError = 'Bus data is stale (>2 min since last update)'`. Add `console.warn('[bus-catch] Data stale: Xs since last update')` on staleness transitions.

5. **Verify everything compiles and tests pass:**
   - `npm run build` — zero type errors (proves `BusCatchState` extensions are compatible with all consumers including `app/page.tsx`)
   - `npx vitest run` — all tests pass (T01 tests + existing 25; T01 tests don't touch the modified modules so they remain stable)
   - Manual check: read `lib/types.ts` and confirm `BusCatchState` has all three new fields

## Must-Haves

- [ ] `MAX_GPS_ACCURACY` = 50, `MAX_OFF_ROUTE_DISTANCE` = 100
- [ ] `STALENESS_WARNING_SECONDS` and `STALENESS_ERROR_SECONDS` constants added
- [ ] `BusCatchState` type has `dataSource`, `staleness`, `dataError` fields
- [ ] `metro-api.ts` response types include `source` and pass it through
- [ ] `useBusCatch` maps API `source` → `BusCatchState.dataSource`
- [ ] `useBusCatch` tracks staleness and surfaces `dataError` when >120s
- [ ] `estimateSpeed` extracted to `lib/speed.ts` as pure function
- [ ] `npm run build` succeeds with zero type errors
- [ ] All existing + T01 tests still pass

## Verification

- `npm run build` — zero type errors (this is the primary integration check — it proves the new `BusCatchState` fields are compatible with every consumer)
- `npx vitest run` — all tests pass (existing 25 + T01's ~20 new tests)
- Read `lib/types.ts` and confirm `BusCatchState` includes `dataSource: 'realtime' | 'schedule' | 'mock' | null`, `staleness: number | null`, `dataError: string | null`
- Read `lib/metro-api.ts` and confirm both response types include `source: string`
- Read `lib/constants.ts` and confirm `MAX_GPS_ACCURACY = 50`, `MAX_OFF_ROUTE_DISTANCE = 100`

## Observability Impact

- Signals added/changed: `BusCatchState.dataSource` exposes which API tier is active; `BusCatchState.staleness` tracks seconds since last successful fetch; `BusCatchState.dataError` surfaces error messages for stale data or fetch failures; `console.warn('[bus-catch] ...')` on staleness transitions
- How a future agent inspects this: Check `BusCatchState` fields in React DevTools or by reading the hook's state; grep server logs for `[bus-catch]` staleness warnings
- Failure state exposed: Stale data (>60s) → `staleness` populated; critically stale (>120s) → `dataError` populated; fetch failure → `dataError` with error message; GPS too inaccurate → silently dropped (threshold now meaningful at 50m)

## Inputs

- `lib/constants.ts` — current threshold values to modify
- `lib/types.ts` — current `BusCatchState` type to extend
- `lib/metro-api.ts` — current fetch functions that discard `source`
- `lib/use-bus-catch.ts` — current hook to wire staleness and dataSource into
- S01-SUMMARY forward intelligence — API responses always include `source` field
- T01 test files — must continue passing after these changes

## Expected Output

- `lib/constants.ts` — tightened thresholds + staleness constants
- `lib/types.ts` — `BusCatchState` with 3 new fields
- `lib/metro-api.ts` — response types include `source`, fetch functions pass it through
- `lib/use-bus-catch.ts` — wires `dataSource`, `staleness`, `dataError`; imports from `speed.ts`
- `lib/speed.ts` — new: pure `estimateSpeed()` function extracted from hook
- Build succeeds, all tests pass, S03 boundary contract (`BusCatchState` shape) is established
