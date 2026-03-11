---
estimated_steps: 5
estimated_files: 4
---

# T02: Wire page.tsx, layout viewport, and dynamic theme-color

**Slice:** S03 — Glanceable UX
**Milestone:** M001

## Description

Connect T01's components to the running app. Rewrite `page.tsx` as the orchestrator that renders `GlanceableScreen` ↔ `DetailPanel` with expand/collapse state. Wire `viewport-fit: cover` into the layout for iOS PWA safe area support. Add a `useEffect` that dynamically updates `<meta name="theme-color">` to match the current recommendation color — green, amber, or gray. Delete `status-banner.tsx` (fully replaced). This task completes the integration: after it, the app's UI is fully functional in dev mode.

## Steps

1. **Rewrite `app/page.tsx`**: Import `GlanceableScreen` and `DetailPanel`. Add `expanded` boolean state (default `false`). Pass `useBusCatch()` state fields to both components. `GlanceableScreen` `onTap` sets `expanded=true`. `DetailPanel` `onClose` sets `expanded=false`. Keep service worker registration `useEffect`. Structure: both components render simultaneously — glanceable screen is always present, detail panel overlays on top when expanded. This avoids unmounting the glanceable screen during transitions.

2. **Add dynamic theme-color `useEffect`**: In `page.tsx`, add a `useEffect` keyed on `state.recommendation.action` that finds the existing `<meta name="theme-color">` element via `document.querySelector('meta[name="theme-color"]')` and updates its `content` attribute to the matching hex color from the `RECOMMENDATION_STYLES` map (imported from glanceable-screen or defined locally). Colors: `#16a34a` (KEEP_WALKING/green-600), `#f59e0b` (WAIT/amber-500), `#404040` (NO_DATA/neutral-700). Don't create/destroy meta tags — just update the existing one from layout.tsx.

3. **Update `app/layout.tsx` viewport**: Add `viewportFit: 'cover'` to the exported `viewport` object. This enables `env(safe-area-inset-*)` CSS functions to return real values in iOS PWA standalone mode. The existing `themeColor` stays as default — the dynamic effect overrides it at runtime.

4. **Delete `components/status-banner.tsx`**: This component is fully replaced by `GlanceableScreen`. Remove the file. Verify no other imports reference it (only `page.tsx` did, and it's been rewritten).

5. **Build and test**: Run `npm run build` to verify zero type errors and clean production build. Run `npx vitest run` to verify all 51 existing tests still pass — no regressions from UI restructuring (tests are for lib/ functions, not components, so they should be unaffected).

## Must-Haves

- [ ] `page.tsx` renders `GlanceableScreen` + `DetailPanel` with `expanded` state toggle
- [ ] Tapping glanceable screen sets `expanded=true`, close button sets `expanded=false`
- [ ] Dynamic `<meta name="theme-color">` updates on recommendation action change
- [ ] `viewport-fit: cover` added to layout viewport export
- [ ] `status-banner.tsx` deleted — no remaining imports
- [ ] Service worker registration preserved in page.tsx
- [ ] `npm run build` succeeds with zero errors
- [ ] `npx vitest run` passes all 51 tests

## Verification

- `npm run build` — clean build, zero type errors
- `npx vitest run` — 51 tests pass, 0 failures
- `grep -r "status-banner" app/ components/ lib/` — no results (file fully removed)
- Manual inspection: `page.tsx` imports and renders both new components
- Manual inspection: `layout.tsx` viewport includes `viewportFit: 'cover'`

## Observability Impact

- Signals added/changed: dynamic `<meta name="theme-color">` is an inspectable DOM signal — its `content` attribute always reflects the current recommendation state (green/amber/gray hex)
- How a future agent inspects this: `document.querySelector('meta[name="theme-color"]').content` returns current theme color; `expanded` React state controls panel visibility
- Failure state exposed: none new — failure rendering was established in T01's components; this task wires them to live data

## Inputs

- `components/glanceable-screen.tsx` — from T01, `GlanceableScreen` component + `RECOMMENDATION_STYLES` or equivalent color map
- `components/detail-panel.tsx` — from T01, `DetailPanel` component
- `lib/use-bus-catch.ts` — `useBusCatch()` hook returning `BusCatchState`
- `app/layout.tsx` — existing viewport export to modify
- `components/status-banner.tsx` — to be deleted

## Expected Output

- `app/page.tsx` — REWRITTEN: orchestrator with glanceable screen + detail panel + expand state + dynamic theme-color
- `app/layout.tsx` — MODIFIED: viewport-fit: cover added
- `components/status-banner.tsx` — DELETED
- Build clean, all tests green
