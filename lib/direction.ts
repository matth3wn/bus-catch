import { LatLng } from "./types";
import {
  DIRECTION_MIN_DISPLACEMENT,
  DIRECTION_MIN_SAMPLES,
  DIRECTION_FLIP_DISPLACEMENT,
} from "./constants";

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
 * Hysteresis: once a direction is established, flipping it requires a larger
 * net displacement (DIRECTION_FLIP_DISPLACEMENT) than first acquiring one
 * (DIRECTION_MIN_DISPLACEMENT). This stops GPS jitter on a short route from
 * thrashing the direction back and forth. Pass `current` to enable it.
 *
 * Returns:
 * - 'northbound' if net movement is clearly north (lat increasing)
 * - 'southbound' if net movement is clearly south (lat decreasing)
 * - the unchanged `current` direction when movement is below the flip threshold
 * - null if insufficient data or ambiguous and no current direction is held
 */
export function detectDirection(
  history: PositionSample[],
  current: "northbound" | "southbound" | null = null
): "northbound" | "southbound" | null {
  if (history.length < DIRECTION_MIN_SAMPLES) {
    return current;
  }

  const first = history[0];
  const last = history[history.length - 1];

  // Approximate displacement in meters using latitude difference
  // 1 degree latitude ≈ 111,320 meters
  const latDisplacementMeters =
    (last.position.lat - first.position.lat) * 111_320;

  const candidate = latDisplacementMeters > 0 ? "northbound" : "southbound";
  const magnitude = Math.abs(latDisplacementMeters);

  // No direction held yet: acquire on the base threshold.
  if (current === null) {
    return magnitude < DIRECTION_MIN_DISPLACEMENT ? null : candidate;
  }

  // Same direction as held, or movement too small to flip: keep current.
  if (candidate === current || magnitude < DIRECTION_FLIP_DISPLACEMENT) {
    return current;
  }

  return candidate;
}
