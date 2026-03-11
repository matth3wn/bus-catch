---
estimated_steps: 5
estimated_files: 0
---

# T03: Browser verification at mobile viewport

**Slice:** S03 — Glanceable UX
**Milestone:** M001

## Description

Prove the UI works in a real browser at mobile viewport size. This is the slice's final verification — build success doesn't prove visual layout, touch interactions, transitions, or failure state rendering. Start the dev server, open the app at 375×812 (iPhone 13/14 viewport), and systematically verify every must-have from the slice plan: glanceable surface fills viewport, recommendation text is large and readable, tap expands detail panel, close collapses it, stop cards and route diagram render, data source badge is visible, and no JS errors in console.

## Steps

1. **Start dev server and open mobile viewport**: Start `npm run dev` as background process. Navigate browser to `http://localhost:3000`. Set viewport to 375×812 (mobile). Wait for page to load and initial state to render.

2. **Verify glanceable screen**: Assert the glanceable screen fills the viewport — a color surface (likely gray/NO_DATA initially since GPS is simulated) with recommendation text visible. Check that the text is large (≥text-5xl equivalent). Verify the loading/initial state doesn't look broken — it should show a pulse animation or "STARTING UP" text. Screenshot for visual record.

3. **Verify tap-to-expand**: Click/tap the glanceable screen surface. Assert the detail panel appears (slides up). Verify stop cards section is visible. Verify route diagram is visible. Verify data source badge is present. Verify a close button exists with adequate size. Screenshot expanded state.

4. **Verify collapse and transitions**: Click the close button. Assert the detail panel slides away and glanceable screen is fully visible again. Verify the transition is smooth (no layout jumps). Check that re-expanding resets scroll position.

5. **Check browser console and diagnostics**: Inspect browser console logs for JS errors — there should be none. Verify no failed network requests that indicate broken imports or missing resources. Document any warnings (GPS errors from simulated environment are expected and acceptable).

## Must-Haves

- [ ] Glanceable screen fills 375×812 viewport with color surface
- [ ] Recommendation text visible and large (dominates viewport)
- [ ] Tap on glanceable screen expands detail panel
- [ ] Detail panel shows stop cards section and route diagram
- [ ] Detail panel shows data source badge
- [ ] Close button collapses detail panel
- [ ] No JavaScript errors in console (GPS warnings acceptable)
- [ ] Transitions are smooth — no layout jumps or broken animations

## Verification

- Browser assertions: text visible, selector visible, no console errors
- Screenshots of: glanceable screen state, expanded detail panel, collapsed state
- Console log check: no JS errors
- Network log check: no failed requests for app resources

## Observability Impact

- Signals added/changed: None — this is a verification-only task
- How a future agent inspects this: Screenshots captured during verification serve as visual baseline; browser assertions document expected DOM state
- Failure state exposed: None new

## Inputs

- T01 output: `components/glanceable-screen.tsx`, `components/detail-panel.tsx`, `app/globals.css`
- T02 output: `app/page.tsx` (rewritten), `app/layout.tsx` (viewport-fit), `status-banner.tsx` (deleted)
- Running dev server at `localhost:3000`

## Expected Output

- Verification record: all browser assertions pass
- Screenshots documenting the three key UI states (glanceable, expanded, collapsed)
- Confirmation that slice verification criteria are met
- Any minor issues found are noted for follow-up (but don't block completion if they're cosmetic edge cases, not must-have failures)
