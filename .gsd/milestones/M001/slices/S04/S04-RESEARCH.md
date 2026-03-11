# S04: Deploy & Validate — Research

**Date:** 2026-03-11

## Summary

S04 deploys the app to Vercel and validates it as an installable PWA. The codebase is in good shape — clean build, 51 tests passing, all prior slices complete. However, research uncovered a **manifest URL mismatch** that would block PWA installation: `layout.tsx` hardcodes `<link rel="manifest" href="/manifest.json" />` and the service worker pre-caches `/manifest.json`, but Next.js App Router generates the manifest at `/manifest.webmanifest`. This must be fixed before deployment.

The deployment itself is straightforward — standard Next.js on Vercel with one server-side env var (`SWIFTLY_API_KEY`, optional). The service worker is a hand-rolled `public/sw.js` with a sensible cache-first shell / network-first API strategy, but needs the manifest URL corrected and would benefit from a cache-busting version bump mechanism. No git remote exists yet, so a GitHub repo + Vercel project linkage is needed.

The PWA already has proper iOS support infrastructure (apple-web-app metadata, viewport-fit cover, safe-area padding, standalone display, 192/512 icons). The `InstallPrompt` component handles iOS add-to-home-screen guidance. The main validation gap is that all prior slices were tested in desktop browser — S04 must verify real-device behavior: GPS tracking, color states (KEEP_WALKING green, WAIT amber), theme-color updating, overscroll containment, and service worker caching.

## Recommendation

Deploy to Vercel via CLI (`vercel` or GitHub integration). Fix the manifest URL mismatch first. Keep the hand-rolled service worker — it's simple and sufficient (no need for Workbox/Serwist for this app's scope). Add `SWIFTLY_API_KEY` as an optional Vercel env var. Validate on a real phone by visiting the deployed URL, triggering GPS, and checking the full flow.

Break into 3 tasks:
1. **Fix PWA bugs + deployment prep** — manifest URL fix, SW cache fix, remove hardcoded manifest link (let Next.js handle it via `app/manifest.ts`), verify build
2. **Deploy to Vercel** — create GitHub repo, push, link to Vercel, configure env vars, deploy, verify URL loads
3. **Real-device PWA validation** — install on phone, test GPS flow, verify service worker caching, test offline shell, test add-to-home-screen

## Don't Hand-Roll

| Problem | Existing Solution | Why Use It |
|---------|------------------|------------|
| Next.js hosting + serverless API routes | Vercel | Zero-config for Next.js, automatic edge caching, env var management |
| Manifest generation | `app/manifest.ts` (already exists) | Next.js auto-generates `/manifest.webmanifest` and links it — remove the manual `<link>` |
| Service worker | Keep existing `public/sw.js` | Simple enough for this app; Workbox/Serwist would be overkill for 2 API routes + 1 page |

## Existing Code and Patterns

- `app/manifest.ts` — Already generates correct PWA manifest via Next.js MetadataRoute.Manifest. Icons, display mode, start_url all correct. Next.js serves this at `/manifest.webmanifest` automatically.
- `app/layout.tsx` — Has `appleWebApp` metadata (capable, black-translucent, title), viewport-fit cover, theme-color. **Bug:** hardcodes `<link rel="manifest" href="/manifest.json" />` which conflicts with Next.js auto-generated `/manifest.webmanifest`. The hardcoded link should be removed — Next.js will inject the correct link automatically.
- `public/sw.js` — Hand-rolled service worker with cache-first for shell, network-first for `/api/` routes. **Bug:** pre-caches `/manifest.json` which doesn't exist (should be `/manifest.webmanifest` or removed from SHELL_ASSETS since the manifest is auto-linked).
- `next.config.ts` — Already configures correct headers for `sw.js` (Content-Type, Service-Worker-Allowed, Cache-Control no-cache).
- `components/install-prompt.tsx` — iOS-specific add-to-home-screen prompt. Detects standalone mode and iOS. Renders in DetailPanel footer.
- `page.tsx` — Registers service worker in useEffect. Clean orchestrator pattern.
- `public/icon-192.png`, `public/icon-512.png` — Valid PNG icons at correct sizes for PWA manifest.
- `.env.local` — Only `SWIFTLY_API_KEY` (commented out). No `NEXT_PUBLIC_*` vars needed — all env access is server-side in API routes.
- `components/glanceable-screen.tsx` — `RECOMMENDATION_STYLES` exports the themeColor mapping. Per S03 forward intelligence, this is the single source of truth for action→color.

## Constraints

- **No git remote** — `git remote -v` returns nothing. Need to create a GitHub repo and push before Vercel can deploy via GitHub integration (or use `vercel --prod` CLI for direct deploy).
- **Vercel CLI not installed** — Need `npm i -g vercel` or use GitHub integration.
- **Only one env var** — `SWIFTLY_API_KEY` is optional (server-side only). App works without it via Metro API v2 + schedule fallback. Must be added to Vercel env vars if available.
- **Next.js 16.1.6** — Uses App Router. `app/manifest.ts` generates manifest at `/manifest.webmanifest` (not `/manifest.json`). Next.js automatically injects the `<link rel="manifest">` tag when `app/manifest.ts` exists.
- **API routes use `cache: "no-store"` and `next: { revalidate: 0 }`** — These are dynamic routes (correctly marked `ƒ` in build output). No ISR/caching concerns.
- **Static page (`○`)** — The `/` route pre-renders as static since it's a client component. The service worker handles runtime caching.
- **iOS Safari PWA quirks** — `viewport-fit: cover` already set (D015), `apple-mobile-web-app-capable` via Next.js metadata, `black-translucent` status bar style. Theme-color meta tag dynamically updated at runtime.

## Common Pitfalls

- **Manifest URL mismatch** — `layout.tsx` links `/manifest.json`, Next.js serves `/manifest.webmanifest`. Browsers may fail to detect PWA installability if the manifest 404s. Fix: remove the hardcoded `<link>` from layout.tsx `<head>` — Next.js auto-injects the correct one when `app/manifest.ts` exists.
- **SW pre-cache failure** — `sw.js` SHELL_ASSETS includes `/manifest.json` which will 404 on Vercel, causing the install event to fail silently. Fix: update to `/manifest.webmanifest` or remove from SHELL_ASSETS.
- **Stale service worker** — Cache name is hardcoded `bus-catch-v1`. After deployment changes, old SW will serve stale content. Consider: either bump the version on meaningful changes, or use a build-time hash. For this slice, manual version bump is sufficient.
- **iOS Safari service worker scope** — Service worker at `/sw.js` with `Service-Worker-Allowed: /` is correct. iOS Safari supports service workers in standalone mode since iOS 11.3. No scope issues expected.
- **Vercel serverless cold start** — API routes may have ~200-500ms cold start on first request after idle. The 15s polling interval and network-first SW strategy handle this gracefully. Not a real concern for this use case.
- **Missing apple-touch-icon** — Layout references `/icon-192.png` as apple-touch-icon. This is in the `<head>` of `layout.tsx`. File exists in `public/`. ✅ No issue.

## Open Risks

- **No BRAVE_API_KEY for web search** — Cannot verify latest Vercel CLI commands or Next.js 16 deployment specifics via web search. Using Context7 docs and codebase evidence instead. Low risk — Vercel + Next.js deployment is well-understood.
- **Service worker update UX** — When deploying updates, users with the old SW cached may see stale content until the new SW activates. `skipWaiting()` is already called, and `clients.claim()` runs on activate, so the update should be fast. But there's no "update available" UI prompt. Acceptable for v1.
- **Real-device GPS accuracy** — Per S02 forward intelligence and R005, GPS thresholds (50m/100m) are untested on actual Cahuenga Blvd walks. S04 deployment enables this testing but the actual walk-test may be deferred to milestone final acceptance.
- **Metro API v2 availability on Vercel** — API routes call `api.metro.net` from Vercel's serverless functions (US region). Should work — no geo-restrictions expected on a public transit API. If Metro API blocks non-US IPs or has rate limits, the schedule fallback handles it.
- **No GitHub remote** — Deploying via Vercel typically uses GitHub integration for CI/CD. Alternative: `vercel` CLI direct deploy. User needs to decide on repo creation.

## Skills Discovered

| Technology | Skill | Status |
|------------|-------|--------|
| Vercel deployment | `vercel-labs/agent-skills@vercel-react-best-practices` | available (197K installs) — useful for React patterns but not critical for simple deployment |
| PWA development | `alinaqi/claude-bootstrap@pwa-development` | available (549 installs) — low install count, unlikely needed for this simple PWA |
| Next.js patterns | `wshobson/agents@nextjs-app-router-patterns` | available (7.8K installs) — could help with App Router patterns but not needed for deployment |

**Recommendation:** No skills needed for S04. The deployment is standard Next.js → Vercel, and PWA configuration is already 90% done. The bugs found are straightforward fixes.

## Sources

- Next.js PWA guide via Context7 — confirms `app/manifest.ts` generates `/manifest.webmanifest` and auto-injects `<link rel="manifest">` (source: `/vercel/next.js` docs)
- Next.js env vars guide via Context7 — confirms server-side `process.env` access in route handlers works on Vercel without `NEXT_PUBLIC_` prefix (source: `/vercel/next.js` docs)
- Codebase exploration — identified manifest URL mismatch, SW pre-cache bug, no git remote, clean build state
- S03 summary — forward intelligence about RECOMMENDATION_STYLES, detail panel scroll ref fragility, overscroll-behavior needing real-device verification
