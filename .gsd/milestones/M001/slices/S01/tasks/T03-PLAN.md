---
estimated_steps: 5
estimated_files: 5
---

# T03: Wire fallback chain into API route handlers and pass all tests

**Slice:** S01 — Resilient Data Pipeline
**Milestone:** M001

## Description

Refactor both API route handlers (`trip-updates` and `vehicle-positions`) to implement the full fallback chain using the Metro fetchers from T02. Each handler tries tiers in order, catches errors at each tier, logs the fallback transition, and returns the first successful result with a `source` field. After this task, all integration tests pass, the build succeeds, and curling the dev server returns real predictions.

## Steps

1. Refactor `app/api/metro/trip-updates/route.ts`:
   - Extract existing Swiftly fetch + parse into a `trySwiftly()` helper that returns `{ predictions, source: 'swiftly' }` or throws
   - Import `fetchMetroTripUpdates` and `fetchSchedulePredictions` from `lib/metro-fetchers`
   - Implement `GET()` as sequential try/catch: trySwiftly() → fetchMetroTripUpdates() → fetchSchedulePredictions() → mock fallback
   - Each catch logs `console.warn('[trip-updates] {tier} failed: {reason}, trying next tier')`
   - Response shape: `{ predictions: BusPrediction[], source: string }`
   - Keep `generateMockPredictions()` as final fallback, tagged with `source: 'mock'`
2. Refactor `app/api/metro/vehicle-positions/route.ts`:
   - Same pattern: trySwiftly() → fetchMetroVehiclePositions() → mock
   - No schedule tier (positions don't have a schedule equivalent)
   - Response shape: `{ vehicles: VehicleInfo[], source: string }`
   - Keep `generateMockVehicles()` as final fallback with `source: 'mock'`
3. Update integration test files if any mock structure or import needs adjustment based on actual implementation choices (T01 tests were written against the expected contract — minor tweaks may be needed for exact mock wiring)
4. Run `npx vitest run` — all tests must pass
5. Run `npm run build` — must succeed with no type errors. Start dev server and `curl http://localhost:3000/api/metro/trip-updates` to verify real response shape with `source` field.

## Must-Haves

- [ ] trip-updates route implements 4-tier fallback: Swiftly → Metro real-time → schedule → mock
- [ ] vehicle-positions route implements 3-tier fallback: Swiftly → Metro real-time → mock
- [ ] Every response includes `source` field indicating which tier provided data
- [ ] Each fallback transition is logged with `console.warn` and tier name
- [ ] Swiftly key absence doesn't cause errors — it skips the tier cleanly
- [ ] `SWIFTLY_API_KEY` value is never logged, only its presence/absence
- [ ] All integration and unit tests pass
- [ ] `npm run build` succeeds

## Verification

- `npx vitest run` — all tests pass (unit + integration)
- `npm run build` — succeeds with zero errors
- Manual: `curl http://localhost:3000/api/metro/trip-updates` returns `{ predictions: [...], source: "..." }`
- Manual: `curl http://localhost:3000/api/metro/vehicle-positions` returns `{ vehicles: [...], source: "..." }`

## Observability Impact

- Signals added/changed: Structured fallback logging in both route handlers. Each tier failure produces a `console.warn` with `[trip-updates]` or `[vehicle-positions]` prefix, tier name, and error reason. Successful tier logged as `console.info`.
- How a future agent inspects this: `curl` the API routes and check the `source` field. Server logs show the fallback path taken on each request.
- Failure state exposed: If all tiers fail, response contains `source: 'mock'` (or in prod without mock: `{ predictions: [], source: 'none', error: 'All data sources unavailable' }`). Logs show the chain of failures.

## Inputs

- `lib/metro-fetchers.ts` — fetch functions and types from T02
- `lib/constants.ts` — all constants including new Metro API ones from T02
- `app/api/metro/trip-updates/route.ts` — existing Swiftly-only implementation
- `app/api/metro/vehicle-positions/route.ts` — existing Swiftly-only implementation
- `app/api/metro/__tests__/trip-updates.test.ts` — integration tests from T01
- `app/api/metro/__tests__/vehicle-positions.test.ts` — integration tests from T01

## Expected Output

- `app/api/metro/trip-updates/route.ts` — refactored with full fallback chain, `source` field
- `app/api/metro/vehicle-positions/route.ts` — refactored with full fallback chain, `source` field
- All test files passing: `lib/__tests__/metro-fetchers.test.ts`, `app/api/metro/__tests__/trip-updates.test.ts`, `app/api/metro/__tests__/vehicle-positions.test.ts`
- Clean build: `npm run build` succeeds
