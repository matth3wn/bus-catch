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
| D006 | S01 | tech | Test framework | Vitest + happy-dom | Fast, native ESM/TS, path alias support — no config overhead for Next.js App Router | Yes |
| D007 | S01 | arch | Metro API v2 over raw GTFS-RT protobuf | Use `api.metro.net` JSON REST endpoints, skip protobuf entirely | Free, no API key, JSON format, eliminates protobuf dependency | No |
| D008 | S01 | arch | API response includes `source` field | Every prediction/vehicle response includes `source: 'swiftly' \| 'metro-realtime' \| 'schedule' \| 'mock'` | Enables downstream observability and data-quality awareness without inspecting payloads | No |
| D009 | S01 | pattern | Parse functions separated from fetch functions | `parseMetroTripDetail()` and `parseScheduleResponse()` are pure, exported separately from network-calling `fetch*()` functions | Enables deterministic testing with fixtures, no mocking of fetch needed for unit tests | No |
| D010 | S02 | convention | GPS thresholds: 50m accuracy, 100m off-route | `MAX_GPS_ACCURACY=50`, `MAX_OFF_ROUTE_DISTANCE=100` | Current 200m/500m values are no-ops for Cahuenga Blvd walking; 50m/100m are reasonable for urban GPS while still filtering noise | Yes — tune after S04 real-walk validation |
| D011 | S02 | convention | Staleness thresholds: warn at 60s, error at 120s | `STALENESS_WARNING_SECONDS=60`, `STALENESS_ERROR_SECONDS=120` | 15s poll interval means 4 consecutive failures before warning, 8 before error — avoids false positives from single missed polls | Yes — tune based on real-world API reliability |
| D012 | S02 | pattern | Source mapping: API source → BusCatchState dataSource | `'swiftly'/'metro-realtime'` → `'realtime'`, `'schedule'` → `'schedule'`, `'mock'` → `'mock'` | Simplifies D005's three-value enum; consumers don't need to know Swiftly vs Metro distinction | No |
| D013 | S02 | pattern | Extract speed estimation as pure function | `estimateSpeed()` in `lib/speed.ts` separate from hook | Makes speed calculation testable without rendering React components; same extraction pattern as D009 | No |
