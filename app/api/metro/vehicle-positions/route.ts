import { NextResponse } from "next/server";
import { ROUTE_SHORT_NAME, DIRECTION_ID, SWIFTLY_API_BASE } from "@/lib/constants";
import { LatLng } from "@/lib/types";
import { fetchMetroVehiclePositions, VehicleInfo } from "@/lib/metro-fetchers";

// ---------- Mock fallback ----------

function generateMockVehicles(): VehicleInfo[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      tripId: "mock-trip-001",
      vehicleId: "mock-vehicle-001",
      position: { lat: 34.145, lng: -118.370 },
      timestamp: now,
    },
    {
      tripId: "mock-trip-002",
      vehicleId: "mock-vehicle-002",
      position: { lat: 34.152, lng: -118.366 },
      timestamp: now,
    },
  ];
}

// ---------- Swiftly tier ----------

/**
 * Try Swiftly GTFS-RT vehiclePositions feed. Returns vehicles with source tag.
 * Throws if Swiftly is unavailable, returns an error, or yields no data.
 */
async function trySwiftly(): Promise<{ vehicles: VehicleInfo[]; source: string }> {
  const apiKey = process.env.SWIFTLY_API_KEY;
  if (!apiKey) {
    throw new Error("SWIFTLY_API_KEY not configured");
  }

  const url = `${SWIFTLY_API_BASE}/gtfs-rt/vehiclePositions?format=json`;

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
  const vehicles = parseSwiftlyResponse(data);

  if (vehicles.length === 0) {
    throw new Error("Swiftly returned no matching vehicles");
  }

  return { vehicles, source: "swiftly" };
}

/**
 * Parse Swiftly GTFS-RT vehiclePositions JSON into VehicleInfo[].
 */
function parseSwiftlyResponse(data: Record<string, unknown>): VehicleInfo[] {
  const vehicles: VehicleInfo[] = [];

  const entities = (data.entity || data.Entity || []) as Array<Record<string, unknown>>;

  for (const entity of entities) {
    const vp = (entity.vehicle || entity.Vehicle) as Record<string, unknown> | undefined;
    if (!vp) continue;

    const trip = (vp.trip || vp.Trip) as Record<string, unknown> | undefined;
    if (!trip) continue;

    const routeId = String(trip.routeId || trip.route_id || "");
    const directionId = Number(trip.directionId ?? trip.direction_id ?? -1);

    if (!routeId.includes(ROUTE_SHORT_NAME) || directionId !== DIRECTION_ID) continue;

    const tripId = String(trip.tripId || trip.trip_id || "");
    const vehicleDesc = (vp.vehicle || vp.Vehicle) as Record<string, unknown> | undefined;
    const vehicleId = vehicleDesc ? String(vehicleDesc.id || vehicleDesc.Id || "") : "";

    const pos = (vp.position || vp.Position) as Record<string, unknown> | undefined;
    if (!pos) continue;

    const lat = Number(pos.latitude || pos.lat || 0);
    const lng = Number(pos.longitude || pos.lng || pos.lon || 0);
    if (lat === 0 || lng === 0) continue;

    const timestamp = Number(vp.timestamp || vp.Timestamp || Math.floor(Date.now() / 1000));

    vehicles.push({ tripId, vehicleId, position: { lat, lng }, timestamp });
  }

  return vehicles;
}

// ---------- GET handler — 3-tier fallback ----------

export async function GET() {
  // Tier 1: Swiftly
  const hasSwiftlyKey = !!process.env.SWIFTLY_API_KEY;
  if (hasSwiftlyKey) {
    try {
      const result = await trySwiftly();
      console.info("[vehicle-positions] Serving from swiftly");
      return NextResponse.json(result);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[vehicle-positions] swiftly failed: ${reason}, trying next tier`);
    }
  } else {
    console.info("[vehicle-positions] SWIFTLY_API_KEY not set, skipping swiftly tier");
  }

  // Tier 2: Metro API v2 real-time
  try {
    const result = await fetchMetroVehiclePositions();
    console.info("[vehicle-positions] Serving from metro-realtime");
    return NextResponse.json(result);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[vehicle-positions] metro-realtime failed: ${reason}, trying next tier`);
  }

  // Tier 3: Mock fallback (no schedule tier for positions)
  console.warn("[vehicle-positions] All tiers failed, serving mock data");
  return NextResponse.json({
    vehicles: generateMockVehicles(),
    source: "mock",
  });
}
