import { LatLng } from "./types";
import { DIRECTION_MIN_DISPLACEMENT, DIRECTION_MIN_SAMPLES } from "./constants";

export interface PositionSample {
  position: LatLng;
  timestamp: number;
}

/**
 * Detect walking direction from recent GPS position history.
 *
 * Computes net displacement vector from the oldest to newest sample.
 * On Cahuenga Blvd, northbound = increasing latitude, southbound = decreasing.
 *
 * Returns:
 * - 'northbound' if net movement is clearly north (lat increasing)
 * - 'southbound' if net movement is clearly south (lat decreasing)
 * - null if insufficient data or ambiguous (below displacement threshold)
 */
export function detectDirection(
  history: PositionSample[]
): "northbound" | "southbound" | null {
  if (history.length < DIRECTION_MIN_SAMPLES) {
    return null;
  }

  const first = history[0];
  const last = history[history.length - 1];

  // Approximate displacement in meters using latitude difference
  // 1 degree latitude ≈ 111,320 meters
  const latDisplacementMeters =
    (last.position.lat - first.position.lat) * 111_320;

  if (Math.abs(latDisplacementMeters) < DIRECTION_MIN_DISPLACEMENT) {
    return null;
  }

  return latDisplacementMeters > 0 ? "northbound" : "southbound";
}
