---
estimated_steps: 4
estimated_files: 1
---

# T03: Real-device PWA validation

**Slice:** S04 — Deploy & Validate
**Milestone:** M001

## Description

Validate the deployed app on a real phone — the final acceptance gate for the milestone. All prior slices were verified in desktop browser; this task proves the app works as a real PWA with GPS, standalone mode, service worker caching, and correct visual states. Write a UAT checklist, walk through it on a real device, and document results.

## Steps

1. Write `S04-UAT.md` with a structured checklist covering: (a) PWA installability — manifest detected, install prompt or iOS add-to-home-screen works; (b) standalone mode — app opens from home screen without browser chrome; (c) GPS — permission prompt appears, location tracking activates, recommendation updates; (d) visual states — correct colors for KEEP_WALKING (green), WAIT (amber), NO_DATA (gray); (e) detail panel — tap expands, shows route diagram and stop cards, close collapses; (f) service worker — shell loads from cache when offline (airplane mode test); (g) data source badge — shows correct tier (realtime/schedule/mock); (h) iOS Safari quirks — safe-area padding, overscroll containment, theme-color in status bar.
2. Visit the deployed URL on a real phone (iOS or Android). Walk through each checklist item. For GPS-dependent items, allow location access and observe whether the recommendation changes from NO_DATA to a real KEEP_WALKING or WAIT state.
3. Document pass/fail for each item in the UAT checklist, noting any issues found. Take note of any visual or behavioral issues that differ from desktop browser testing.
4. If critical failures are found (app won't install, GPS doesn't work, recommendation never appears), fix them and re-verify. If minor issues are found, document them as known limitations for future work.

## Must-Haves

- [ ] UAT checklist written with all validation categories
- [ ] App installs as PWA on a real phone (or documents why it can't)
- [ ] App opens in standalone mode from home screen
- [ ] GPS activates and recommendation renders (KEEP_WALKING or WAIT with correct color)
- [ ] Detail panel expand/collapse works on touch device
- [ ] Results documented in S04-UAT.md with pass/fail per item

## Verification

- `S04-UAT.md` exists with completed checklist (pass/fail marked for each item)
- Critical items pass: PWA install, standalone mode, GPS activation, recommendation rendering
- Any failures are either fixed or documented as known limitations with rationale

## Observability Impact

- Signals added/changed: None — this is a validation task, not a code change task
- How a future agent inspects this: Read `S04-UAT.md` for the definitive record of real-device behavior; any issues found become known limitations or follow-up items
- Failure state exposed: UAT checklist failures document exactly what doesn't work on real devices vs desktop browser, providing a diagnostic baseline for future fixes

## Inputs

- Deployed Vercel URL from T02
- All components and features from S01–S03
- S03 forward intelligence: KEEP_WALKING/WAIT colors untested on real device; overscroll-behavior needs real-device verification; detail panel scroll ref may be fragile

## Expected Output

- `.gsd/milestones/M001/slices/S04/S04-UAT.md` — completed UAT checklist with pass/fail results documenting real-device PWA behavior
