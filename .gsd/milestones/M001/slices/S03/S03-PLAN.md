# S03: Glanceable UX

**Goal:** App shows a full-screen color-coded walk-or-wait answer with tap-to-expand detail panel, rendering failure states visually, verified in mobile viewport browser rendering.
**Demo:** Open app in 375×812 mobile viewport → see full-screen green/amber/gray surface with large recommendation text → tap to expand → see stop cards, route diagram, data source badge, staleness indicator → tap to collapse → smooth transitions throughout.

## Must-Haves

- Full-screen color surface: green (KEEP_WALKING), amber (WAIT), gray (NO_DATA) fills viewport
- Recommendation text dominates viewport — readable at arm's length (`text-5xl` or larger)
- WAIT state shows stop name (e.g. "WAIT AT CAHUENGA / BARHAM")
- Tap anywhere on glanceable screen expands detail panel
- Detail panel contains stop cards, route diagram, data source indicator, staleness info
- Detail panel scrolls if content overflows; close button with ≥44px touch target
- Failure visibility: dataSource badge (realtime/schedule/mock), staleness warning, dataError display, gpsError display
- Loading state (before first GPS + first API fetch) feels intentional — pulsing, not broken
- Dynamic `<meta name="theme-color">` matches recommendation color
- `viewport-fit: cover` + `env(safe-area-inset-*)` padding for iOS PWA standalone mode
- CSS-only transitions — no animation library (D002, research constraint)
- `overscroll-behavior: contain` on detail panel to prevent iOS rubber-banding leak

## Proof Level

- This slice proves: integration (UI correctly consumes BusCatchState, renders all states, handles expand/collapse)
- Real runtime required: yes — must render in a browser at mobile viewport size and exercise the UI
- Human/UAT required: no — browser viewport rendering and assertions are sufficient for this slice; real-device testing is S04

## Verification

- `npm run build` — zero type errors, clean build (proves all component contracts compile)
- `npx vitest run` — all existing 51 tests still pass (no regression)
- Browser verification at 375×812 viewport:
  - Glanceable screen fills viewport with recommendation color and text
  - Tap expands detail panel with stop cards and route diagram
  - Tap collapse button returns to glanceable screen
  - Data source badge visible in detail panel
  - Loading state renders correctly before data arrives
- At least one failure-state render: gpsError or dataError visible when present

## Observability / Diagnostics

- Runtime signals: dynamic `<meta name="theme-color">` updates on recommendation change (inspectable via DOM); `console.warn('[bus-catch] Data stale')` from S02 still fires
- Inspection surfaces: data source badge visible in detail panel UI; staleness seconds displayed when >0; dataError/gpsError rendered as dismissable or persistent alerts
- Failure visibility: three tiers — (1) data source badge always shows active tier, (2) staleness >60s shows warning badge, (3) dataError/gpsError shows alert overlay on glanceable screen
- Redaction constraints: none — no secrets in UI layer

## Integration Closure

- Upstream surfaces consumed: `BusCatchState` from `lib/use-bus-catch.ts` (all fields including S02's `dataSource`, `staleness`, `dataError`, `gpsError`); `Recommendation`, `StopCatchAnalysis`, `BusPrediction`, `UserPosition` types from `lib/types.ts`; `STALENESS_WARNING_SECONDS` from `lib/constants.ts`
- New wiring introduced in this slice: `page.tsx` → `GlanceableScreen` + `DetailPanel` composition replaces current `StatusBanner` + inline layout; dynamic theme-color meta tag via `useEffect`; `viewport-fit: cover` in layout viewport export
- What remains before the milestone is truly usable end-to-end: S04 — deploy to public URL, PWA service worker caching, real-device installation and validation

## Tasks

- [x] **T01: Build glanceable screen and detail panel components** `est:1h`
  - Why: Core UI deliverable — the full-screen recommendation surface (R001) and expandable detail panel (R002) are the two primary requirements this slice owns
  - Files: `components/glanceable-screen.tsx`, `components/detail-panel.tsx`, `app/globals.css`
  - Do: Create `GlanceableScreen` — full-screen color surface with recommendation text, data source badge, failure alerts, loading pulse state. Create `DetailPanel` — slide-up panel with stop cards, route diagram, staleness info, close button. Add CSS transition classes and safe-area utilities to `globals.css`. Color mapping: green-600 (KEEP_WALKING), amber-500 (WAIT), neutral-700 (NO_DATA). Use `dvh` for full viewport. CSS `transform: translateY()` for panel animation. `overscroll-behavior: contain` on panel scroll container.
  - Verify: Components exist, export correctly, TypeScript compiles with `npx tsc --noEmit`
  - Done when: Both components created with correct props interfaces consuming BusCatchState fields, all failure states handled, CSS transitions defined

- [x] **T02: Wire page.tsx, layout viewport, and dynamic theme-color** `est:45m`
  - Why: Connects the new components to the app — replaces current page layout, adds iOS PWA viewport support, and wires dynamic theme-color (completing R001, R002, R009 integration)
  - Files: `app/page.tsx`, `app/layout.tsx`, `components/status-banner.tsx`
  - Do: Rewrite `page.tsx` to render `GlanceableScreen` + `DetailPanel` with `expanded` state toggle. Add `viewport-fit: cover` to layout viewport export. Add `useEffect` for dynamic `<meta name="theme-color">` keyed on `recommendation.action`. Move `InstallPrompt` into detail panel footer. Delete `status-banner.tsx` (fully replaced). Ensure service worker registration stays.
  - Verify: `npm run build` succeeds, `npx vitest run` passes all 51 tests, no type errors
  - Done when: App builds clean, page.tsx orchestrates glanceable → detail flow, status-banner.tsx deleted, viewport-fit and theme-color wired

- [x] **T03: Browser verification at mobile viewport** `est:30m`
  - Why: Proves the UI actually renders correctly — build success alone doesn't verify visual layout, transitions, tap interactions, or failure state rendering (proves R001, R002, R009 in a real browser)
  - Files: none (verification-only task)
  - Do: Start dev server, open browser at 375×812 viewport. Verify: glanceable screen fills viewport with color + text, tap expands detail panel, close button collapses it, stop cards and route diagram render in panel, data source badge visible, loading state shows pulse animation. Check console for errors. Screenshot key states.
  - Verify: All browser assertions pass — color surface visible, detail panel expands/collapses, no JS errors
  - Done when: Full glanceable → expand → collapse flow works in mobile viewport browser with no console errors

## Files Likely Touched

- `components/glanceable-screen.tsx` — NEW: full-screen recommendation surface
- `components/detail-panel.tsx` — NEW: expandable detail panel
- `app/page.tsx` — REWRITE: orchestrator with expanded state
- `app/layout.tsx` — MODIFY: add viewport-fit: cover
- `app/globals.css` — MODIFY: add transition classes, safe-area utilities
- `components/status-banner.tsx` — DELETE: replaced by glanceable-screen
- `components/stop-card.tsx` — MINOR: may adjust for detail panel context
- `components/route-diagram.tsx` — MINOR: may adjust height for detail panel
- `components/install-prompt.tsx` — MOVE: into detail panel footer
