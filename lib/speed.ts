import { LatLng } from "./types";
import { DEFAULT_WALKING_SPEED } from "./constants";

export interface PositionRecord {
  position: LatLng;
  routeDistance: number;
  timestamp: number;
}

/**
 * Estimate walking speed from recent position history.
 * Returns DEFAULT_WALKING_SPEED if insufficient data.
 *
 * @param history - Recorded positions with route distances and timestamps
 * @param now - Current time in seconds (Unix epoch)
 * @param window - Seconds of history to consider
 */
export function estimateSpeed(
  history: PositionRecord[],
  now: number,
  window: number
): number {
  const recent = history.filter((h) => now - h.timestamp < window);

  if (recent.length < 2) return DEFAULT_WALKING_SPEED;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const timeDelta = last.timestamp - first.timestamp;
  if (timeDelta < 5) return DEFAULT_WALKING_SPEED;

  const distDelta = last.routeDistance - first.routeDistance;
  if (distDelta <= 0) return DEFAULT_WALKING_SPEED;

  const speed = distDelta / timeDelta;
  // Sanity check: between 0.5 and 3.0 m/s
  if (speed < 0.5 || speed > 3.0) return DEFAULT_WALKING_SPEED;
  return speed;
}
