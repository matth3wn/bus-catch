/** Average walking speed in meters per second (~3.1 mph) */
export const DEFAULT_WALKING_SPEED = 1.4;

/** Polling interval for Metro API in milliseconds */
export const POLL_INTERVAL_MS = 15_000;

/** Buffer time in seconds — stop is catchable only if bus arrives this many seconds after user */
export const CATCH_BUFFER_SECONDS = 90;

/** Maximum GPS accuracy (meters) we'll accept */
export const MAX_GPS_ACCURACY = 200;

/** Maximum distance from route (meters) before GPS reading is rejected */
export const MAX_OFF_ROUTE_DISTANCE = 500;

/** Seconds of position history to use for speed estimation */
export const SPEED_HISTORY_WINDOW = 30;

/** Route 222 identifiers in GTFS / Swiftly */
export const ROUTE_ID = "222-13196";
export const ROUTE_SHORT_NAME = "222";
export const DIRECTION_ID = 1; // southbound
export const SHAPE_ID = "2220081";

/** Swiftly API base URL for LA Metro */
export const SWIFTLY_API_BASE = "https://api.goswift.ly/real-time/lacmta";

/** Metro API v2 base URL (free, no auth required) */
export const METRO_API_BASE = "https://api.metro.net";

/** Metro agency ID for LA Metro bus */
export const AGENCY_ID = "LACMTA";

/** Route code for Metro API v2 (stable across GTFS versions, unlike ROUTE_ID) */
export const ROUTE_CODE = "222";
