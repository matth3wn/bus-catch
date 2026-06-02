# Accuracy / estimation layer

The app no longer trusts raw API numbers blindly. A confidence-aware estimation
layer sits between the feed and the UI (added 2026-06-02). Key modules:

- `lib/prediction-sanity.ts` — `sanitizePredictions()` drops physically-impossible
  predictions (a further stop arriving before a nearer one on the same trip).
- `lib/dead-reckoning.ts` — `deadReckonBuses()` projects a stale vehicle position
  forward along the route using speed implied by the bus's own arrival prediction.
  Used by `route-map.tsx` to draw buses where they likely are now ("(est.)" tooltip).
- `lib/eta-smoothing.ts` — `EtaSmoother` EMA-smooths arrival times per `trip:stop`
  across polls (snaps past `ETA_SNAP_THRESHOLD_SECONDS`). Constructed once in the hook.
- `lib/speed.ts` `smoothSpeed()` — EMA over the jumpy walking-speed window estimate.
- `lib/arrival-history.ts` — `ArrivalHistory` persists per stop/dayType/hour the
  volatility (stddev) of inter-poll prediction changes to localStorage. NOTE: the app
  cannot observe true arrival (it isn't at the stop), so this measures prediction
  *stability*, not absolute bias. Feeds the confidence-interval width.

`calculateCatch()` (catch-calculator.ts) now takes a 5th `CatchOptions` arg
(`dataSource`, `staleness`, `reliabilityByStop`). It widens the catch buffer and
emits `busSecondsLow/High` + `confidence` per stop. GTFS-RT `uncertainty`,
`NO_DATA`, and `time`>`delay` are parsed in the Swiftly route and `metro-fetchers`.

UX: `components/eta-dotplot.tsx` is a ~20-dot quantile dotplot (CHI 2016 "When(ish)
is My Bus?"). Glanceable screen shows a minute *range* + confidence; stop cards show
a range + a colored confidence dot.

Tuning knobs live in `lib/constants.ts` (EMA alphas, buffer factors, tolerances).
`STOP_REEVAL_TOLERANCE_METERS` rescues a stop just-passed by GPS drift but NOT the
origin stop the user stands on (behindBy===0 is excluded) — see catch-calculator.

Honest limit: heavier ML (GNN+LSTM/FCNN) and crowdsourced predictions were
researched but NOT built — they need a self-collected AVL dataset or a user fleet.
