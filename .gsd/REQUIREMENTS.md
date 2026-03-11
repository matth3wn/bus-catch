# Requirements

## Active

### R001 — Glanceable walk-or-wait decision
- Class: primary-user-loop
- Status: active
- Description: When the user pulls out their phone, the screen is dominated by a single full-screen color and word indicating whether to walk or wait. Answer visible in <1 second with zero interaction.
- Why it matters: This is the entire point of the app. If the user has to read, parse, or interact to get the answer, the app fails its purpose.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: M001/S01, M001/S02
- Validation: unmapped
- Notes: Green = keep walking, amber = wait at [stop name]. Tap/swipe to expand detail view.

### R002 — Tap-to-expand detail view
- Class: core-capability
- Status: active
- Description: Tapping or swiping up on the glanceable screen reveals detailed stop cards, bus arrival times, walk times, and route diagram.
- Why it matters: Users sometimes want to understand why the recommendation was made, or see the next bus behind this one.
- Source: user
- Primary owning slice: M001/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Detail view contains existing stop cards and route diagram, refined for the new layout.

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
- Validation: unmapped
- Notes: Existing code has route snapping and speed estimation but untested. May need tuning of MAX_GPS_ACCURACY, MAX_OFF_ROUTE_DISTANCE, SPEED_HISTORY_WINDOW constants.

### R006 — Accurate catch calculations
- Class: core-capability
- Status: active
- Description: The catch calculator correctly determines whether the user can reach each stop before the bus, accounting for walking speed, bus arrival predictions, and a safety buffer.
- Why it matters: A wrong recommendation (wait when you should walk, or vice versa) destroys trust in the app.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: M001/S01
- Validation: unmapped
- Notes: CATCH_BUFFER_SECONDS=90 may be too conservative or too aggressive. Need real-world validation.

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
- Status: active
- Description: App is deployed to a public URL and installable as a PWA on iOS and Android. Opens instantly from home screen in standalone mode.
- Why it matters: The user needs to pull this out of their pocket and get an answer. A deployed PWA with home screen icon is the delivery mechanism.
- Source: user
- Primary owning slice: M001/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Manifest and service worker shell already exist. Need proper caching strategy and deployment.

### R009 — Failure visibility
- Class: failure-visibility
- Status: active
- Description: When something is wrong (GPS denied, API unreachable, stale data, off-route), the app clearly communicates the issue without breaking the glanceable UX.
- Why it matters: Silent failures make the user distrust the app. If it says "keep walking" but is actually showing stale data from 5 minutes ago, that's dangerous.
- Source: inferred
- Primary owning slice: M001/S02
- Supporting slices: M001/S03
- Validation: unmapped
- Notes: Current app has basic gpsError display but no staleness detection or API failure indication in the main UX.

## Validated

(none yet)

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
- Status: deferred
- Description: Support the reverse commute — walking north on Cahuenga toward Universal City station, catching the 222 northbound.
- Why it matters: The user also walks home. Same problem in reverse.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — different stops, different direction_id, different polyline. Natural second milestone.

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
| R001 | primary-user-loop | active | M001/S03 | M001/S01, M001/S02 | unmapped |
| R002 | core-capability | active | M001/S03 | none | unmapped |
| R003 | core-capability | active | M001/S01 | none | S01 — parsing tested, live pending |
| R004 | continuity | active | M001/S01 | none | S01 — fallback chain tested |
| R005 | core-capability | active | M001/S02 | none | unmapped |
| R006 | core-capability | active | M001/S02 | M001/S01 | unmapped |
| R007 | continuity | active | M001/S01 | M001/S02 | S01 — schedule parser tested |
| R008 | launchability | active | M001/S04 | none | unmapped |
| R009 | failure-visibility | active | M001/S02 | M001/S03 | unmapped |
| R010 | differentiator | deferred | none | none | unmapped |
| R011 | core-capability | deferred | none | none | unmapped |
| R012 | anti-feature | out-of-scope | none | none | n/a |
| R013 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 9
- Mapped to slices: 9
- Validated: 0
- Unmapped active requirements: 0
