# GSD State

**Active Milestone:** M001 — Ship It
**Active Slice:** S01 complete — ready for S02
**Active Task:** None
**Phase:** Between slices — S01 complete, S02 not started

## Recent Decisions
- D001: API fallback: Swiftly → Metro API v2 → schedule → mock
- D006: Test framework: Vitest + happy-dom
- D007: Use Metro API v2 JSON endpoints, skip protobuf
- D008: API responses include `source` field for observability
- D009: Parse functions separated from fetch functions for testability

## Blockers
- None

## Progress
- S01 ✅ — Resilient Data Pipeline complete (25/25 tests pass, build clean)
  - T01 ✅ — Vitest configured, contract tests written
  - T02 ✅ — Metro API v2 fetchers and schedule parser
  - T03 ✅ — Fallback chains wired into API routes
- S02 ⬜ — GPS & Calculation Reliability (not started)
- S03 ⬜ — Glanceable UX (not started)
- S04 ⬜ — Deploy & Validate (not started)

## Next Action
Plan and execute S02: GPS & Calculation Reliability. Depends on S01's API routes returning `{ predictions, source }` and `{ vehicles, source }`.
