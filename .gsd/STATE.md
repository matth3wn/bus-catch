# GSD State

**Active Milestone:** M001 — Ship It
**Active Slice:** S04 — Deploy & Validate (executing)
**Active Task:** T02 complete — ready for T03
**Phase:** Execution

## Recent Decisions
- D017: Deploy to Vercel via GitHub integration
- D018: Keep hand-rolled service worker, no Workbox
- D019: Remove hardcoded manifest link, rely on Next.js auto-injection
- D020: Deployed to Vercel via CLI with GitHub integration (auto-deploys on push)
- D021: No SWIFTLY_API_KEY configured — app works via Metro API v2 + schedule fallback

## Blockers
- None

## Progress
- S01 ✅ — Resilient Data Pipeline complete (25/25 tests pass, build clean)
- S02 ✅ — GPS & Calculation Reliability complete (51 tests pass, build clean)
- S03 ✅ — Glanceable UX complete (browser-verified at mobile viewport, 51 tests, clean build)
- S04 🔄 — Deploy & Validate (executing, 3 tasks)
  - T01 ✅ — Fix PWA bugs and verify build
  - T02 ✅ — Deploy to Vercel and verify production (https://bus-mu-ebon.vercel.app)
  - T03 ⬜ — Real-device PWA validation

## Deployment
- **URL:** https://bus-mu-ebon.vercel.app
- **GitHub:** https://github.com/matth3wn/bus-catch
- **Vercel project:** matthew-8149s-projects/bus

## Requirements Status
- Validated: R001 (glanceable UX), R002 (tap-to-expand), R009 (failure visibility)
- Active: R003, R004, R005, R006, R007, R008
- R008 (PWA deployment) — T02 deployed, T03 pending real-device validation

## Next Action
Execute T03: Real-device PWA validation
