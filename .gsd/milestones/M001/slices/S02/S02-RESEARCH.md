# S02: GPS & Calculation Reliability — Research

**Date:** 2026-03-11

## Summary

S02 owns three requirements: R005 (reliable GPS tracking), R006 (accurate catch calculations), and R009 (failure visibility). The existing code is structurally sound — `catch-calculator.ts` is pure and testable, `geo.ts` has correct haversine/snapping math, and `use-bus-catch.ts` orchestrates GPS → snap → speed → calculate cleanly. The main gaps are: (1) no tests exist for any of these modules, (2) GPS thresholds are far too permissive for real-world use, (3) the `source` field from S01's API routes is discarded by the client and never reaches `BusCatchState`, and (4) there's no staleness detection or error propagation for failure visibility.

The catch calculator logic itself is correct but the 90s buffer constant deserves scrutiny — it's reasonable for real-time data but may be too conservative for nearby stops and too optimistic for schedule data. The speed estimator has a subtle vulnerability to GPS noise amplification through route snapping. One stop (Cahuenga/Regal, id `9141`) snaps 334m off the route polyline, which is a data quality issue but doesn't affect runtime since stops are matched by ID not position.

## Recommendation

**Approach: Test-first, then harden, then wire failure visibility.**

1. **Unit tests for pure functions** — `catch-calculator.ts` and `geo.ts` are pure and directly testable with Vitest (no mocking needed). Define scenario-based test suites covering normal walks, edge cases (past all stops, no predictions, stale predictions, standing still), and boundary conditions around the 90s buffer.

2. **Tighten GPS thresholds** — Lower `MAX_GPS_ACCURACY` from 200m to 50m and `MAX_OFF_ROUTE_DISTANCE` from 500m to 100m. These are the values that determine whether a GPS reading is accepted. Current values are essentially no-ops.

3. **Wire `source` through to `BusCatchState`** — The API routes already return `source` in every response (S01 guarantee). `metro-api.ts` currently discards it. Add `source` to the response types, propagate through `useBusCatch`, and expose as `dataSource` on `BusCatchState`.

4. **Add staleness detection** — Track time since last successful API response. If >60s, mark data as stale in state. If >120s, surface as error.

5. **Add failure state fields to `BusCatchState`** — Per the roadmap boundary map: `dataSource`, `staleness`, `dataError`.

Do NOT change the catch calculator's core algorithm or buffer value in this slice — those are assumptions to validate with real walks in S04. Do document the sensitivity analysis as test comments so future tuning has a baseline.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Test framework | Vitest (already configured by S01) | D006 — consistent with S01 pattern, `@/` aliases work |
| Route snapping | `snapToRoute()` in `lib/geo.ts` | Already correct — projects to nearest polyline segment with proper t-clamping |
| Catch calculation | `calculateCatch()` in `lib/catch-calculator.ts` | Pure function, well-structured, correct logic |
| Speed estimation | `estimateSpeed()` in `use-bus-catch.ts` | Has correct sanity bounds (0.5–3.0 m/s), reasonable window |

## Existing Code and Patterns

- `lib/catch-calculator.ts` — Pure function: `(user, predictions, now) → { analyses, recommendation }`. No side effects, no network. Directly testable with synthetic inputs. Handles null user, empty predictions, all-stops-behind-user, and nearest-catchable-stop selection correctly.
- `lib/geo.ts` — Pure functions: `haversine()`, `snapToRoute()`, `walkTimeSeconds()`. All deterministic, no dependencies beyond `WALKING_ROUTE` from route-data.
- `lib/use-bus-catch.ts` — React hook orchestrating GPS watch → snap → speed estimate → calculate → vibrate. Contains the speed estimation logic inline as `estimateSpeed()`. Position history management is ref-based (not testable without component rendering, but the math can be extracted).
- `lib/route-data.ts` — 44-point polyline with 8 stops. Total route: 2760m (~33 min walk at 1.4 m/s). Stop spacing: 71m to 623m. Module-load-time computation of cumulative distances and stop snapping.
- `lib/metro-api.ts` — Client-side fetch wrappers. Currently returns `{ predictions }` / `{ vehicles }` without `source`. Needs to be updated to include `source` from API response.
- `lib/constants.ts` — `CATCH_BUFFER_SECONDS=90`, `MAX_GPS_ACCURACY=200`, `MAX_OFF_ROUTE_DISTANCE=500`, `SPEED_HISTORY_WINDOW=30`, `DEFAULT_WALKING_SPEED=1.4`. Accuracy and off-route thresholds need tightening.
- `lib/__tests__/metro-fetchers.test.ts` — S01 test pattern: tests adjacent to code in `__tests__/` dirs, use `vi.stubGlobal('fetch', ...)` for network mocking.

## Constraints

- **Vitest + happy-dom environment** (D006) — Tests must work in happy-dom, which means no real browser Geolocation API. Hook integration tests would need component rendering with mocked `navigator.geolocation`. Pure function tests need none of this.
- **`WALKING_ROUTE` computed at module load time** — `snapToRoute()` depends on `WALKING_ROUTE` from `route-data.ts` which computes cumulative distances at import time. Tests importing `geo.ts` will trigger this computation — fine for tests, but means route data can't be mocked without module mocking.
- **S03 consumes `BusCatchState`** — Any fields added to `BusCatchState` (per roadmap: `dataSource`, `staleness`, `dataError`) must be added to the type in `lib/types.ts` and populated in `use-bus-catch.ts`. S03 depends on these for failure visibility in the UI.
- **API response contract from S01** — Both `/api/metro/trip-updates` and `/api/metro/vehicle-positions` return a `source` field (guaranteed by S01). The client-side `metro-api.ts` must be updated to pass this through.
- **No changes to the API routes** — S02 should not modify the server-side route handlers (that's S01's territory). Only client-side consumption changes.

## Common Pitfalls

- **Testing `useBusCatch` directly** — The hook uses `navigator.geolocation.watchPosition`, `navigator.vibrate`, `setInterval`, and `fetch`. Don't try to unit test the hook directly — extract testable logic (speed estimation) into pure functions and test those. Hook behavior is better validated in S04's real-walk testing.
- **Over-mocking in catch calculator tests** — `calculateCatch` is already pure. Tests should construct `UserPosition` and `BusPrediction[]` objects directly. No mocking needed — just call the function with different inputs and assert outputs.
- **Confusing route distance with straight-line distance** — `walkTimeSeconds` uses route distance (along the polyline), not haversine distance. Tests must use route distances for `UserPosition.routeDistance` and `Stop.routeDistance`, not lat/lng.
- **Cahuenga/Regal stop is 334m off-route** — Stop `9141` (Cahuenga/Regal) snaps 334m from the walking polyline. This is a data quality issue (the GTFS stop coordinates don't match the walking route polyline well for this stop). It doesn't affect runtime because prediction matching uses stop IDs, not spatial proximity. But it means the `routeDistance` for this stop (475m) is a rough approximation — the walk time to this stop is less reliable than others.
- **Speed estimation failure mode** — If GPS jumps backward along the route (common with noise), `distDelta <= 0` triggers fallback to `DEFAULT_WALKING_SPEED`. This is actually the safe behavior, but it means estimated speed is only accurate when GPS is stable and user is moving forward. Don't try to "fix" this — the fallback to 1.4 m/s is the right default.
- **Staleness vs no-data** — "No predictions available" (API returned empty) is different from "stale predictions" (API hasn't responded in 60s). Both need distinct handling in the state.

## Open Risks

- **GPS accuracy on Cahuenga Blvd is unknown until real walk** — S02 can tighten thresholds based on reasonable assumptions (50m accuracy, 100m off-route) but the real test is S04. The risk is that even 50m accuracy is too strict for this area, causing GPS readings to be silently dropped.
- **Speed estimation noise amplification** — At 30m GPS noise, route snapping can introduce ±15-30m error in `routeDistance`, translating to ±0.5-1.0 m/s speed error over the 30s window. This could cause oscillating speed estimates and unstable recommendations. Mitigated by the sanity bounds but not eliminated.
- **Buffer constant tuning is deferred** — The 90s buffer is a guess. Analysis shows it's reasonable for real-time data (absorbs ~1.5 min of bus ETA uncertainty) but may be too conservative for nearby stops (user with 79s margin at a 51s-walk stop is told "keep walking"). Tuning deferred to real-walk validation.
- **`metro-api.ts` response type expansion** — Adding `source` to the fetch response types is a non-breaking change, but the existing page component and any other consumers don't expect it. Need to verify no consumers destructure the response in a way that breaks.

## Scenario Analysis (Captured for Test Design)

| Scenario | User Position | Bus ETA | Expected Result | Notes |
|----------|--------------|---------|-----------------|-------|
| Start of walk, bus 5min | routeDist=0 | 300s all stops | WAIT at Lankershim | Nearest catchable (51s walk + 90s buffer < 300s) |
| Mid-walk, bus 5min | routeDist=1100 | 300s all stops | KEEP_WALKING | Closest ahead stop needs 219s walk, bus in 300s, margin 81s < 90s buffer |
| At a stop, bus 3.5min | routeDist=70 | 200s at Lankershim | WAIT here | Walk ~1s, margin 199s >> 90s, "Wait here" |
| Past all stops | routeDist=2500 | any | KEEP_WALKING | All stops behind user |
| No GPS | null user | any | NO_DATA "Waiting for GPS..." | Null user → NO_DATA |
| No predictions | any | [] | NO_DATA "No bus predictions available" | Empty preds → NO_DATA |
| All predictions in past | any | arrivalTime < now | KEEP_WALKING | Past predictions filtered out (busSeconds ≤ 0) |
| Fast walker (2.0 m/s) | routeDist=600 | realistic per-stop | WAIT at Broadlawn | Faster speed → more stops reachable |
| Slow walker (0.8 m/s) | routeDist=600 | realistic per-stop | KEEP_WALKING | Slower speed → fewer stops reachable |

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Vitest | `onmax/nuxt-skills@vitest` (601 installs) | Available — Nuxt-specific, not directly relevant |
| Vitest | `pproenca/dot-skills@vitest` (315 installs) | Available — generic, potentially useful |
| GPS/Geolocation | none found | No relevant skills for browser Geolocation testing |

No skills recommended for installation — the work is pure function testing and state hook wiring, well within standard Vitest patterns already established by S01.

## Sources

- Catch calculator scenario analysis — computed via `npx tsx` executing `calculateCatch()` with synthetic inputs against the real route data
- Route geometry analysis — 44 points, 2760m total, 43 segments averaging 64m (min 10m, max 206m)
- Stop snapping validation — all stops snap within 15m of route except Cahuenga/Regal (334m off)
- Buffer sensitivity analysis — 90s buffer means even with 79s margin (51s walk + 79s = 130s bus ETA), stop is not catchable
- Speed estimation bounds — 0.5–3.0 m/s with 30s window, falls back to 1.4 m/s on insufficient data
- GPS threshold analysis — current 200m accuracy / 500m off-route thresholds are effectively no-ops for Cahuenga Blvd walking
