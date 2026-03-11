# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001 | arch | API fallback strategy | Swiftly → public GTFS-RT → static schedule → mock | Graceful degradation ensures app always has some answer | No |
| D002 | M001 | pattern | Glanceable UX pattern | Full-screen color = answer, tap to expand detail | User wants <1s answer with zero interaction | No |
| D003 | M001 | scope | Route 222 southbound only | Single direction, single route for M001 | Focused scope; northbound deferred to future milestone | Yes — when northbound is added |
| D004 | M001 | arch | No backend/database | Client-side state only, API routes as proxy | Zero-config, no persistence needed for walk-or-wait | Yes — if features need persistence |
| D005 | M001 | convention | Data source indicator in state | `dataSource: 'realtime' \| 'schedule' \| 'mock'` field on BusCatchState | UI needs to show data confidence level for failure visibility | No |
