import { LatLng, RoutePoint } from "./types";
import { WALKING_ROUTE } from "./route-data";

const R = 6_371_000; // Earth radius in meters

/** Haversine distance between two points in meters */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface SnapResult {
  /** Projected point on the route */
  point: LatLng;
  /** Distance along the route in meters */
  routeDistance: number;
  /** Perpendicular distance from GPS to route in meters */
  offRouteDistance: number;
}

/** Snap a GPS position to the nearest point on the walking route polyline */
export function snapToRoute(position: LatLng): SnapResult {
  let bestDist = Infinity;
  let bestResult: SnapResult = {
    point: WALKING_ROUTE[0],
    routeDistance: 0,
    offRouteDistance: Infinity,
  };

  for (let i = 0; i < WALKING_ROUTE.length - 1; i++) {
    const a = WALKING_ROUTE[i];
    const b = WALKING_ROUTE[i + 1];
    const segLen = b.cumulativeDistance - a.cumulativeDistance;
    if (segLen === 0) continue;

    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    let t = ((position.lng - a.lng) * dx + (position.lat - a.lat) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    const proj: LatLng = { lat: a.lat + t * dy, lng: a.lng + t * dx };
    const dist = haversine(position, proj);

    if (dist < bestDist) {
      bestDist = dist;
      bestResult = {
        point: proj,
        routeDistance: a.cumulativeDistance + t * segLen,
        offRouteDistance: dist,
      };
    }
  }

  return bestResult;
}

/** Estimated walk time in seconds from one route distance to another */
export function walkTimeSeconds(fromDistance: number, toDistance: number, speedMs: number): number {
  const delta = toDistance - fromDistance;
  if (delta <= 0) return 0;
  return delta / speedMs;
}
