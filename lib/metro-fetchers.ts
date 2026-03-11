import { BusPrediction, LatLng } from "./types";
import { METRO_API_BASE, AGENCY_ID, ROUTE_CODE, DIRECTION_ID } from "./constants";
import { STOPS, NORTHBOUND_STOPS } from "./route-data";

// ---------- Types ----------

export interface VehicleInfo {
  tripId: string;
  vehicleId: string;
  position: LatLng;
  timestamp: number;
}

// Stop IDs per direction
const SOUTHBOUND_STOP_IDS = new Set(STOPS.map((s) => s.id));
const NORTHBOUND_STOP_IDS = new Set(NORTHBOUND_STOPS.map((s) => s.id));

function getStopIds(directionId: number): Set<string> {
  return directionId === 0 ? NORTHBOUND_STOP_IDS : SOUTHBOUND_STOP_IDS;
}

// ---------- Day Type ----------

/**
 * Classify a date as weekday/saturday/sunday for GTFS schedule lookups.
 */
export function getDayType(date: Date): "weekday" | "saturday" | "sunday" {
  const day = date.getDay();
  if (day === 0) return "sunday";
  if (day === 6) return "saturday";
  return "weekday";
}

// ---------- Parse Metro Trip Detail ----------

/**
 * Parse Metro API v2 trip_detail response into BusPrediction[].
 * Filters by direction_id. Extracts stop_time_updates
 * as predictions and vehicle position data.
 *
 * Input shape (from api.metro.net): array of trip objects:
 * [{
 *   route_code, trip_id, direction_id,
 *   vehicle: { id, position: { lat, lng }, timestamp },
 *   stop_time_updates: [{ stop_id, arrival: { time } }]
 * }]
 */
export function parseMetroTripDetail(data: unknown[], directionId: number = DIRECTION_ID): BusPrediction[] {
  if (!Array.isArray(data)) return [];

  const predictions: BusPrediction[] = [];

  for (const trip of data) {
    if (!trip || typeof trip !== "object") continue;

    const t = trip as Record<string, unknown>;
    const tripDirection = Number(t.direction_id ?? -1);
    if (tripDirection !== directionId) continue;

    const tripId = String(t.trip_id || "");
    const vehicle = t.vehicle as Record<string, unknown> | undefined;
    const vehicleId = vehicle ? String(vehicle.id || "") : "";
    const vehiclePos = vehicle?.position as Record<string, unknown> | undefined;
    const vehiclePosition: LatLng | undefined = vehiclePos
      ? { lat: Number(vehiclePos.lat || 0), lng: Number(vehiclePos.lng || 0) }
      : undefined;

    const stopTimeUpdates = (t.stop_time_updates || []) as Array<Record<string, unknown>>;

    for (const stu of stopTimeUpdates) {
      const stopId = String(stu.stop_id || "");
      const arrival = stu.arrival as Record<string, unknown> | undefined;
      const arrivalTime = arrival ? Number(arrival.time || 0) : 0;
      if (arrivalTime === 0) continue;

      predictions.push({
        tripId,
        vehicleId,
        vehiclePosition,
        stopId,
        arrivalTime,
      });
    }
  }

  return predictions;
}

// ---------- Parse Metro Trip Detail → VehicleInfo ----------

/**
 * Extract vehicle positions from Metro API v2 trip_detail response.
 * Each trip with matching direction_id and a valid vehicle.position yields one VehicleInfo.
 */
export function parseMetroVehiclePositions(data: unknown[], directionId: number = DIRECTION_ID): VehicleInfo[] {
  if (!Array.isArray(data)) return [];

  const vehicles: VehicleInfo[] = [];

  for (const trip of data) {
    if (!trip || typeof trip !== "object") continue;

    const t = trip as Record<string, unknown>;
    const tripDirection = Number(t.direction_id ?? -1);
    if (tripDirection !== directionId) continue;

    const tripId = String(t.trip_id || "");
    const vehicle = t.vehicle as Record<string, unknown> | undefined;
    if (!vehicle) continue;

    const vehicleId = String(vehicle.id || "");
    const vehiclePos = vehicle.position as Record<string, unknown> | undefined;
    if (!vehiclePos) continue;

    const lat = Number(vehiclePos.lat || 0);
    const lng = Number(vehiclePos.lng || 0);
    if (lat === 0 || lng === 0) continue;

    const timestamp = Number(vehicle.timestamp || Math.floor(Date.now() / 1000));

    vehicles.push({ tripId, vehicleId, position: { lat, lng }, timestamp });
  }

  return vehicles;
}

// ---------- Parse Schedule Response ----------

/**
 * Parse Metro API v2 route_stops response into schedule-based BusPrediction[].
 * Converts HH:MM:SS departure times to epoch seconds relative to referenceDate.
 * Handles GTFS >24:00 times (after-midnight service).
 * Filters by direction_id and future times only.
 *
 * Input shape: { direction_id, stops: [{ stop_id, stop_name, departure_times: ["HH:MM:SS"] }] }
 */
export function parseScheduleResponse(data: unknown, referenceDate: Date, directionId: number = DIRECTION_ID): BusPrediction[] {
  if (!data || typeof data !== "object") return [];

  const d = data as Record<string, unknown>;
  const entryDirection = Number(d.direction_id ?? -1);
  if (entryDirection !== directionId) return [];

  const stops = (d.stops || []) as Array<Record<string, unknown>>;
  if (!stops.length) return [];

  const nowEpoch = Math.floor(referenceDate.getTime() / 1000);

  // Compute start-of-day in the same timezone as referenceDate
  // by zeroing out hours/minutes/seconds on a copy
  const startOfDay = new Date(referenceDate);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayEpoch = Math.floor(startOfDay.getTime() / 1000);

  const predictions: BusPrediction[] = [];
  // Track times per stop to deduplicate within 60s window
  const seenTimesPerStop = new Map<string, number[]>();

  for (const stop of stops) {
    const stopId = String(stop.stop_id || "");
    const departureTimes = (stop.departure_times || []) as string[];

    if (!seenTimesPerStop.has(stopId)) {
      seenTimesPerStop.set(stopId, []);
    }
    const seenTimes = seenTimesPerStop.get(stopId)!;

    for (const timeStr of departureTimes) {
      const epoch = parseTimeToEpoch(timeStr, startOfDayEpoch);
      if (epoch === null) continue;

      // Filter to future times only
      if (epoch < nowEpoch) continue;

      // Deduplicate: skip if within 60s of an already-seen time for this stop
      const isDuplicate = seenTimes.some((t) => Math.abs(t - epoch) < 60);
      if (isDuplicate) continue;

      seenTimes.push(epoch);

      const tripId = `schedule-${stopId}-${epoch}`;
      predictions.push({
        tripId,
        stopId,
        arrivalTime: epoch,
      });
    }
  }

  return predictions;
}

/**
 * Parse a GTFS HH:MM:SS time string to epoch seconds relative to start of day.
 * Handles >24:00 times by adding the appropriate number of days in seconds.
 */
function parseTimeToEpoch(timeStr: string, startOfDayEpoch: number): number | null {
  const parts = timeStr.split(":");
  if (parts.length !== 3) return null;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(parts[2], 10);

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null;

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  return startOfDayEpoch + totalSeconds;
}

// ---------- Fetch Functions ----------

/**
 * Fetch real-time trip updates from Metro API v2 trip_detail endpoint.
 * Returns parsed predictions with source tag.
 * Throws on HTTP error or empty predictions (caller should catch and fall through).
 */
export async function fetchMetroTripUpdates(directionId: number = DIRECTION_ID): Promise<{
  predictions: BusPrediction[];
  source: string;
}> {
  const url = `${METRO_API_BASE}/${AGENCY_ID}/trip_detail/route_code/${ROUTE_CODE}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error(`[metro-fetchers] Failed to fetch ${url}:`, err);
    throw new Error(`[metro-fetchers] Network error fetching ${url}`);
  }

  if (!res.ok) {
    console.error(`[metro-fetchers] HTTP ${res.status} from ${url}`);
    throw new Error(`[metro-fetchers] HTTP ${res.status} from ${url}`);
  }

  const data = await res.json();
  const predictions = parseMetroTripDetail(data, directionId);

  if (predictions.length === 0) {
    console.info(
      `[metro-fetchers] Empty real-time predictions from ${url} (direction=${directionId}) — normal off-hours behavior`
    );
    throw new Error(`[metro-fetchers] No real-time predictions from ${url}`);
  }

  return { predictions, source: "metro-realtime" };
}

/**
 * Fetch vehicle positions from Metro API v2 trip_detail endpoint.
 * Returns parsed vehicles with source tag.
 * Throws on HTTP error or empty vehicles.
 */
export async function fetchMetroVehiclePositions(directionId: number = DIRECTION_ID): Promise<{
  vehicles: VehicleInfo[];
  source: string;
}> {
  const url = `${METRO_API_BASE}/${AGENCY_ID}/trip_detail/route_code/${ROUTE_CODE}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error(`[metro-fetchers] Failed to fetch ${url}:`, err);
    throw new Error(`[metro-fetchers] Network error fetching ${url}`);
  }

  if (!res.ok) {
    console.error(`[metro-fetchers] HTTP ${res.status} from ${url}`);
    throw new Error(`[metro-fetchers] HTTP ${res.status} from ${url}`);
  }

  const data = await res.json();
  const vehicles = parseMetroVehiclePositions(data, directionId);

  if (vehicles.length === 0) {
    console.info(
      `[metro-fetchers] No vehicle positions from ${url} (direction=${directionId}) — normal off-hours behavior`
    );
    throw new Error(`[metro-fetchers] No vehicle positions from ${url}`);
  }

  return { vehicles, source: "metro-realtime" };
}

/**
 * Fetch schedule-based predictions from Metro API v2 route_stops endpoint.
 * Returns parsed predictions with source tag.
 * Throws on HTTP error or empty predictions.
 */
export async function fetchSchedulePredictions(directionId: number = DIRECTION_ID): Promise<{
  predictions: BusPrediction[];
  source: string;
}> {
  const now = new Date();
  const dayType = getDayType(now);
  const url = `${METRO_API_BASE}/${AGENCY_ID}/route_stops/${ROUTE_CODE}?day_type=${dayType}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.error(`[metro-fetchers] Failed to fetch ${url}:`, err);
    throw new Error(`[metro-fetchers] Network error fetching ${url}`);
  }

  if (!res.ok) {
    console.error(`[metro-fetchers] HTTP ${res.status} from ${url}`);
    throw new Error(`[metro-fetchers] HTTP ${res.status} from ${url}`);
  }

  const data = await res.json();
  const predictions = parseScheduleResponse(data, now, directionId);

  if (predictions.length === 0) {
    console.error(`[metro-fetchers] No schedule predictions from ${url} (direction=${directionId})`);
    throw new Error(`[metro-fetchers] No schedule predictions from ${url}`);
  }

  return { predictions, source: "schedule" };
}
