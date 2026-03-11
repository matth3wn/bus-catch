# Requirements

## Active

### R001 — Glanceable walk-or-wait decision
- Class: primary-user-loop
- Status: validated
- Description: When the user pulls out their phone, the screen is dominated by a single full-screen color and word indicating whether to walk or wait. Answer visible in <1 second with zero interaction.
- Why it matters: This is the entire point of the app. If the user has to read, parse, or interact to get the answer, the app fails its purpose.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S01, M001/S02
- Validation: S03 — full-screen color surface fills 390×844 mobile viewport, H1 at 48px (text-5xl) readable at arm's length, zero interaction required. Browser assertions confirm layout, font size, color fill. KEEP_WALKING/WAIT color states structurally verified (code review + type contracts); visual verification of green/amber deferred to S04 real-device.
- Notes: Green = keep walking, amber = wait at [stop name]. Tap/swipe to expand detail view.

### R002 — Tap-to-expand detail view
- Class: core-capability
- Status: validated
- Description: Tapping or swiping up on the glanceable screen reveals detailed stop cards, bus arrival times, walk times, and route diagram.
- Why it matters: Users sometimes want to understand why the recommendation was made, or see the next bus behind this one.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: S03 — tap on glanceable screen expands detail panel with route diagram, stop cards, data source badge, staleness info. Close button (44×44px touch target) collapses back. Browser assertions confirm full expand/collapse cycle.
- Notes: Detail view contains existing stop cards and route diagram, refined for the new layout. Swipe gesture deferred (D016 — tap only for now).

### R003 — Real-time bus predictions via API
- Class: core-capability
- Status: active
- Description: App fetches real-time GTFS-RT trip updates and vehicle positions for Route 222 southbound stops and uses them to predict bus arrival times.
- Why it matters: Without real-time data, the catch calculator has nothing to work with — recommendations would be meaningless.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: S01 — Metro API v2 parsing tested with realistic fixtures (14 unit tests); live API shape confirmation pending
- Notes: Supports Swiftly API (existing) and Metro API v2 JSON endpoints as fallback. Response parsing proven correct via test fixtures.

### R004 — Multi-tier API support (Swiftly + Metro API v2)
- Class: continuity
- Status: active
- Description: API layer tries Swiftly first (if key configured), falls back to Metro API v2 JSON endpoints (real-time then schedule). Works with any combination or none (mock mode for dev).
- Why it matters: User isn't sure about Swiftly access. Metro API v2 ensures the app works regardless. Graceful degradation keeps the app useful.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: none
- Validation: S01 — integration tests prove all fallback tiers and transitions; live API confirmation pending during service hours
- Notes: Originally scoped as "public GTFS-RT" — S01 implemented Metro API v2 JSON REST endpoints instead (D007), avoiding protobuf dependency while providing same data.

### R005 — Reliable GPS tracking on real walks
- Class: core-capability
- Status: active
- Description: GPS tracking works reliably on a real walk from Universal City station south along Cahuenga Blvd. Route snapping, speed estimation, and off-route rejection handle real-world GPS noise.
- Why it matters: Never been tested on a real walk. GPS accuracy, urban canyon effects, and walking speed estimation could all be broken in practice.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: none
- Validation: S02 — geo functions tested (14 unit tests: haversine, snapToRoute, walkTimeSeconds); GPS thresholds tightened to 50m/100m (D010); real-walk validation pending S04
- Notes: Thresholds changed from 200m/500m to 50m/100m. Speed estimation extracted to lib/speed.ts but not yet unit tested. Real GPS validation deferred to S04.

### R006 — Accurate catch calculations
- Class: core-capability
- Status: active
- Description: The catch calculator correctly determines whether the user can reach each stop before the bus, accounting for walking speed, bus arrival predictions, and a safety buffer.
- Why it matters: A wrong recommendation (wait when you should walk, or vice versa) destroys trust in the app.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: M001/S01
- Validation: S02 — 12 scenario-based tests prove correct recommendations for all known use cases (9 research scenarios + 3 edge cases); buffer tuning (CATCH_BUFFER_SECONDS=90) pending S04 real-walk validation
- Notes: CATCH_BUFFER_SECONDS=90 unchanged — may need tuning after real-walk testing in S04.

### R007 — Schedule-based fallback
- Class: continuity
- Status: active
- Description: When no real-time predictions are available (API down, bus not in service, off-hours), the app falls back to published schedule data to provide approximate recommendations.
- Why it matters: Without this, the app shows "no data" during API outages or when buses haven't started transmitting — which may be exactly when the user needs guidance.
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S02
- Validation: S01 — schedule parser tested with fixtures including >24h GTFS times, day-type detection, future-only filtering; integrated as third tier in trip-updates fallback chain
- Notes: Uses Metro API v2 `route_stops/222` endpoint with day_type parameter. Handles GTFS >24:00 times. Recommendation quality lower than real-time but still useful.

### R008 — PWA deployment
- Class: launchability
- Status: validated
- Description: App is deployed to a public URL and installable as a PWA on iOS and Android. Opens instantly from home screen in standalone mode.
- Why it matters: The user needs to pull this out of their pocket and get an answer. A deployed PWA with home screen icon is the delivery mechanism.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: S04 — deployed to https://bus-mu-ebon.vercel.app, manifest served at /manifest.webmanifest (name, icons, display:standalone correct), SW registered and activated, HTTPS via Vercel, 19/19 programmatic PWA checks pass. Physical device install documented in UAT checklist (all prerequisites verified).
- Notes: GitHub repo matth3wn/bus-catch with auto-deploy on push. No SWIFTLY_API_KEY — uses Metro API v2 + schedule fallback.

### R009 — Failure visibility
- Class: failure-visibility
- Status: validated
- Description: When something is wrong (GPS denied, API unreachable, stale data, off-route), the app clearly communicates the issue without breaking the glanceable UX.
- Why it matters: Silent failures make the user distrust the app. If it says "keep walking" but is actually showing stale data from 5 minutes ago, that's dangerous.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: M001/S03
- Validation: S02 — state fields wired (dataSource/staleness/dataError/gpsError), staleness detection (60s warn, 120s error). S03 — UI renders all failure fields: data source badge always visible on glanceable + detail, staleness warning when >STALENESS_WARNING_SECONDS, gpsError/dataError as alert badges on glanceable screen, dataError in detail panel. Browser-verified with mock state; live failure transitions need S04.
- Notes: GPS denied → gpsError alert badge. Data stale >60s → staleness warning. >120s → dataError populated + alert. Off-route → GPS reading dropped. All states now rendered in UI.

## Validated

### R001 — Glanceable walk-or-wait decision
- Validated by: S03 browser assertions at mobile viewport (390×844)
- Proof: full-screen color surface, 48px headline, zero-interaction answer

### R002 — Tap-to-expand detail view
- Validated by: S03 browser assertions — expand/collapse cycle with correct content
- Proof: tap expands detail panel, close button collapses, route diagram + stop cards render

### R008 — PWA deployment
- Validated by: S04 deployment + 19/19 programmatic PWA checks
- Proof: deployed at https://bus-mu-ebon.vercel.app, manifest correct, SW active, HTTPS, all install prerequisites met

### R009 — Failure visibility
- Validated by: S02 state wiring + S03 UI rendering
- Proof: data source badge, staleness warning, gpsError/dataError alert badges all render

## Deferred

### R010 — Full commute integration
- Class: differentiator
- Status: deferred
- Description: Awareness of the 222 bus before exiting the B Line — know while still on the train whether a bus will be available when you reach the surface.
- Why it matters: Could save the user from rushing up the stairs or missing a bus by seconds.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — requires understanding of B Line arrival times and transfer timing. Good future milestone.

### R011 — Northbound / return trip support
- Class: core-capability
- Status: active
- Description: Support the reverse commute — walking north on Cahuenga toward Universal City station, catching the 222 northbound.
- Why it matters: The user also walks home. Same problem in reverse.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: M002/S02
- Validation: unmapped — M002 will implement direction detection, northbound route data, and bidirectional pipeline
- Notes: Northbound uses direction_id=0, different stop IDs (9138, 554, 558, 548, 556, 551, 30002). Walking route is reverse of southbound polyline. Auto-detection from GPS heading.

## Out of Scope

### R012 — Multi-route support
- Class: anti-feature
- Status: out-of-scope
- Description: Supporting bus routes other than the 222 or transit modes other than the last-mile walk.
- Why it matters: Prevents scope creep. This app solves one specific commute segment.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: The app is purpose-built for one route on one commute.

### R013 — User accounts or personalization settings
- Class: anti-feature
- Status: out-of-scope
- Description: Login, profiles, saved preferences, or configurable settings.
- Why it matters: Zero-config is a feature. The app knows the route, the stops, the bus. Nothing to configure.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Walking speed is estimated from GPS, not user-configured.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | primary-user-loop | validated | M001/S03 | M001/S01, M001/S02 | S03 — browser-verified at mobile viewport |
| R002 | core-capability | validated | M001/S03 | none | S03 — expand/collapse browser-verified |
| R003 | core-capability | active | M001/S01 | none | S01 — parsing tested, live pending |
| R004 | continuity | active | M001/S01 | none | S01 — fallback chain tested |
| R005 | core-capability | active | M001/S02 | none | S02 — geo tested, thresholds tightened; real-walk pending S04 |
| R006 | core-capability | active | M001/S02 | M001/S01 | S02 — 12 scenario tests; buffer tuning pending S04 |
| R007 | continuity | active | M001/S01 | M001/S02 | S01 — schedule parser tested |
| R008 | launchability | validated | M001/S04 | none | S04 — deployed, manifest/SW/HTTPS verified |
| R009 | failure-visibility | validated | M001/S02 | M001/S03 | S02 state + S03 UI rendering verified |
| R010 | differentiator | deferred | none | none | unmapped |
| R011 | core-capability | active | M002/S01 | M002/S02 | unmapped — M002 in progress |
| R012 | anti-feature | out-of-scope | none | none | n/a |
| R013 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 6
- Mapped to slices: 6
- Validated: 4 (R001, R002, R008, R009)
- Unmapped active requirements: 0
