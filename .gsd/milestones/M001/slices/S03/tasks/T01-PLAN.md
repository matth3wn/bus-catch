---
estimated_steps: 5
estimated_files: 3
---

# T01: Build glanceable screen and detail panel components

**Slice:** S03 — Glanceable UX
**Milestone:** M001

## Description

Create the two core UI components that deliver R001 (glanceable decision) and R002 (tap-to-expand detail). `GlanceableScreen` is a full-viewport color surface showing the walk-or-wait answer at a glance. `DetailPanel` is a slide-up overlay containing stop cards, route diagram, data source badge, and staleness info. Both components consume `BusCatchState` fields directly — no new data fetching or calculation logic. CSS transitions and safe-area utilities go in `globals.css`.

## Steps

1. **Add CSS utilities to `app/globals.css`**: Define `.detail-panel` transition class using `transform: translateY()` + `transition-transform duration-300 ease-out`. Add `.detail-panel-open` with `translateY(0)` and default with `translateY(100%)`. Add `overscroll-behavior: contain` for panel scroll. Add safe-area padding utilities using `env(safe-area-inset-*)`. Add `@keyframes pulse-slow` for loading state.

2. **Create `components/glanceable-screen.tsx`**: Full-screen component accepting `recommendation`, `dataSource`, `staleness`, `dataError`, `gpsError`, `loading`, and `onTap` callback. Color fills entire viewport: `bg-green-600` (KEEP_WALKING), `bg-amber-500` (WAIT), `bg-neutral-700` (NO_DATA). Recommendation text at `text-5xl` or larger, bold, centered. Subtitle with reason text. Loading state: pulsing neutral surface with "STARTING UP..." text. Error overlays: gpsError and dataError shown as semi-transparent badges at top. Data source mini-badge at bottom (visible even on glanceable screen for quick confidence check). `transition-colors duration-500` on the background for smooth color changes. `onClick` handler triggers expand. Full `dvh` height. Safe-area top padding.

3. **Create `components/detail-panel.tsx`**: Slide-up panel accepting `expanded`, `onClose`, plus all BusCatchState fields needed for detail rendering (`stopAnalyses`, `predictions`, `user`, `dataSource`, `staleness`, `lastUpdated`, `dataError`). Uses the CSS transition classes from step 1. Close button at top-right with ≥44px touch target (×). Scrollable content area with `overscroll-behavior: contain`. Renders: data source badge + staleness seconds, stop cards (reuses `StopCard`), route diagram (reuses `RouteDiagram`), last-updated timestamp, install prompt at footer. Safe-area bottom padding for home indicator. Scroll position resets to top on expand via ref + `scrollTo(0, 0)`.

4. **Extract color/text mapping as shared constant**: Create a `RECOMMENDATION_STYLES` map in the glanceable screen file (or a small shared constant) that maps `RecommendationAction` to `{ bg, text, themeColor }` — reusable by both the component and the dynamic theme-color effect in T02. Include hex values for theme-color meta (`#16a34a` for green-600, `#f59e0b` for amber-500, `#404040` for neutral-700).

5. **Type-check**: Run `npx tsc --noEmit` to verify both components compile cleanly against the existing `BusCatchState`, `StopCatchAnalysis`, `BusPrediction`, `UserPosition`, and `Recommendation` types.

## Must-Haves

- [ ] `GlanceableScreen` renders full-viewport color surface with recommendation text at ≥`text-5xl`
- [ ] `GlanceableScreen` handles all three recommendation actions (KEEP_WALKING, WAIT, NO_DATA) with correct colors
- [ ] `GlanceableScreen` shows loading pulse state when `loading=true` and `dataSource=null`
- [ ] `GlanceableScreen` renders error badges for `gpsError` and `dataError`
- [ ] `DetailPanel` slides up with CSS transform transition
- [ ] `DetailPanel` contains stop cards, route diagram, data source badge, staleness info
- [ ] `DetailPanel` close button has ≥44px touch target
- [ ] `DetailPanel` scroll container has `overscroll-behavior: contain`
- [ ] `DetailPanel` scroll resets to top on expand
- [ ] CSS transition classes defined in `globals.css`
- [ ] `transition-colors duration-500` on glanceable background for smooth recommendation changes
- [ ] Both components compile cleanly with `npx tsc --noEmit`

## Verification

- `npx tsc --noEmit` — zero type errors
- Both component files exist and export their main component
- CSS classes for transitions exist in `globals.css`
- Manual inspection: props interfaces match `BusCatchState` fields

## Observability Impact

- Signals added/changed: data source badge renders `dataSource` value as visible text; staleness seconds shown numerically when >0; error alerts render `dataError`/`gpsError` text — these are the visual counterparts of S02's console-level diagnostics
- How a future agent inspects this: browser DOM inspection — data source badge text content, error alert visibility, recommendation text content
- Failure state exposed: gpsError and dataError are now visually rendered (previously only in console), making failure states user-visible for the first time

## Inputs

- `lib/types.ts` — `BusCatchState`, `Recommendation`, `RecommendationAction`, `StopCatchAnalysis`, `BusPrediction`, `UserPosition` types
- `lib/constants.ts` — `STALENESS_WARNING_SECONDS` for staleness badge threshold
- `components/stop-card.tsx` — reused inside detail panel
- `components/route-diagram.tsx` — reused inside detail panel
- `components/install-prompt.tsx` — moved into detail panel footer
- `components/status-banner.tsx` — extract color mapping pattern, then this file is deleted in T02
- S03-RESEARCH.md — design constraints, color choices, pitfall avoidance (rubber-banding, transition on height:auto, safe areas)

## Expected Output

- `components/glanceable-screen.tsx` — NEW: full-screen recommendation surface component with failure state rendering
- `components/detail-panel.tsx` — NEW: slide-up detail panel with stop cards, route diagram, diagnostics
- `app/globals.css` — MODIFIED: transition classes, safe-area utilities, loading animation keyframes
