import { NextRequest, NextResponse } from "next/server";
import { ROUTE_SHORT_NAME, DIRECTION_ID, SWIFTLY_API_BASE } from "@/lib/constants";
import { STOPS, NORTHBOUND_STOPS } from "@/lib/route-data";
import { BusPrediction } from "@/lib/types";
import {
  fetchMetroTripUpdates,
  fetchSchedulePredictions,
} from "@/lib/metro-fetchers";

const SOUTHBOUND_STOP_IDS = new Set(STOPS.map((s) => s.id));
const NORTHBOUND_STOP_IDS = new Set(NORTHBOUND_STOPS.map((s) => s.id));

function getStopIds(directionId: number): Set<string> {
  return directionId === 0 ? NORTHBOUND_STOP_IDS : SOUTHBOUND_STOP_IDS;
}

// ---------- Mock fallback ----------

function generateMockPredictions(directionId: number = DIRECTION_ID): BusPrediction[] {
  const now = Math.floor(Date.now() / 1000);
  const predictions: BusPrediction[] = [];
  const stops = directionId === 0 ? NORTHBOUND_STOPS : STOPS;

  const baseBusArrival = now + 180;
  stops.forEach((stop, i) => {
    predictions.push({
      tripId: "mock-trip-001",
      vehicleId: "mock-vehicle-001",
      stopId: stop.id,
      arrivalTime: baseBusArrival + i * 120,
    });
  });

  const baseBus2 = now + 900;
  stops.forEach((stop, i) => {
    predictions.push({
      tripId: "mock-trip-002",
      vehicleId: "mock-vehicle-002",
      stopId: stop.id,
      arrivalTime: baseBus2 + i * 120,
    });
  });

  return predictions;
}

// ---------- Swiftly tier ----------

/**
 * Try Swiftly GTFS-RT feed. Returns predictions with source tag.
 * Throws if Swiftly is unavailable, returns an error, or yields no data.
 */
async function trySwiftly(directionId: number): Promise<{ predictions: BusPrediction[]; source: string }> {
  const apiKey = process.env.SWIFTLY_API_KEY;
  if (!apiKey) {
    throw new Error("SWIFTLY_API_KEY not configured");
  }

  const url = `${SWIFTLY_API_BASE}/gtfs-rt-trip-updates?format=json`;

  // Try raw key first, then Bearer format
  let res = await fetch(url, {
    headers: { Authorization: apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      throw new Error(`Swiftly HTTP ${res.status}`);
    }
  }

  const data = (await res.json()) as Record<string, unknown>;
  const predictions = parseSwiftlyResponse(data, directionId);

  if (predictions.length === 0) {
    throw new Error("Swiftly returned no matching predictions");
  }

  return { predictions, source: "swiftly" };
}

/**
 * Parse Swiftly GTFS-RT tripUpdates JSON into BusPrediction[].
 */
function parseSwiftlyResponse(data: Record<string, unknown>, directionId: number): BusPrediction[] {
  const predictions: BusPrediction[] = [];

  const entities = (data.entity || data.Entity || []) as Array<Record<string, unknown>>;

  for (const entity of entities) {
    const tripUpdate = (entity.tripUpdate || entity.trip_update) as Record<string, unknown> | undefined;
    if (!tripUpdate) continue;

    const trip = (tripUpdate.trip || tripUpdate.Trip) as Record<string, unknown> | undefined;
    if (!trip) continue;

    const routeId = String(trip.routeId || trip.route_id || "");
    const tripDirectionId = Number(trip.directionId ?? trip.direction_id ?? -1);

    if (!routeId.includes(ROUTE_SHORT_NAME) || tripDirectionId !== directionId) continue;

    const tripId = String(trip.tripId || trip.trip_id || "");
    const vehicleDescriptor = (tripUpdate.vehicle || tripUpdate.Vehicle) as Record<string, unknown> | undefined;
    const vehicleId = vehicleDescriptor ? String(vehicleDescriptor.id || vehicleDescriptor.Id || "") : undefined;

    const stopTimeUpdates = (tripUpdate.stopTimeUpdate || tripUpdate.stop_time_update || []) as Array<Record<string, unknown>>;

    for (const stu of stopTimeUpdates) {
      const stopId = String(stu.stopId || stu.stop_id || "");
      if (!getStopIds(directionId).has(stopId)) continue;

      const arrival = (stu.arrival || stu.Arrival) as Record<string, unknown> | undefined;
      const departure = (stu.departure || stu.Departure) as Record<string, unknown> | undefined;
      const timeObj = arrival || departure;
      if (!timeObj) continue;

      const arrivalTime = Number(timeObj.time || timeObj.Time || 0);
      if (arrivalTime === 0) continue;

      predictions.push({ tripId, vehicleId, stopId, arrivalTime });
    }
  }

  return predictions;
}

// ---------- GET handler — 4-tier fallback ----------

export async function GET(request: NextRequest) {
  const directionId = Number(request.nextUrl.searchParams.get("direction") ?? DIRECTION_ID);

  // Tier 1: Swiftly
  const hasSwiftlyKey = !!process.env.SWIFTLY_API_KEY;
  if (hasSwiftlyKey) {
    try {
      const result = await trySwiftly(directionId);
      console.info(`[trip-updates] Serving from swiftly (direction=${directionId})`);
      return NextResponse.json(result);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[trip-updates] swiftly failed: ${reason}, trying next tier`);
    }
  } else {
    console.info("[trip-updates] SWIFTLY_API_KEY not set, skipping swiftly tier");
  }

  // Tier 2: Metro API v2 real-time
  try {
    const result = await fetchMetroTripUpdates(directionId);
    console.info(`[trip-updates] Serving from metro-realtime (direction=${directionId})`);
    return NextResponse.json(result);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[trip-updates] metro-realtime failed: ${reason}, trying next tier`);
  }

  // Tier 3: Schedule
  try {
    const result = await fetchSchedulePredictions(directionId);
    console.info(`[trip-updates] Serving from schedule (direction=${directionId})`);
    return NextResponse.json(result);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[trip-updates] schedule failed: ${reason}, trying next tier`);
  }

  // Tier 4: Mock fallback
  console.warn(`[trip-updates] All tiers failed, serving mock data (direction=${directionId})`);
  return NextResponse.json({
    predictions: generateMockPredictions(directionId),
    source: "mock",
  });
}
