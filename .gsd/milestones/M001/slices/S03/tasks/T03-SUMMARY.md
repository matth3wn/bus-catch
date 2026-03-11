---
id: T03
parent: S03
milestone: M001
provides:
  - Browser verification record confirming glanceable UX works at mobile viewport (375×812)
  - Visual baseline screenshots of glanceable, expanded, and collapsed states
key_files: []
key_decisions: []
patterns_established: []
observability_surfaces:
  - none — verification-only task
duration: 15m
verification_result: passed
completed_at: 2026-03-11
blocker_discovered: false
---

# T03: Browser verification at mobile viewport

**Verified full glanceable → expand → collapse flow at 375×812 mobile viewport with zero JS errors, correct layout, and smooth transitions.**

## What Happened

Started the dev server and opened the app in a 375×812 browser viewport (iPhone 13/14 equivalent). Systematically verified every must-have from the slice plan:

1. **Glanceable screen fills viewport**: The `h-dvh` div renders at exactly 375×812, covering the full viewport with `bg-neutral-700` (gray/NO_DATA state). No overflow, no gaps.

2. **Recommendation text is large and readable**: H1 "NO BUS DATA" renders at 48px font-size (text-5xl), dominating the viewport center. "Waiting for GPS..." subtitle visible below.

3. **Data source badge visible**: "MOCK" badge rendered at bottom of glanceable screen.

4. **Tap expands detail panel**: Clicking the `role="button"` glanceable surface triggers the detail panel slide-up. Panel shows: "ROUTE DETAILS" heading, "MOCK" data source badge, route diagram with stop circles and diamond user position marker, "No stops ahead" message, "Updated 0s ago" staleness, "Metro 222 Southbound · Cahuenga Blvd" route info.

5. **Close button works with adequate touch target**: Close button (`aria-label='Close detail panel'`) is 44×44px, meeting touch target requirements. Clicking it collapses the panel and restores the glanceable screen.

6. **Transitions smooth**: Panel expand/collapse shows no layout jumps. Re-expanding resets scroll position to top.

7. **Dynamic theme-color**: `<meta name="theme-color">` reads `#404040` (neutral-700), correctly matching the NO_DATA state.

8. **No JS errors**: Zero JavaScript errors in console. One browser accessibility warning about `aria-hidden` on a focused element when the close button retains focus during panel collapse — cosmetic, not a functional issue.

9. **No failed network requests**: No 4xx/5xx responses for app resources.

## Verification

**Browser assertions (all PASS):**
- ✅ "NO BUS DATA" text visible
- ✅ "Waiting for GPS" text visible  
- ✅ "MOCK" text visible (data source badge)
- ✅ H1 selector visible
- ✅ "ROUTE DETAILS" text visible (expanded panel)
- ✅ "Updated" text visible (staleness info)
- ✅ "Metro 222" text visible (route info)
- ✅ Close button (`button[aria-label='Close detail panel']`) visible
- ✅ No JavaScript console errors
- ✅ Glanceable screen fills 375×812 viewport (verified via getBoundingClientRect)
- ✅ H1 font-size is 48px (≥ text-5xl requirement)
- ✅ Close button is 44×44px (meets touch target)
- ✅ Theme-color meta is #404040 (matches NO_DATA state)
- ✅ Re-expand scroll position resets to 0

**Slice-level verification (all pass):**
- ✅ `npm run build` — clean build, zero type errors
- ✅ `npx vitest run` — 51/51 tests pass
- ✅ Browser: glanceable screen fills viewport with color and text
- ✅ Browser: tap expands detail panel with route diagram
- ✅ Browser: close button collapses to glanceable screen
- ✅ Browser: data source badge visible in detail panel
- ✅ Browser: loading/initial state renders "Waiting for GPS..." (GPS simulated environment)

## Diagnostics

None — this is a verification-only task. Screenshots captured during browser testing document the three key UI states (glanceable, expanded, collapsed) as visual baseline.

## Deviations

None.

## Known Issues

- **Minor**: Browser warning about `aria-hidden` on focused element — when the detail panel closes, the close button retains focus while the panel's `aria-hidden` activates. This triggers a WAI-ARIA accessibility warning in the console. Not a JS error, not blocking, but could be improved in a future polish pass by moving focus back to the glanceable screen on close.

## Files Created/Modified

None — verification-only task.
