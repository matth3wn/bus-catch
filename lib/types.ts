export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoutePoint extends LatLng {
  /** Cumulative distance from route start in meters */
  cumulativeDistance: number;
}

export interface Stop {
  id: string;
  name: string;
  position: LatLng;
  /** Distance along walking route from start in meters */
  routeDistance: number;
}

export interface UserPosition {
  position: LatLng;
  /** Snapped distance along walking route in meters */
  routeDistance: number;
  /** Estimated walking speed in m/s (from position history) */
  walkingSpeed: number;
  accuracy: number;
  timestamp: number;
}

export interface BusPrediction {
  tripId: string;
  vehicleId?: string;
  vehiclePosition?: LatLng;
  /** When the vehicle position was measured (Unix seconds) — used for dead-reckoning */
  vehicleTimestamp?: number;
  stopId: string;
  /** Predicted arrival as Unix timestamp (seconds) */
  arrivalTime: number;
  /**
   * GTFS-RT prediction uncertainty in seconds.
   * 0 = certain, undefined = unknown. Larger = less trustworthy.
   */
  uncertainty?: number;
  /**
   * GTFS-RT schedule_relationship for this stop, when provided.
   * "NO_DATA" means the feed has no real-time data for this stop.
   */
  scheduleRelationship?: string;
}

/** Confidence level for a bus arrival prediction, derived from feed quality. */
export type Confidence = "high" | "medium" | "low";

export interface StopCatchAnalysis {
  stop: Stop;
  /** Seconds until user walks to this stop */
  walkSeconds: number;
  /** Seconds until bus arrives at this stop (null if no prediction) */
  busSeconds: number | null;
  /** Lower bound of the bus-arrival confidence interval, in seconds (null if no prediction) */
  busSecondsLow: number | null;
  /** Upper bound of the bus-arrival confidence interval, in seconds (null if no prediction) */
  busSecondsHigh: number | null;
  /** Confidence in the bus prediction for this stop (null if no prediction) */
  confidence: Confidence | null;
  /** Whether user can reach the stop before the bus */
  catchable: boolean;
  /** Whether this is the recommended stop to wait at */
  recommended: boolean;
}

export type RecommendationAction = "KEEP_WALKING" | "WAIT" | "NO_DATA";

export interface Recommendation {
  action: RecommendationAction;
  /** Stop to wait at (when action is WAIT) */
  waitStop?: Stop;
  /** Human-readable reason */
  reason: string;
}

export interface BusCatchState {
  user: UserPosition | null;
  predictions: BusPrediction[];
  stopAnalyses: StopCatchAnalysis[];
  recommendation: Recommendation;
  lastUpdated: number | null;
  gpsError: string | null;
  loading: boolean;
  /** Which data tier is active: realtime, schedule, mock, or null if unknown */
  dataSource: "realtime" | "schedule" | "mock" | null;
  /** Seconds since last successful API fetch, or null if never fetched */
  staleness: number | null;
  /** Error message when data is stale or fetch fails, null when healthy */
  dataError: string | null;
  /** Detected walking direction, or null if not yet determined */
  direction: "northbound" | "southbound" | null;
  /** Toggle between northbound and southbound (manual override) */
  toggleDirection: () => void;
}
