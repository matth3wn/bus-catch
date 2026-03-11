---
id: M001
provides:
  - Deployed PWA at https://bus-mu-ebon.vercel.app with auto-deploy from GitHub
  - Full-screen glanceable walk-or-wait recommendation (green/amber/gray) with tap-to-expand detail
  - 4-tier API fallback pipeline: Swiftly → Metro API v2 real-time → schedule → mock
  - Validated catch calculator (12 scenario tests) and geo functions (14 tests) for Route 222 southbound
  - BusCatchState with dataSource/staleness/dataError for failure visibility
  - PWA manifest, service worker shell caching, HTTPS, iOS safe-area support
  - Dynamic theme-color meta tag matching recommendation state
  - 51 passing tests (Vitest) covering data pipeline, catch calculator, and geo functions
key_decisions:
  - D001: Swiftly → public GTFS-RT → static schedule → mock fallback strategy
  - D002: Full-screen color = answer, tap to expand detail
  - D004: No backend/database — client-side state only
  - D007: Metro API v2 JSON over raw GTFS-RT protobuf (no protobuf dependency)
  - D008: Every API response includes source field for observability
  - D009: Parse functions separated from fetch functions for deterministic testing
  - D014: CSS-only transitions, no animation library
  - D017: Deploy to Vercel via GitHub integration
  - D018: Hand-rolled service worker, no Workbox
patterns_established:
  - Multi-tier fallback chain with source tagging in every response
  - Pure parse functions separated from async fetch wrappers for testability
  - Characterization tests using real route data, no mocking
  - RECOMMENDATION_STYLES constant mapping action → colors for UI consistency
  - Thin page.tsx orchestrator delegating all rendering to child components
  - BusCatchState as single state hook orchestrating GPS, polling, calculation, and recommendations
  - Safe-area CSS utilities and viewport-fit:cover for iOS PWA standalone mode
observability_surfaces:
  - API response source field (realtime/schedule/mock) — single best health indicator
  - Data source badge always visible on glanceable screen and detail panel
  - Staleness seconds displayed numerically with warning at >60s
  - gpsError and dataError alert badges on glanceable screen
  - Console prefixes [trip-updates], [vehicle-positions], [metro-fetchers], [bus-catch] for structured logging
  - document.querySelector('meta[name="theme-color"]').content reflects current state
  - curl https://bus-mu-ebon.vercel.app/api/metro/trip-updates — production health check
  - Vercel dashboard function logs for API route debugging
requirement_outcomes:
  - id: R001
    from_status: active
    to_status: validated
    proof: "S03 browser assertions at 390×844 mobile viewport — full-screen color surface, 48px headline, zero-interaction answer"
  - id: R002
    from_status: active
    to_status: validated
    proof: "S03 browser assertions — tap expands detail panel with route diagram and stop cards, close button collapses back"
  - id: R008
    from_status: active
    to_status: validated
    proof: "S04 — deployed at https://bus-mu-ebon.vercel.app, manifest valid, SW registered and activated, HTTPS, 19/19 programmatic PWA checks pass"
  - id: R009
    from_status: active
    to_status: validated
    proof: "S02 state wiring (dataSource/staleness/dataError) + S03 UI rendering — badges, warnings, and error alerts browser-verified"
duration: ~2h across 4 slices (14 tasks)
verification_result: passed
completed_at: 2026-03-11
---

# M001: Ship It

**Took Bus Catch from untested prototype to deployed PWA — resilient data pipeline, validated catch calculator, glanceable full-screen UX, and production deployment at https://bus-mu-ebon.vercel.app.**

## What Happened

Four slices built the app bottom-up, each producing a verified boundary contract for the next:

**S01 (Resilient Data Pipeline)** replaced the Swiftly-only API with a 4-tier fallback chain: Swiftly → Metro API v2 real-time → schedule → mock. Key decision D007 chose Metro API v2 JSON endpoints over raw GTFS-RT protobuf, eliminating a dependency while providing the same data. Every API response includes a `source` field (D008) for downstream observability. Pure parse functions were separated from fetch wrappers (D009) enabling deterministic testing. 25 tests cover all tiers and edge cases.

**S02 (GPS & Calculation Reliability)** wrote characterization tests for the two core pure-function modules — 12 catch calculator scenarios and 14 geo function tests using real Route 222 data. GPS thresholds were tightened from effectively-no-op values (200m/500m) to meaningful filters (50m accuracy, 100m off-route). `BusCatchState` was extended with `dataSource`, `staleness`, and `dataError` fields — the boundary contract S03 needs for failure visibility. Speed estimation was extracted to a pure function.

**S03 (Glanceable UX)** built the two core UI components. `GlanceableScreen` fills the viewport with recommendation color (green/amber/gray) and a text-5xl headline — the zero-interaction answer. `DetailPanel` slides up on tap with stop cards, route diagram, data source badge, and staleness info. `page.tsx` was rewritten as a thin orchestrator. CSS-only transitions (D014), dynamic theme-color meta tag (D015), and iOS safe-area support were added. Browser-verified at 390×844 mobile viewport.

**S04 (Deploy & Validate)** fixed two PWA bugs (hardcoded manifest link causing 404, SW pre-caching wrong URL), deployed to Vercel via GitHub integration, and wrote a 43-item UAT checklist. 19/19 programmatic checks pass. The app is live at https://bus-mu-ebon.vercel.app with auto-deploy on push.

## Cross-Slice Verification

**Success Criteria:**

| Criterion | Status | Evidence |
|---|---|---|
| Full-screen walk-or-wait answer in <1s | ✅ Met | S03: GlanceableScreen fills 390×844 viewport, H1 at 48px, zero interaction. Production 200 response. |
| Recommendation updates as user moves | ✅ Structurally verified | S02: 12 catch calculator scenarios + 14 geo tests prove correctness. `useBusCatch` re-evaluates on GPS change. Real-walk validation deferred — requires physical presence on Cahuenga Blvd. |
| Works with Swiftly, public feed, or schedule fallback | ✅ Met | S01: 25 tests prove 4-tier fallback. Production confirms graceful degradation (`source: "mock"` without Swiftly key). |
| Tap reveals detailed stop times and bus positions | ✅ Met | S03: browser assertions confirm expand/collapse cycle with route diagram, stop cards, data source badge. |
| Deployed, installable as PWA, usable on commute | ✅ Met | S04: https://bus-mu-ebon.vercel.app, valid manifest, SW active, HTTPS, 19/19 PWA checks. Physical install documented (all prerequisites verified). |

**Definition of Done:**

- ✅ All four slice deliverables complete and verified
- ✅ API layer supports Swiftly, Metro API v2, and schedule fallback
- ✅ GPS tracking and catch calculator validated with scenario tests
- ✅ Glanceable UX renders correctly on mobile with tap-to-expand detail
- ✅ App deployed to public URL, installable as PWA
- ⚠️ Final acceptance (open on phone during walk) — all agent-verifiable prerequisites met; physical walk test requires human on Cahuenga Blvd during service hours

**Verification runs at milestone completion:**

- `npx vitest run` — **51/51 tests pass** (0 failures)
- `npm run build` — clean, 7 routes, 0 type errors
- `curl https://bus-mu-ebon.vercel.app` — 200
- `curl .../manifest.webmanifest` — valid JSON, name "Bus Catch"
- `curl .../api/metro/trip-updates` — 200, source: mock, 16 predictions

## Requirement Changes

- R001 (Glanceable walk-or-wait): active → **validated** — S03 browser assertions at mobile viewport confirm full-screen color surface, 48px headline, zero-interaction answer
- R002 (Tap-to-expand detail): active → **validated** — S03 browser assertions confirm expand/collapse cycle with route diagram, stop cards, data source
- R008 (PWA deployment): active → **validated** — S04 deployed at https://bus-mu-ebon.vercel.app, manifest/SW/HTTPS verified, 19/19 programmatic checks pass
- R009 (Failure visibility): active → **validated** — S02 wired state fields, S03 renders them: data source badge, staleness warning, gpsError/dataError alert badges
- R003, R004, R005, R006, R007: remain **active** — passing tests prove implementation correctness; full validation requires real-walk testing and live Metro API confirmation during service hours

## Forward Intelligence

### What the next milestone should know
- The app is live at https://bus-mu-ebon.vercel.app with auto-deploy from GitHub (matth3wn/bus-catch). Pushing to main triggers a new Vercel build.
- No `SWIFTLY_API_KEY` in production — data source shows "MOCK". Add via Vercel dashboard when available.
- 5 requirements (R003-R007) are active with passing tests but await real-walk validation. A dedicated validation milestone or a single "real walk test" slice could retire all five.
- The catch calculator, geo functions, and data pipeline are well-tested (51 tests) but have never run against real GPS data on Cahuenga Blvd.
- `CATCH_BUFFER_SECONDS=90` is untested — may be too conservative (never says wait) or too aggressive (misses bus). Real-walk tuning is the highest-value next step.

### What's fragile
- **GPS thresholds (50m/100m)** — educated guesses, never tested on real hardware. If readings are rejected too aggressively, the app shows "Waiting for GPS..." permanently. These are the first constants to tune.
- **Metro API v2 endpoints** (`api.metro.net`) — no SLA, may change without notice. The parse functions use defensive optional chaining but could return empty arrays on format changes.
- **Service worker cache version** — hardcoded as `bus-catch-v1`. Must bump this string to bust caches after significant changes, or users get stale app shells.
- **Schedule endpoint shape** (`route_stops/222`) — based on research, not confirmed against live response during service hours.

### Authoritative diagnostics
- `curl https://bus-mu-ebon.vercel.app/api/metro/trip-updates` — 200 with `source` field is the single best production health check
- `npx vitest run` — 51 tests, all passing — catches regressions in catch calculator, geo, and data pipeline
- Data source badge in the app UI ("REALTIME"/"SCHEDULE"/"MOCK") is the fastest visual diagnostic
- Console prefixes `[trip-updates]`, `[vehicle-positions]`, `[metro-fetchers]`, `[bus-catch]` for structured log filtering

### What assumptions changed
- **"Public GTFS-RT" → Metro API v2 JSON** — Original plan assumed protobuf parsing would be needed. Metro API v2 provides the same data as JSON REST endpoints with no API key, eliminating the protobuf dependency entirely (D007).
- **GPS thresholds were no-ops** — Original 200m accuracy / 500m off-route thresholds would never filter anything on a 1-mile walk. Tightened to 50m/100m (D010).
- **Haversine vs walking distance** — Universal City to Barham is ~1914m straight-line (haversine), not ~1600m (route-following). Tests use real haversine values.
- **`apple-mobile-web-app-capable` meta tag** — Next.js doesn't emit it even with `appleWebApp.capable: true`. Modern iOS (12.2+) uses manifest `display: standalone` instead, so not a blocker.

## Files Created/Modified

- `lib/metro-fetchers.ts` — Metro API v2 fetch/parse module with pure functions and async wrappers
- `lib/constants.ts` — API constants, tightened GPS thresholds, staleness thresholds
- `lib/types.ts` — BusCatchState extended with dataSource, staleness, dataError
- `lib/metro-api.ts` — Response types with source field
- `lib/use-bus-catch.ts` — Wired dataSource mapping, staleness tracking, error surfacing
- `lib/speed.ts` — Pure estimateSpeed() function
- `lib/__tests__/metro-fetchers.test.ts` — 14 unit tests for Metro API v2 parsing
- `lib/__tests__/catch-calculator.test.ts` — 12 scenario-based catch calculator tests
- `lib/__tests__/geo.test.ts` — 14 geo function tests
- `app/api/metro/trip-updates/route.ts` — 4-tier fallback chain with source tagging
- `app/api/metro/vehicle-positions/route.ts` — 3-tier fallback chain with source tagging
- `app/api/metro/__tests__/trip-updates.test.ts` — 6 integration tests
- `app/api/metro/__tests__/vehicle-positions.test.ts` — 5 integration tests
- `components/glanceable-screen.tsx` — Full-screen recommendation surface with RECOMMENDATION_STYLES
- `components/detail-panel.tsx` — Slide-up detail panel with stop cards, route diagram, diagnostics
- `app/page.tsx` — Thin orchestrator with expand/collapse state, dynamic theme-color
- `app/layout.tsx` — viewport-fit:cover, removed hardcoded manifest link
- `app/globals.css` — Transition classes, safe-area utilities, pulse-slow keyframes
- `public/sw.js` — Updated shell assets for correct manifest URL
- `vitest.config.ts` — Test framework configuration
- `package.json` — Added vitest, happy-dom devDependencies
- `components/status-banner.tsx` — Deleted (replaced by GlanceableScreen)
