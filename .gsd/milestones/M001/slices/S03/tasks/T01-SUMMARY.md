---
id: T01
parent: S03
milestone: M001
provides:
  - GlanceableScreen component — full-screen color-coded recommendation surface
  - DetailPanel component — slide-up overlay with stop cards, route diagram, diagnostics
  - RECOMMENDATION_STYLES shared constant — color/text/themeColor mapping per action
  - CSS transition classes and safe-area utilities in globals.css
key_files:
  - components/glanceable-screen.tsx
  - components/detail-panel.tsx
  - app/globals.css
key_decisions:
  - Loading state uses CSS @keyframes pulse-slow animation (inline style) rather than Tailwind animate-pulse — gives more control over timing (2s cycle) for a calmer startup feel
  - RECOMMENDATION_STYLES exported from glanceable-screen.tsx rather than a separate constants file — T02 can import from there for theme-color meta updates
  - Detail panel uses fixed inset-0 positioning with CSS transform transition rather than max-height animation — avoids the "can't transition height:auto" pitfall from research
patterns_established:
  - Shared RECOMMENDATION_STYLES constant maps RecommendationAction → { bg, text, themeColor } for UI consistency
  - Safe-area CSS utilities (.pt-safe, .pb-safe, etc.) for iOS PWA standalone mode
  - .detail-panel / .detail-panel-open CSS classes for slide-up overlay pattern
observability_surfaces:
  - Data source badge rendered on both glanceable screen (mini) and detail panel (full) — shows realtime/schedule/mock
  - Staleness seconds displayed numerically when >0, warning style when >STALENESS_WARNING_SECONDS
  - gpsError and dataError rendered as semi-transparent alert badges on glanceable screen
  - dataError also shown in detail panel body
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T01: Build glanceable screen and detail panel components

**Created GlanceableScreen (full-viewport color recommendation surface) and DetailPanel (slide-up detail overlay) with shared RECOMMENDATION_STYLES constant and CSS transition/safe-area utilities.**

## What Happened

Built three deliverables:

1. **`components/glanceable-screen.tsx`** — Full-screen component that fills the viewport with recommendation color (green-600/amber-500/neutral-700), shows headline text at text-5xl, reason subtitle, error badges at top, data source mini-badge at bottom. Loading state pulses neutral with "STARTING UP…" text. `transition-colors duration-500` smooths recommendation changes. Exported `RECOMMENDATION_STYLES` constant maps each `RecommendationAction` to `{ bg, text, themeColor }` for reuse in T02's theme-color meta.

2. **`components/detail-panel.tsx`** — Fixed overlay that slides up via CSS transform transition. Contains close button (44px touch target), data source + staleness badge, data error display, route diagram + stop cards layout, last-updated timestamp, and InstallPrompt at footer. Scroll resets to top on expand via ref. `overscroll-behavior: contain` prevents iOS rubber-banding.

3. **`app/globals.css`** — Added `.detail-panel` / `.detail-panel-open` transition classes, `.overscroll-contain`, safe-area padding utilities (`.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe`), and `@keyframes pulse-slow`.

## Verification

- `npx tsc --noEmit` — zero type errors
- `npm run build` — clean build, all pages generated
- `npx vitest run` — all 51 tests pass (no regression)
- Both component files exist and export their main components plus RECOMMENDATION_STYLES
- CSS transition classes confirmed in globals.css
- Props interfaces manually verified against BusCatchState fields

## Diagnostics

- GlanceableScreen renders `dataSource` as visible badge text — inspect via DOM `.rounded-full` badge in bottom area
- Error badges visible at top of glanceable screen when `gpsError`/`dataError` are non-null
- Staleness displayed numerically on both glanceable screen and detail panel
- Detail panel data source badge shows tier with staleness warning (⚠) when > STALENESS_WARNING_SECONDS

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `components/glanceable-screen.tsx` — NEW: full-screen recommendation surface with loading/error/data-source states, exports RECOMMENDATION_STYLES
- `components/detail-panel.tsx` — NEW: slide-up detail panel with stop cards, route diagram, diagnostics, install prompt
- `app/globals.css` — MODIFIED: added transition classes, safe-area utilities, pulse-slow keyframes
