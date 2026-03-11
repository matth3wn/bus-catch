import { NextResponse } from "next/server";
import { ROUTE_SHORT_NAME, DIRECTION_ID, SWIFTLY_API_BASE } from "@/lib/constants";
import { STOPS } from "@/lib/route-data";
import { BusPrediction } from "@/lib/types";
import {
  fetchMetroTripUpdates,
  fetchSchedulePredictions,
} from "@/lib/metro-fetchers";

const STOP_IDS = new Set(STOPS.map((s) => s.id));

// ---------- Mock fallback ----------

function generateMockPredictions(): BusPrediction[] {
  const now = Math.floor(Date.now() / 1000);
  const predictions: BusPrediction[] = [];

  const baseBusArrival = now + 180;
  STOPS.forEach((stop, i) => {
    predictions.push({
      tripId: "mock-trip-001",
      vehicleId: "mock-vehicle-001",
      stopId: stop.id,
      arrivalTime: baseBusArrival + i * 120,
    });
  });

  const baseBus2 = now + 900;
  STOPS.forEach((stop, i) => {
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
async function trySwiftly(): Promise<{ predictions: BusPrediction[]; source: string }> {
  const apiKey = process.env.SWIFTLY_API_KEY;
  if (!apiKey) {
    throw new Error("SWIFTLY_API_KEY not configured");
  }

  const url = `${SWIFTLY_API_BASE}/gtfs-rt/tripUpdates?format=json`;

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
  const predictions = parseSwiftlyResponse(data);

  if (predictions.length === 0) {
    throw new Error("Swiftly returned no matching predictions");
  }

  return { predictions, source: "swiftly" };
}

/**
 * Parse Swiftly GTFS-RT tripUpdates JSON into BusPrediction[].
 */
function parseSwiftlyResponse(data: Record<string, unknown>): BusPrediction[] {
  const predictions: BusPrediction[] = [];

  const entities = (data.entity || data.Entity || []) as Array<Record<string, unknown>>;

  for (const entity of entities) {
    const tripUpdate = (entity.tripUpdate || entity.trip_update) as Record<string, unknown> | undefined;
    if (!tripUpdate) continue;

    const trip = (tripUpdate.trip || tripUpdate.Trip) as Record<string, unknown> | undefined;
    if (!trip) continue;

    const routeId = String(trip.routeId || trip.route_id || "");
    const directionId = Number(trip.directionId ?? trip.direction_id ?? -1);

    if (!routeId.includes(ROUTE_SHORT_NAME) || directionId !== DIRECTION_ID) continue;

    const tripId = String(trip.tripId || trip.trip_id || "");
    const vehicleDescriptor = (tripUpdate.vehicle || tripUpdate.Vehicle) as Record<string, unknown> | undefined;
    const vehicleId = vehicleDescriptor ? String(vehicleDescriptor.id || vehicleDescriptor.Id || "") : undefined;

    const stopTimeUpdates = (tripUpdate.stopTimeUpdate || tripUpdate.stop_time_update || []) as Array<Record<string, unknown>>;

    for (const stu of stopTimeUpdates) {
      const stopId = String(stu.stopId || stu.stop_id || "");
      if (!STOP_IDS.has(stopId)) continue;

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

export async function GET() {
  // Tier 1: Swiftly
  const hasSwiftlyKey = !!process.env.SWIFTLY_API_KEY;
  if (hasSwiftlyKey) {
    try {
      const result = await trySwiftly();
      console.info("[trip-updates] Serving from swiftly");
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
    const result = await fetchMetroTripUpdates();
    console.info("[trip-updates] Serving from metro-realtime");
    return NextResponse.json(result);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[trip-updates] metro-realtime failed: ${reason}, trying next tier`);
  }

  // Tier 3: Schedule
  try {
    const result = await fetchSchedulePredictions();
    console.info("[trip-updates] Serving from schedule");
    return NextResponse.json(result);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[trip-updates] schedule failed: ${reason}, trying next tier`);
  }

  // Tier 4: Mock fallback
  console.warn("[trip-updates] All tiers failed, serving mock data");
  return NextResponse.json({
    predictions: generateMockPredictions(),
    source: "mock",
  });
}
