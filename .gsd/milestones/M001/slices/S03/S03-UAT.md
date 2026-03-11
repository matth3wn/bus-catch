# S03: Glanceable UX — UAT

**Milestone:** M001
**Written:** 2026-03-11

## UAT Type

- UAT mode: live-runtime
- Why this mode is sufficient: The glanceable UX must be verified in a real browser at mobile viewport size — build success alone cannot prove visual layout, transitions, tap interactions, or failure state rendering. Browser viewport rendering with assertions is sufficient for S03; real-device testing is S04's scope.

## Preconditions

- Dev server running (`npm run dev`) or production build served
- Browser viewport set to mobile (375×812 or 390×844)
- No GPS available in browser (app will show NO_DATA/mock state — this is expected)

## Smoke Test

Open http://localhost:3000 at mobile viewport → see a full-screen gray surface with "NO BUS DATA" in large text and "MOCK" badge at bottom. If this renders, the core glanceable UX is working.

## Test Cases

### 1. Glanceable screen fills viewport

1. Navigate to http://localhost:3000 at 390×844 viewport
2. Inspect the main `role="button"` container
3. **Expected:** Container fills exactly 390×844 with `bg-neutral-700` gray background, no overflow or gaps

### 2. Recommendation text is readable at arm's length

1. Check the H1 element on the glanceable screen
2. **Expected:** "NO BUS DATA" at 48px font-size (text-5xl), centered, white text on gray background

### 3. Data source badge visible

1. Look at the bottom of the glanceable screen
2. **Expected:** "MOCK" badge visible in a rounded pill

### 4. Tap expands detail panel

1. Click/tap anywhere on the glanceable screen
2. **Expected:** Detail panel slides up with "ROUTE DETAILS" heading, "MOCK" data source badge, route diagram with stop circles, "Metro 222 Southbound · Cahuenga Blvd" footer

### 5. Close button collapses detail panel

1. With detail panel expanded, click the × close button (aria-label="Close detail panel")
2. **Expected:** Panel slides down, glanceable screen restored with "NO BUS DATA" visible. Close button is 44×44px.

### 6. Dynamic theme-color matches state

1. Inspect `<meta name="theme-color">` in the DOM
2. **Expected:** content attribute is `#404040` (matching NO_DATA gray)

### 7. Viewport-fit cover enabled

1. Inspect `<meta name="viewport">` in the DOM
2. **Expected:** Contains `viewport-fit=cover`

### 8. Detail panel content complete

1. Expand the detail panel
2. **Expected:** Shows route diagram, "Updated Xs ago" staleness, "Metro 222 Southbound · Cahuenga Blvd" route info, data source badge

## Edge Cases

### Re-expand scroll position reset

1. Expand detail panel, scroll down if content overflows
2. Close panel, re-expand
3. **Expected:** Scroll position resets to top on re-expand

### GPS waiting state display

1. Load app without GPS (default browser environment)
2. **Expected:** "Waiting for GPS..." text visible as subtitle — this is the expected initial state, not a broken state

## Failure Signals

- Glanceable screen does not fill viewport (visible background behind the color surface)
- H1 text is smaller than 48px or not visible
- Tap on glanceable screen does not expand detail panel
- Close button missing or smaller than 44×44px
- "MOCK" badge not visible
- JavaScript console errors present
- Detail panel content missing route diagram or staleness info
- Theme-color meta tag missing or incorrect value

## Requirements Proved By This UAT

- R001 — Glanceable walk-or-wait decision: full-screen color surface fills viewport, headline text readable at arm's length (48px), answer visible with zero interaction, verified at mobile viewport
- R002 — Tap-to-expand detail view: tap expands detail panel with stop cards, route diagram, data source; close button collapses back; smooth transitions
- R009 — Failure visibility (partial): data source badge always visible (mock/realtime/schedule), staleness info displayed, GPS waiting state shown. Full failure-state rendering (gpsError alerts, dataError alerts, staleness warning thresholds) is structurally present but only partially exercisable without GPS/real API — those states verified by code review and type contracts.

## Not Proven By This UAT

- R001 color states for KEEP_WALKING (green) and WAIT (amber) — only NO_DATA (gray) is exercisable without GPS. Real color states require S04 real-device testing.
- R009 live failure transitions — staleness warning escalation (60s → 120s), API error display, GPS error alert rendering under real conditions. These are wired and type-checked but not exercised in browser-only testing.
- R008 — PWA deployment, service worker caching, home screen installation — deferred to S04.
- Real-device iOS safe-area rendering — viewport-fit=cover is set but actual env(safe-area-inset-*) behavior requires an iPhone with notch.

## Notes for Tester

- The app will always show NO_DATA/MOCK state in a desktop browser because GPS is not available. This is expected behavior, not a bug.
- The detail panel contains "No stops ahead" because there's no real position data — this is correct for mock state.
- The aria-hidden accessibility warning in the console (when closing detail panel) is a known cosmetic issue, not a functional bug.
- To see KEEP_WALKING or WAIT states, you'd need to either (a) test on a real phone with GPS near Cahuenga Blvd, or (b) mock GPS coordinates in browser DevTools.
