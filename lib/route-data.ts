import { RoutePoint, Stop } from "./types";

/**
 * Walking route polyline along Cahuenga Blvd from Universal City/Studio City
 * B Line station south toward 3330 Cahuenga Blvd W.
 * Extracted from GTFS shape 2220081 (route 222 southbound).
 * Cumulative distances computed via haversine between consecutive points.
 */
export const WALKING_ROUTE: RoutePoint[] = computeCumulativeDistances([
  // Universal City / Studio City Station area
  { lat: 34.13903, lng: -118.36317 },
  { lat: 34.13896, lng: -118.36282 },
  { lat: 34.13886, lng: -118.36242 },
  // Lankershim / Campo De Cahuenga
  { lat: 34.13882, lng: -118.36213 },
  { lat: 34.13860, lng: -118.36146 },
  // Curve onto Cahuenga Blvd
  { lat: 34.13810, lng: -118.36053 },
  { lat: 34.13767, lng: -118.35974 },
  { lat: 34.13710, lng: -118.35862 },
  // Cahuenga / Regal area
  { lat: 34.13604, lng: -118.35720 },
  { lat: 34.13560, lng: -118.35619 },
  { lat: 34.13476, lng: -118.35609 },
  { lat: 34.13438, lng: -118.35597 },
  // Cahuenga / Broadlawn
  { lat: 34.13378, lng: -118.35568 },
  { lat: 34.13330, lng: -118.35561 },
  { lat: 34.13298, lng: -118.35621 },
  { lat: 34.13294, lng: -118.35611 },
  // Cahuenga / Universal Studios
  { lat: 34.13244, lng: -118.35396 },
  { lat: 34.13231, lng: -118.35342 },
  { lat: 34.13219, lng: -118.35301 },
  { lat: 34.13207, lng: -118.35307 },
  // Cahuenga / Oakshire
  { lat: 34.13160, lng: -118.35194 },
  { lat: 34.13132, lng: -118.35092 },
  { lat: 34.13041, lng: -118.35009 },
  { lat: 34.13031, lng: -118.34996 },
  // Heading toward Barham
  { lat: 34.12994, lng: -118.34938 },
  { lat: 34.12968, lng: -118.34898 },
  { lat: 34.12893, lng: -118.34785 },
  { lat: 34.12843, lng: -118.34722 },
  { lat: 34.12815, lng: -118.34688 },
  // Cahuenga / Barham
  { lat: 34.12786, lng: -118.34658 },
  { lat: 34.12751, lng: -118.34622 },
  { lat: 34.12704, lng: -118.34572 },
  { lat: 34.12692, lng: -118.34560 },
  { lat: 34.12665, lng: -118.34534 },
  // Cahuenga / Oakcrest
  { lat: 34.12652, lng: -118.34525 },
  { lat: 34.12626, lng: -118.34503 },
  { lat: 34.12574, lng: -118.34466 },
  { lat: 34.12530, lng: -118.34442 },
  { lat: 34.12499, lng: -118.34422 },
  // Past Oakcrest — destination area (3330 Cahuenga Blvd W)
  { lat: 34.12481, lng: -118.34407 },
  { lat: 34.12438, lng: -118.34368 },
  { lat: 34.12417, lng: -118.34341 },
  { lat: 34.12388, lng: -118.34308 },
  { lat: 34.12368, lng: -118.34287 },
]);

/**
 * Route 222 southbound stops along Cahuenga Blvd, from Universal City station
 * to just past the destination at 3330 Cahuenga Blvd W.
 * Route distances are computed by snapping stop positions to the walking polyline.
 */
export const STOPS: Stop[] = [
  {
    id: "30002",
    name: "Universal City / Studio City Station",
    position: { lat: 34.139051, lng: -118.363171 },
    routeDistance: 0,
  },
  {
    id: "15025",
    name: "Lankershim / Campo De Cahuenga",
    position: { lat: 34.138861, lng: -118.362424 },
    routeDistance: 0,
  },
  {
    id: "9141",
    name: "Cahuenga / Regal",
    position: { lat: 34.134733, lng: -118.360846 },
    routeDistance: 0,
  },
  {
    id: "9144",
    name: "Cahuenga / Broadlawn",
    position: { lat: 34.132818, lng: -118.356102 },
    routeDistance: 0,
  },
  {
    id: "9133",
    name: "Cahuenga / Universal Studios",
    position: { lat: 34.132074, lng: -118.353066 },
    routeDistance: 0,
  },
  {
    id: "9146",
    name: "Cahuenga / Oakshire",
    position: { lat: 34.130307, lng: -118.350187 },
    routeDistance: 0,
  },
  {
    id: "9142",
    name: "Cahuenga / Barham",
    position: { lat: 34.127784, lng: -118.346690 },
    routeDistance: 0,
  },
  {
    id: "552",
    name: "Cahuenga / Oakcrest",
    position: { lat: 34.126449, lng: -118.345370 },
    routeDistance: 0,
  },
];

/** Total walking distance from start to end of route in meters */
export const TOTAL_ROUTE_DISTANCE = WALKING_ROUTE[WALKING_ROUTE.length - 1].cumulativeDistance;

/**
 * Northbound walking route — reversed southbound polyline.
 * User walks north from ~Cahuenga/Lakeridge back to Universal City station.
 * Cumulative distances recomputed from the new start point.
 */
export const NORTHBOUND_WALKING_ROUTE: RoutePoint[] = computeCumulativeDistances(
  [...WALKING_ROUTE].reverse().map((p) => ({ lat: p.lat, lng: p.lng }))
);

/**
 * Route 222 northbound stops along Cahuenga Blvd (direction_id=0).
 * Ordered south→north (walking direction: from work back to station).
 * Stop IDs are different from southbound (opposite side of street),
 * except 30002 (Universal City station) which is shared.
 */
export const NORTHBOUND_STOPS: Stop[] = [
  {
    id: "9138",
    name: "Cahuenga / Lakeridge",
    position: { lat: 34.124128, lng: -118.342234 },
    routeDistance: 0,
  },
  {
    id: "554",
    name: "Cahuenga / Barham",
    position: { lat: 34.128667, lng: -118.347312 },
    routeDistance: 0,
  },
  {
    id: "558",
    name: "Cahuenga / Oakshire",
    position: { lat: 34.130549, lng: -118.350062 },
    routeDistance: 0,
  },
  {
    id: "548",
    name: "Cahuenga / Universal Studios",
    position: { lat: 34.132332, lng: -118.353024 },
    routeDistance: 0,
  },
  {
    id: "556",
    name: "Cahuenga / Broadlawn",
    position: { lat: 34.132970, lng: -118.355664 },
    routeDistance: 0,
  },
  {
    id: "551",
    name: "Cahuenga / Regal Pl",
    position: { lat: 34.134975, lng: -118.360751 },
    routeDistance: 0,
  },
  {
    id: "30002",
    name: "Universal / Studio City Station",
    position: { lat: 34.139051, lng: -118.363171 },
    routeDistance: 0,
  },
];

export const NORTHBOUND_TOTAL_ROUTE_DISTANCE =
  NORTHBOUND_WALKING_ROUTE[NORTHBOUND_WALKING_ROUTE.length - 1].cumulativeDistance;

/** Direction-aware route data accessor */
export function getRouteData(directionId: number): {
  walkingRoute: RoutePoint[];
  stops: Stop[];
  totalDistance: number;
} {
  if (directionId === 0) {
    return {
      walkingRoute: NORTHBOUND_WALKING_ROUTE,
      stops: NORTHBOUND_STOPS,
      totalDistance: NORTHBOUND_TOTAL_ROUTE_DISTANCE,
    };
  }
  return {
    walkingRoute: WALKING_ROUTE,
    stops: STOPS,
    totalDistance: TOTAL_ROUTE_DISTANCE,
  };
}

// --- helpers used at module load time ---

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a2 =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

function computeCumulativeDistances(points: { lat: number; lng: number }[]): RoutePoint[] {
  let cumulative = 0;
  return points.map((p, i) => {
    if (i > 0) cumulative += haversineDistance(points[i - 1], p);
    return { ...p, cumulativeDistance: cumulative };
  });
}

// Compute stop route distances by projecting each stop onto nearest segment
function snapToRouteDistance(point: { lat: number; lng: number }, route: RoutePoint[]): number {
  let bestDist = Infinity;
  let bestRouteDist = 0;

  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i];
    const b = route[i + 1];
    const segLen = b.cumulativeDistance - a.cumulativeDistance;
    if (segLen === 0) continue;

    // Project point onto segment (in lat/lng space, fine for short distances)
    const dx = b.lng - a.lng;
    const dy = b.lat - a.lat;
    let t = ((point.lng - a.lng) * dx + (point.lat - a.lat) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    const proj = { lat: a.lat + t * dy, lng: a.lng + t * dx };
    const dist = haversineDistance(point, proj);

    if (dist < bestDist) {
      bestDist = dist;
      bestRouteDist = a.cumulativeDistance + t * segLen;
    }
  }

  return bestRouteDist;
}

// Initialize stop route distances (southbound)
for (const stop of STOPS) {
  stop.routeDistance = snapToRouteDistance(stop.position, WALKING_ROUTE);
}

// Initialize stop route distances (northbound)
for (const stop of NORTHBOUND_STOPS) {
  stop.routeDistance = snapToRouteDistance(stop.position, NORTHBOUND_WALKING_ROUTE);
}
