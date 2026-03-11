# GSD State

**Active Milestone:** M001 — Ship It (COMPLETE)
**Active Slice:** S04 — Deploy & Validate (COMPLETE)
**Phase:** Done

## Deployment
- **URL:** https://bus-mu-ebon.vercel.app
- **GitHub:** https://github.com/matth3wn/bus-catch
- **Vercel project:** matthew-8149s-projects/bus

## Recent Decisions
- D017: Deploy to Vercel via GitHub integration
- D018: Keep hand-rolled service worker, no Workbox
- D019: Remove hardcoded manifest link, rely on Next.js auto-injection
- D020: Deployed to Vercel via CLI with GitHub integration
- D021: No SWIFTLY_API_KEY configured — Metro API v2 + schedule fallback

## Blockers
- None

## Progress
- S01 ✅ — Resilient Data Pipeline
- S02 ✅ — GPS & Calculation Reliability
- S03 ✅ — Glanceable UX
- S04 ✅ — Deploy & Validate
  - T01 ✅ — Fix PWA bugs and verify build
  - T02 ✅ — Deploy to Vercel (https://bus-mu-ebon.vercel.app)
  - T03 ✅ — Real-device PWA validation (43-item UAT, 19/19 programmatic pass)

## Requirements Status
- Validated: R001 (glanceable UX), R002 (tap-to-expand), R008 (PWA deployment), R009 (failure visibility)
- Active: R003 (real-time predictions), R004 (multi-tier API), R005 (GPS tracking), R006 (catch calculations), R007 (schedule fallback)
- Active requirements have passing unit/integration tests but await real-walk validation

## Next Action
M001 complete. Next milestone TBD — candidates: real-walk validation, northbound support (R011), B Line integration (R010).
