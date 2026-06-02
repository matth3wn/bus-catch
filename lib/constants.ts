/** Average walking speed in meters per second (~3.1 mph) */
export const DEFAULT_WALKING_SPEED = 1.4;

/** Polling interval for Metro API in milliseconds */
export const POLL_INTERVAL_MS = 15_000;

/** Buffer time in seconds — stop is catchable only if bus arrives this many seconds after user */
export const CATCH_BUFFER_SECONDS = 90;

/** Maximum GPS accuracy (meters) we'll accept */
export const MAX_GPS_ACCURACY = 50;

/** Maximum distance from route (meters) before GPS reading is rejected */
export const MAX_OFF_ROUTE_DISTANCE = 100;

/** Seconds since last successful fetch before staleness warning */
export const STALENESS_WARNING_SECONDS = 60;

/** Seconds since last successful fetch before staleness error */
export const STALENESS_ERROR_SECONDS = 120;

/** Seconds of position history to use for speed estimation */
export const SPEED_HISTORY_WINDOW = 30;

/**
 * Exponential-moving-average smoothing factor for walking speed (0–1).
 * Lower = smoother/slower to react; higher = noisier/faster to react.
 */
export const SPEED_EMA_ALPHA = 0.35;

/**
 * EMA smoothing factor for bus arrival-time predictions across polls (0–1).
 * Tames the countdown jitter caused by raw feed predictions hopping around.
 */
export const ETA_EMA_ALPHA = 0.5;

/**
 * If a fresh prediction differs from the smoothed value by more than this many
 * seconds, snap to it instead of easing — the bus genuinely jumped (re-route,
 * new trip, long dwell), so smoothing would lag reality.
 */
export const ETA_SNAP_THRESHOLD_SECONDS = 120;

/**
 * Backward tolerance (meters) when deciding whether a stop is still "ahead".
 * GPS drift can momentarily place the user slightly past a stop; without this
 * the stop would be permanently excluded from catch evaluation.
 */
export const STOP_REEVAL_TOLERANCE_METERS = 25;

/**
 * Extra catch-buffer seconds added per second of prediction uncertainty,
 * capped by UNCERTAINTY_BUFFER_MAX. Lets a noisy feed widen the safety margin.
 */
export const UNCERTAINTY_BUFFER_FACTOR = 0.5;
export const UNCERTAINTY_BUFFER_MAX = 120;

/** Extra catch-buffer seconds when relying on the static schedule (no real-time). */
export const SCHEDULE_BUFFER_SECONDS = 60;

/** Extra catch-buffer seconds when data is stale (per second past the warning threshold, capped). */
export const STALENESS_BUFFER_MAX = 60;

/**
 * Minimum half-width (seconds) of the displayed arrival confidence interval,
 * even for "certain" predictions — GPS/feed latency means a point ETA is never exact.
 */
export const MIN_INTERVAL_HALF_WIDTH_SECONDS = 30;

/** Minimum displacement (meters) required to FLIP an already-established direction. */
export const DIRECTION_FLIP_DISPLACEMENT = 60;

/**
 * Cap on how far forward (seconds) a stale vehicle position is dead-reckoned.
 * Beyond this we stop projecting — the estimate would be more guess than signal.
 */
export const MAX_DEAD_RECKON_SECONDS = 90;

/** Plausible bus speed bounds (m/s) for dead-reckoning sanity (~0.7–22 m/s ≈ 1.5–50 mph). */
export const MIN_BUS_SPEED = 0.7;
export const MAX_BUS_SPEED = 22;

/** Route 222 identifiers in GTFS / Swiftly */
export const ROUTE_ID = "222-13196";
export const ROUTE_SHORT_NAME = "222";
export const DIRECTION_ID = 1; // southbound
export const NORTHBOUND_DIRECTION_ID = 0; // northbound
export const SHAPE_ID = "2220081";

/** Minimum displacement in meters to determine walking direction */
export const DIRECTION_MIN_DISPLACEMENT = 30;

/** Minimum number of GPS samples before attempting direction detection */
export const DIRECTION_MIN_SAMPLES = 3;

/** Swiftly API base URL for LA Metro */
export const SWIFTLY_API_BASE = "https://api.goswift.ly/real-time/lametro";

/** Metro API v2 base URL (free, no auth required) */
export const METRO_API_BASE = "https://api.metro.net";

/** Metro agency ID for LA Metro bus */
export const AGENCY_ID = "LACMTA";

/** Route code for Metro API v2 (stable across GTFS versions, unlike ROUTE_ID) */
export const ROUTE_CODE = "222";
