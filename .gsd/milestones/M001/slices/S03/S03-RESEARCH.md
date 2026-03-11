# S03: Glanceable UX — Research

**Date:** 2026-03-11

## Summary

S03 redesigns the app's entire UI around a single design principle: **the screen IS the answer**. The current `page.tsx` renders a banner + scrollable stop cards + route diagram — requiring reading and scanning. The target UX is a full-screen color-coded surface (green = keep walking, amber = wait at stop, gray = no data) with the recommendation word/phrase dominating the viewport, and a tap/swipe-up gesture to expand a detail panel with stop cards and route diagram.

The codebase is well-positioned for this: `useBusCatch()` already returns everything needed (`recommendation`, `stopAnalyses`, `predictions`, `user`, plus S02's `dataSource`/`staleness`/`dataError` fields). No new data fetching or calculation logic is required. The work is purely presentational — restructure `page.tsx`, replace `StatusBanner` with a full-screen glanceable component, create an expandable detail panel, render failure states from S02's new fields, and add CSS transitions for the expand/collapse gesture.

Key technical consideration: this must work in iOS Safari standalone mode (PWA), which requires careful handling of `viewport-fit=cover`, `env(safe-area-inset-*)`, `dvh` units, and touch gesture handling that doesn't conflict with Safari's own swipe gestures.

## Recommendation

**Approach: CSS-only animations + React state for expand/collapse. No animation library.**

The project has zero animation dependencies and the interactions are simple (expand/collapse panel, color transitions). CSS transitions (`transition-*` Tailwind utilities + custom CSS for `transform` / `max-height`) are sufficient and add no bundle weight. Framer Motion would be overkill for one expand/collapse gesture.

**Component architecture:**
1. `app/page.tsx` — orchestrator: renders glanceable screen or expanded detail based on `expanded` state
2. `components/glanceable-screen.tsx` — NEW: full-screen color surface with recommendation text, data source indicator, failure badges
3. `components/detail-panel.tsx` — NEW: expandable bottom panel containing existing stop cards + route diagram + staleness info
4. `components/status-banner.tsx` — DELETE: replaced entirely by glanceable-screen
5. `components/stop-card.tsx` — KEEP: minor refinements for new layout context
6. `components/route-diagram.tsx` — KEEP: minor refinements for new layout context
7. `components/install-prompt.tsx` — KEEP: move into detail panel or overlay

**State model:** Single `expanded: boolean` in `page.tsx`. Tap anywhere on glanceable screen → expand. Tap close button or swipe down → collapse. No routing, no separate pages.

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Expand/collapse animation | CSS `transition` + `transform: translateY()` | Zero-dependency, GPU-accelerated, Tailwind has `transition-transform duration-300` built in |
| Safe area insets | `env(safe-area-inset-*)` CSS + `viewport-fit=cover` meta | Standard web platform API for iOS notch/home indicator — no library needed |
| Dynamic viewport height | `dvh` CSS unit (already used: `min-h-dvh`) | Already in codebase, handles iOS Safari dynamic toolbar correctly |
| Touch gesture detection | `onClick` for tap-to-expand | Simple tap is sufficient per requirements; swipe-up is nice-to-have but adds complexity |
| Color transitions | CSS `transition-colors` | Smooth color changes when recommendation changes (KEEP_WALKING → WAIT) |

## Existing Code and Patterns

- `app/page.tsx` — Current orchestrator. Consumes `useBusCatch()` and renders banner + stop cards + route diagram. Will be restructured to render glanceable screen with expand/collapse.
- `components/status-banner.tsx` — Has the `STYLES` map (`KEEP_WALKING` → green, `WAIT` → amber, `NO_DATA` → gray) and headline logic. Extract the color/text mapping pattern but replace the component entirely.
- `components/stop-card.tsx` — `formatSeconds()` helper is useful. Stop card layout works well — keep in detail panel. Note: already handles the `recommended` flag with "WAIT HERE" badge.
- `components/route-diagram.tsx` — Fixed 400px height diagram. May need dynamic height in detail panel. Uses stop analyses + predictions + user position.
- `components/install-prompt.tsx` — iOS detection + dismissable banner. Move into detail panel footer or keep as overlay on glanceable screen.
- `lib/types.ts` — `BusCatchState` has all fields needed: `recommendation` (action + waitStop + reason), `dataSource`, `staleness`, `dataError`, `gpsError`, `loading`. No type changes needed.
- `lib/use-bus-catch.ts` — Returns complete `BusCatchState`. S03 is a pure consumer — no modifications needed.
- `app/layout.tsx` — Already has `apple-web-app` meta, `viewport` with `userScalable: false`. Need to add `viewport-fit: cover` for safe area support.
- `app/manifest.ts` — `background_color` and `theme_color` are both `#0a0a0a`. The theme_color may need to be dynamic (match recommendation color) — but PWA manifest is static. Consider using `<meta name="theme-color">` dynamically instead.
- `app/globals.css` — Minimal (just Tailwind import + CSS vars). Will need expand/collapse transition classes and possibly safe-area padding utilities.

## Constraints

- **No animation library** — No framer-motion, react-spring, etc. in deps. CSS transitions only. Adding a dependency purely for one expand/collapse is unjustified.
- **iOS Safari standalone mode** — Must respect safe area insets (notch, home indicator). `viewport-fit=cover` in viewport meta + `env(safe-area-inset-*)` padding. The current layout.tsx viewport export doesn't include `viewportFit`.
- **Tailwind 4 with no config file** — Tailwind 4 uses CSS-first configuration via `@import "tailwindcss"`. No `tailwind.config.ts`. Custom values use `@theme` directive in CSS or arbitrary values in classes. No custom theme extensions available without adding to `globals.css`.
- **React 19** — `use client` directive required on all interactive components (already established pattern).
- **`dvh` already in use** — `min-h-dvh` is used in current page. Continue using `dvh` for full-viewport calculations to handle iOS Safari's dynamic toolbar.
- **8 stops on route** — Detail panel must accommodate 8 stop cards (though typically only 3-5 are shown — those ahead of user). Route diagram is 400px fixed height.
- **Touch target sizing** — The entire glanceable screen is the tap target. In detail panel, close button needs ≥44px touch target per iOS HIG.
- **theme_color** — PWA manifest theme_color is static. Dynamic `<meta name="theme-color">` can override it at runtime to match recommendation color (green/amber/gray), giving the status bar a matching color.

## Common Pitfalls

- **iOS Safari rubber-banding on scroll** — When detail panel is expanded and scrollable, iOS Safari's elastic overscroll can feel broken. Use `overscroll-behavior: contain` on the detail panel to prevent it from bouncing the whole page.
- **Tap delay on iOS** — iOS Safari has a 300ms tap delay in some contexts. The viewport meta already has `maximum-scale=1` and `user-scalable=no`, which eliminates the delay on modern iOS. Verify this works in standalone mode.
- **CSS transition on `height: auto`** — Can't transition `height` from `0` to `auto`. Use `transform: translateY(100%)` → `translateY(0)` for the detail panel slide-up instead of height animation. Or use `max-height` with a large fixed value.
- **Z-index stacking in PWA** — In standalone mode, there's no browser chrome to worry about, but the status bar area is still present. Ensure glanceable screen extends under status bar with safe-area padding.
- **Dynamic theme-color and re-renders** — Updating `<meta name="theme-color">` on every recommendation change requires DOM manipulation. Use a `useEffect` that updates the meta tag content when `recommendation.action` changes. Don't create/destroy meta tags — just update the existing one's `content` attribute.
- **Detail panel scroll position reset** — When collapsing and re-expanding the detail panel, scroll position should reset to top. Use a ref on the scrollable container and call `scrollTo(0, 0)` on expand.
- **Conflicting touch handlers** — If using touch events for swipe-to-expand, ensure they don't conflict with the detail panel's scroll. Simple approach: tap-only for expand/collapse (no swipe gesture), which avoids all conflicts.
- **Color contrast accessibility** — Green background + white text and amber background + black text both pass WCAG AA for large text. Verify the specific green and amber shades used maintain sufficient contrast. Current `StatusBanner` uses `bg-green-600` (white text) and `bg-amber-500` (black text) — both are good choices.

## Open Risks

- **Vibration on recommendation change** — `useBusCatch` already calls `navigator.vibrate()` on recommendation changes. This works in the background — no UI work needed, but verify it still fires correctly when the glanceable screen re-renders.
- **Large text readability at arm's length** — The recommendation text needs to be readable when the phone is pulled from pocket at arm's length. This means very large font size (at least `text-4xl` or larger). Test with actual mobile viewport (375px width) to ensure the text doesn't truncate, especially for "WAIT AT CAHUENGA / BARHAM" which is the longest possible recommendation.
- **Detail panel content overflow** — If all 8 stops are shown (unlikely but possible at route start), the detail panel must scroll. Ensure the route diagram + stop cards fit in a scrollable container.
- **Recommendation flicker** — If predictions update and the recommendation briefly changes then reverts, the full-screen color flash would be jarring. The catch calculator already handles this by choosing the nearest catchable stop deterministically, but rapid API updates could still cause flicker. Consider debouncing the visual color change (CSS `transition-colors duration-500` or longer).
- **No data state on first load** — Before GPS lock and first API poll, the screen shows "NO_DATA / Starting up...". This is the first thing the user sees. Needs to feel intentional, not broken — a loading/pulsing state rather than a gray "no data" screen.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Frontend design | `frontend-design` | installed (user skill) — guides distinctive, production-grade UI. Relevant for glanceable UX aesthetic choices. |
| Tailwind CSS animations | `josiahsiegel/claude-plugin-marketplace@tailwindcss-animations` | available (834 installs) — low install count, likely unnecessary given CSS-only approach |
| Next.js App Router | `wshobson/agents@nextjs-app-router-patterns` | available (7.8K installs) — potentially useful but S03 is purely UI work, not routing |

**Recommendation:** The installed `frontend-design` skill is directly relevant and should guide the aesthetic direction of the glanceable screen. No additional skills needed — the work is CSS transitions + React component restructuring, well within standard patterns.

## Sources

- Existing codebase exploration: `app/page.tsx`, all components, `lib/types.ts`, `lib/use-bus-catch.ts`, `lib/constants.ts`, `app/layout.tsx`, `app/manifest.ts`
- S02 summary: forward intelligence on `BusCatchState.dataSource`, `staleness`, `dataError` fields and their semantics
- D002 (Decisions Register): glanceable UX pattern — full-screen color = answer, tap to expand detail
- D005: data source indicator in state — UI must render `dataSource` for failure visibility
- iOS PWA considerations from training data: `viewport-fit=cover`, `env(safe-area-inset-*)`, `dvh` units, `apple-mobile-web-app-capable` meta
