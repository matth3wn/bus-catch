# Project

## What This Is

Bus Catch — a mobile PWA that answers one question during a daily commute: "Should I wait for the Metro 222 bus or keep walking?" The user walks ~1 mile from Universal City B Line station south along Cahuenga Blvd to work. The 222 bus covers that same stretch. The app uses real-time bus data and GPS to make a walk-or-wait recommendation.

## Core Value

Instant, glanceable walk-or-wait decision when the user pulls out their phone mid-walk. The answer must be visible in under 1 second with zero interaction.

## Current State

A working prototype exists with:
- GPS tracking with route snapping along Cahuenga Blvd polyline
- Swiftly API integration for GTFS-RT trip updates and vehicle positions (with mock fallback)
- Catch calculator comparing per-stop walk time vs bus arrival time
- 8 hardcoded Route 222 southbound stops
- Dark-mode UI with status banner, route diagram, and stop cards
- PWA manifest and service worker registration
- Never tested with real GPS on an actual walk

The app runs but hasn't been validated in real conditions. The UI works but isn't optimized for glanceability.

## Architecture / Key Patterns

- **Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript
- **Data flow:** GPS watchPosition → route snap → catch calculator (pure function) → UI state
- **API proxy:** Next.js API routes proxy Swiftly GTFS-RT, falling back to mock data when no API key
- **Route data:** Hardcoded polyline + stops in `lib/route-data.ts`, computed at module load
- **State:** Single `useBusCatch` hook manages GPS, polling, calculation, and recommendations
- **PWA:** manifest.ts + public/sw.js, iOS install prompt

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [ ] M001: Ship It — Fix reliability, redesign for glanceability, support public GTFS-RT, deploy as PWA
