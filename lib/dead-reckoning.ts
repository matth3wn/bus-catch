import { BusPrediction, LatLng, RoutePoint, Stop } from "./types";
import { snapToRoute, pointAtRouteDistance } from "./geo";
import {
  MAX_DEAD_RECKON_SECONDS,
  MIN_BUS_SPEED,
  MAX_BUS_SPEED,
} from "./constants";

export interface DeadReckonedBus {
  tripId: string;
  /** Best estimate of the bus position right now */
  position: LatLng;
  /** Last-reported position straight from the feed (un-projected) */
  reportedPosition: LatLng;
  /** Age of the underlying feed position in seconds */
  ageSeconds: number;
  /** Whether the position was projected forward (true) or used as-is (false) */
  projected: boolean;
}

/**
 * Estimate the bus's speed (m/s) from its own arrival prediction: distance to the
 * soonest upcoming stop divided by the time until it's predicted to arrive there.
 * Returns null when there's no usable forward prediction.
 */
export function impliedBusSpeed(
  vehicleRouteDistance: number,
  fromTime: number,
  stopRouteDistance: number,
  arrivalTime: number
): number | null {
  const dist = stopRouteDistance - vehicleRouteDistance;
  const dt = arrivalTime - fromTime;
  if (dist <= 0 || dt <= 0) return null;
  const speed = dist / dt;
  if (speed < MIN_BUS_SPEED || speed > MAX_BUS_SPEED) return null;
  return speed;
}

/**
 * Project a known route distance forward in time at a given speed, without
 * overshooting the stop the bus is still approaching, and capping the
 * extrapolation age so a very stale fix isn't projected into fantasy.
 */
export function projectRouteDistance(opts: {
  routeDistance: number;
  speed: number;
  ageSeconds: number;
  capDistance?: number;
  routeLength: number;
}): number {
  const age = Math.max(0, Math.min(opts.ageSeconds, MAX_DEAD_RECKON_SECONDS));
  let projected = opts.routeDistance + opts.speed * age;
  if (opts.capDistance !== undefined) {
    projected = Math.min(projected, opts.capDistance);
  }
  return Math.max(0, Math.min(projected, opts.routeLength));
}

/**
 * Dead-reckon every bus that has a known position, using each trip's own arrival
 * predictions to estimate speed and projecting forward from the position's
 * timestamp to `nowSeconds`. Buses without a position are omitted.
 *
 * Uses only data the feed already provides (position + timestamp + arrival
 * predictions) — no extra sensors — so it runs client-side.
 */
export function deadReckonBuses(
  predictions: BusPrediction[],
  route: RoutePoint[],
  stops: Stop[],
  nowSeconds: number
): Map<string, DeadReckonedBus> {
  const result = new Map<string, DeadReckonedBus>();
  if (route.length === 0) return result;
  const routeLength = route[route.length - 1].cumulativeDistance;
  const stopDistById = new Map(stops.map((s) => [s.id, s.routeDistance]));

  // One representative position per trip.
  const byTrip = new Map<string, BusPrediction[]>();
  for (const p of predictions) {
    const list = byTrip.get(p.tripId) ?? [];
    list.push(p);
    byTrip.set(p.tripId, list);
  }

  for (const [tripId, preds] of byTrip) {
    const withPos = preds.find((p) => p.vehiclePosition);
    if (!withPos?.vehiclePosition) continue;

    const reportedPosition = withPos.vehiclePosition;
    const snap = snapToRoute(reportedPosition, route);
    const positionTime = withPos.vehicleTimestamp ?? nowSeconds;
    const ageSeconds = Math.max(0, nowSeconds - positionTime);

    // Find the soonest upcoming stop prediction ahead of the bus to imply speed.
    let speed: number | null = null;
    let capDistance: number | undefined;
    const upcoming = preds
      .filter((p) => p.arrivalTime > positionTime)
      .map((p) => ({ d: stopDistById.get(p.stopId), arrivalTime: p.arrivalTime }))
      .filter((x): x is { d: number; arrivalTime: number } => x.d !== undefined && x.d > snap.routeDistance)
      .sort((a, b) => a.arrivalTime - b.arrivalTime);

    if (upcoming.length > 0) {
      const next = upcoming[0];
      speed = impliedBusSpeed(snap.routeDistance, positionTime, next.d, next.arrivalTime);
      capDistance = next.d;
    }

    if (speed === null || ageSeconds === 0) {
      // Can't estimate speed (or no staleness) — use the reported position as-is.
      result.set(tripId, {
        tripId,
        position: reportedPosition,
        reportedPosition,
        ageSeconds,
        projected: false,
      });
      continue;
    }

    const projectedDistance = projectRouteDistance({
      routeDistance: snap.routeDistance,
      speed,
      ageSeconds,
      capDistance,
      routeLength,
    });

    result.set(tripId, {
      tripId,
      position: pointAtRouteDistance(route, projectedDistance),
      reportedPosition,
      ageSeconds,
      projected: projectedDistance > snap.routeDistance + 1,
    });
  }

  return result;
}
