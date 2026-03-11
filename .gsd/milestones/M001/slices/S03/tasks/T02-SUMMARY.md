---
id: T02
parent: S03
milestone: M001
provides:
  - page.tsx orchestrator wiring GlanceableScreen + DetailPanel with expand/collapse state
  - Dynamic <meta name="theme-color"> matching recommendation action color
  - viewport-fit: cover for iOS PWA safe-area support
  - status-banner.tsx deleted (fully replaced)
key_files:
  - app/page.tsx
  - app/layout.tsx
key_decisions:
  - theme-color useEffect updates existing meta tag content attribute rather than creating/destroying elements — simpler, avoids SSR hydration mismatch
patterns_established:
  - page.tsx is a thin orchestrator — state from useBusCatch(), UI delegation to GlanceableScreen/DetailPanel, expanded boolean for panel toggle
observability_surfaces:
  - document.querySelector('meta[name="theme-color"]').content — always reflects current recommendation (green #16a34a / amber #f59e0b / gray #404040)
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T02: Wire page.tsx, layout viewport, and dynamic theme-color

**Rewrote page.tsx as orchestrator connecting GlanceableScreen + DetailPanel with expand/collapse state, added dynamic theme-color meta updates, viewport-fit: cover, and deleted status-banner.tsx.**

## What Happened

Rewrote `app/page.tsx` from the old StatusBanner + inline layout to a thin orchestrator that renders `GlanceableScreen` and `DetailPanel` simultaneously. Added `expanded` boolean state — `onTap` sets true, `onClose` sets false. Both components always render (glanceable screen stays mounted during transitions; detail panel overlays via CSS).

Added a `useEffect` keyed on `state.recommendation.action` that updates the existing `<meta name="theme-color">` tag's `content` attribute using the `RECOMMENDATION_STYLES` color map imported from glanceable-screen.tsx. Colors: `#16a34a` (KEEP_WALKING), `#f59e0b` (WAIT), `#404040` (NO_DATA).

Added `viewportFit: "cover"` to the viewport export in `app/layout.tsx`, enabling `env(safe-area-inset-*)` CSS functions for iOS PWA standalone mode.

Deleted `components/status-banner.tsx` — confirmed no remaining imports anywhere in the codebase.

## Verification

- `npm run build` — clean production build, zero type errors
- `npx vitest run` — 51 tests pass, 0 failures (no regression)
- `grep -r "status-banner" app/ components/ lib/` — no results (file fully removed)
- Browser at 375×812 viewport:
  - Glanceable screen fills viewport with gray NO_DATA color and "NO BUS DATA" headline ✅
  - MOCK data source badge visible at bottom ✅
  - Tap on glanceable screen expands detail panel with route diagram, close button ✅
  - Close button collapses back to glanceable screen ✅
  - `document.querySelector('meta[name="theme-color"]').content` returns `#404040` ✅
  - `document.querySelector('meta[name="viewport"]').content` includes `viewport-fit=cover` ✅
- Slice-level checks (partial — T02 is intermediate):
  - ✅ npm run build — zero type errors
  - ✅ npx vitest run — 51 tests pass
  - ✅ Glanceable screen fills viewport with recommendation color and text
  - ✅ Tap expands detail panel with route diagram
  - ✅ Tap collapse button returns to glanceable screen
  - ✅ Data source badge visible in detail panel
  - ⬜ Loading state renders correctly before data arrives (needs T03 — requires mocking GPS timing)
  - ⬜ Failure-state render with gpsError/dataError visible (needs T03 — requires error injection)

## Diagnostics

- `document.querySelector('meta[name="theme-color"]').content` — returns current theme color hex, always in sync with recommendation action
- React `expanded` state controls detail panel visibility — inspectable via React DevTools
- Service worker registration preserved in page.tsx useEffect

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `app/page.tsx` — REWRITTEN: thin orchestrator with GlanceableScreen + DetailPanel + expanded state + dynamic theme-color useEffect + service worker registration
- `app/layout.tsx` — MODIFIED: added `viewportFit: "cover"` to viewport export
- `components/status-banner.tsx` — DELETED: fully replaced by GlanceableScreen
