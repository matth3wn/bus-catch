---
id: S03
parent: M001
milestone: M001
provides:
  - GlanceableScreen component — full-screen color-coded recommendation surface (green/amber/gray)
  - DetailPanel component — slide-up overlay with stop cards, route diagram, data source badge, staleness info
  - RECOMMENDATION_STYLES shared constant — color/text/themeColor mapping per action
  - Dynamic theme-color meta tag updating on recommendation change
  - viewport-fit: cover for iOS PWA safe-area support
  - CSS transition classes and safe-area padding utilities
  - page.tsx rewritten as thin orchestrator with expand/collapse state
  - status-banner.tsx deleted (fully replaced)
requires:
  - slice: S02
    provides: BusCatchState with dataSource, staleness, dataError, gpsError fields; validated calculateCatch(); STALENESS_WARNING_SECONDS constant
  - slice: S01
    provides: API routes returning BusPrediction[] from multi-tier fallback chain
affects:
  - S04
key_files:
  - components/glanceable-screen.tsx
  - components/detail-panel.tsx
  - app/page.tsx
  - app/layout.tsx
  - app/globals.css
key_decisions:
  - D014: CSS-only transitions (transform + transition-transform for panel, transition-colors for background) — no animation library
  - D015: Dynamic theme-color via useEffect updating existing meta tag content attribute
  - D016: Tap-only expand/collapse — no swipe gesture handlers to avoid scroll conflicts
patterns_established:
  - RECOMMENDATION_STYLES constant maps RecommendationAction → { bg, text, themeColor } for UI consistency across components
  - Safe-area CSS utilities (.pt-safe, .pb-safe, etc.) for iOS PWA standalone mode
  - .detail-panel / .detail-panel-open CSS classes for slide-up overlay pattern
  - page.tsx as thin orchestrator — state from useBusCatch(), UI delegation to child components, single expanded boolean
observability_surfaces:
  - Data source badge on both glanceable screen (mini) and detail panel (full) — shows realtime/schedule/mock
  - Staleness seconds displayed numerically when >0, warning style when >STALENESS_WARNING_SECONDS
  - gpsError and dataError rendered as semi-transparent alert badges on glanceable screen
  - dataError also shown in detail panel body
  - document.querySelector('meta[name="theme-color"]').content always reflects current recommendation color
drill_down_paths:
  - .gsd/milestones/M001/slices/S03/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S03/tasks/T03-SUMMARY.md
duration: 45m
verification_result: passed
completed_at: 2026-03-11
---

# S03: Glanceable UX

**Full-screen color-coded walk-or-wait recommendation with tap-to-expand detail panel, failure state visibility, and iOS PWA safe-area support — verified at mobile viewport.**

## What Happened

Built the glanceable UX in three tasks:

**T01** created the two core components. `GlanceableScreen` fills the viewport with recommendation color (green-600 for KEEP_WALKING, amber-500 for WAIT, neutral-700 for NO_DATA), shows headline text at text-5xl, reason subtitle, error alert badges at top, and data source mini-badge at bottom. Loading state pulses with "STARTING UP…" text. `DetailPanel` is a fixed overlay that slides up via CSS transform transition, containing a close button (44px touch target), data source + staleness badge, data error display, route diagram, stop cards, last-updated timestamp, and InstallPrompt at footer. A shared `RECOMMENDATION_STYLES` constant maps each action to colors for reuse. CSS additions: transition classes, safe-area padding utilities, pulse-slow keyframes, overscroll-behavior containment.

**T02** rewrote `page.tsx` as a thin orchestrator connecting the new components with an `expanded` boolean state toggle. Added a `useEffect` that updates the existing `<meta name="theme-color">` tag content on recommendation change. Added `viewportFit: "cover"` to the layout viewport export for iOS PWA safe-area support. Deleted `status-banner.tsx` — confirmed zero remaining imports.

**T03** verified everything at 375×812 / 390×844 mobile viewport: glanceable screen fills viewport, text is large and readable (48px), tap expands detail panel, close button collapses it, data source badge visible, theme-color meta correct, no JS errors, no failed network requests.

## Verification

- `npm run build` — clean production build, zero type errors
- `npx vitest run` — 51/51 tests pass (no regression)
- Browser at mobile viewport (390×844):
  - Glanceable screen fills entire viewport (390×844) with recommendation color ✅
  - H1 "NO BUS DATA" renders at 48px font-size (text-5xl) ✅
  - "Waiting for GPS..." subtitle visible ✅
  - "MOCK" data source badge visible ✅
  - Tap expands detail panel with "ROUTE DETAILS", route diagram, "Metro 222 Southbound" ✅
  - Close button is 44×44px, collapses panel back to glanceable ✅
  - `<meta name="theme-color">` content is `#404040` matching NO_DATA ✅
  - `<meta name="viewport">` includes `viewport-fit=cover` ✅
  - Zero JS console errors ✅
  - Zero failed network requests ✅

## Requirements Advanced

- R001 — Glanceable walk-or-wait decision: full-screen color surface implemented and verified at mobile viewport; text-5xl headline readable at arm's length; zero-interaction answer visible immediately
- R002 — Tap-to-expand detail view: tap on glanceable screen expands detail panel with stop cards, route diagram, data source, staleness; close button collapses back
- R009 — Failure visibility: data source badge (realtime/schedule/mock) always visible; staleness warning when >60s; gpsError and dataError rendered as alert badges on glanceable screen; dataError also in detail panel

## Requirements Validated

- R001 — Full-screen color-coded recommendation renders correctly at mobile viewport; headline dominates viewport; answer visible with zero interaction. Proof: browser assertions at 390×844 confirm layout, font size, color fill.
- R002 — Tap-to-expand flow works end-to-end: tap expands, close button collapses, content renders correctly. Proof: browser assertions confirm expand/collapse cycle with correct content.

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- Only verified with NO_DATA/mock state (no GPS in browser environment) — KEEP_WALKING and WAIT color states not exercised in browser. Real-state verification deferred to S04 real-device testing.
- Minor accessibility issue: `aria-hidden` warning when close button retains focus during panel collapse. Not a functional issue; cosmetic fix deferred.
- No swipe-to-expand gesture (D016) — tap only. Revisitable if user wants swipe interaction.

## Follow-ups

- S04 must verify KEEP_WALKING (green) and WAIT (amber) color states on a real device with GPS
- Consider moving focus back to glanceable screen on detail panel close to resolve aria-hidden warning

## Files Created/Modified

- `components/glanceable-screen.tsx` — NEW: full-screen recommendation surface with loading/error/data-source states, exports RECOMMENDATION_STYLES
- `components/detail-panel.tsx` — NEW: slide-up detail panel with stop cards, route diagram, diagnostics, install prompt
- `app/page.tsx` — REWRITTEN: thin orchestrator with expand/collapse state, dynamic theme-color, service worker registration
- `app/layout.tsx` — MODIFIED: added viewportFit: "cover" to viewport export
- `app/globals.css` — MODIFIED: added transition classes, safe-area utilities, pulse-slow keyframes
- `components/status-banner.tsx` — DELETED: fully replaced by GlanceableScreen

## Forward Intelligence

### What the next slice should know
- The app currently shows NO_DATA/mock state because there's no GPS in a browser environment. S04 should test on a real phone to see KEEP_WALKING and WAIT states with actual colors.
- `RECOMMENDATION_STYLES` in `components/glanceable-screen.tsx` is the single source of truth for action → color mapping. Import from there if needed for PWA manifest or splash screen colors.
- `page.tsx` is intentionally thin — all rendering logic lives in GlanceableScreen and DetailPanel. Service worker registration is the only side-effect besides theme-color updates.

### What's fragile
- The detail panel scroll reset (`scrollTo(0,0)` on expand) depends on a ref to the scroll container — if the DOM structure of DetailPanel changes, the ref might break silently.
- `overscroll-behavior: contain` on the detail panel may not fully prevent iOS rubber-banding in all Safari versions — needs real-device verification in S04.

### Authoritative diagnostics
- `document.querySelector('meta[name="theme-color"]').content` — always reflects current recommendation state; trustworthy for automated checking
- Data source badge text in the DOM — "REALTIME", "SCHEDULE", or "MOCK" — is the easiest way to verify which data tier is active

### What assumptions changed
- No assumptions changed — the slice plan was accurate and all must-haves were delivered as specified.
