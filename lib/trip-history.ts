/**
 * Trip history — logs commute sessions to localStorage.
 *
 * A "trip" starts when the user first gets a GPS lock on-route and ends when:
 * - The user reaches >90% of the route, OR
 * - No GPS update for 5 minutes (abandoned/backgrounded)
 *
 * Each trip records: start time, end time, direction, whether a bus was caught,
 * which stop, walk distance, and data source quality.
 */

export interface TripRecord {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  dayOfWeek: number; // 0=Sun, 6=Sat
  startTime: number; // Unix ms
  endTime: number; // Unix ms
  direction: "northbound" | "southbound";
  /** Did the user get a WAIT recommendation they could act on? */
  busCaught: boolean;
  /** Stop name where bus was caught (if any) */
  catchStop: string | null;
  /** Total distance walked in meters */
  distanceWalked: number;
  /** Average walking speed in m/s */
  avgSpeed: number;
  /** Primary data source during the trip */
  dataSource: "realtime" | "schedule" | "mock" | null;
  /** Duration in seconds */
  durationSeconds: number;
}

const STORAGE_KEY = "bus-catch-trips";
const MAX_TRIPS = 100;

/** Load all saved trips from localStorage */
export function loadTrips(): TripRecord[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TripRecord[];
  } catch {
    return [];
  }
}

/** Save a trip record, maintaining max size */
export function saveTrip(trip: TripRecord): void {
  if (typeof localStorage === "undefined") return;
  try {
    const trips = loadTrips();
    trips.push(trip);
    // Keep only the most recent trips
    const trimmed = trips.slice(-MAX_TRIPS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

/** Trip session tracker — call from the hook to auto-log trips */
export class TripSession {
  private startTime: number | null = null;
  private direction: "northbound" | "southbound" = "southbound";
  private maxRouteProgress = 0;
  private speedSamples: number[] = [];
  private busCaught = false;
  private catchStop: string | null = null;
  private dataSource: "realtime" | "schedule" | "mock" | null = null;
  private lastUpdateTime: number = 0;
  private saved = false;

  /** Call on every GPS update */
  update(params: {
    routeDistance: number;
    totalRouteDistance: number;
    speed: number;
    direction: "northbound" | "southbound" | null;
    recommendationAction: string;
    waitStopName?: string;
    dataSource: "realtime" | "schedule" | "mock" | null;
  }): void {
    const now = Date.now();

    // Start session on first update
    if (this.startTime === null) {
      this.startTime = now;
    }

    if (params.direction) {
      this.direction = params.direction;
    }

    this.maxRouteProgress = Math.max(
      this.maxRouteProgress,
      params.routeDistance / params.totalRouteDistance
    );

    if (params.speed > 0) {
      this.speedSamples.push(params.speed);
    }

    if (params.recommendationAction === "WAIT" && params.waitStopName) {
      this.busCaught = true;
      this.catchStop = params.waitStopName;
    }

    if (params.dataSource) {
      this.dataSource = params.dataSource;
    }

    this.lastUpdateTime = now;

    // Auto-save when user reaches end of route
    if (this.maxRouteProgress >= 0.9 && !this.saved) {
      this.save();
    }
  }

  /** Check if session has gone stale (no update for 5 min) */
  checkStale(): boolean {
    if (
      this.startTime !== null &&
      !this.saved &&
      this.lastUpdateTime > 0 &&
      Date.now() - this.lastUpdateTime > 5 * 60 * 1000
    ) {
      this.save();
      return true;
    }
    return false;
  }

  /** Manually finalize and save the trip */
  save(): void {
    if (this.saved || this.startTime === null) return;
    if (this.speedSamples.length === 0) return; // No real movement data

    this.saved = true;
    const endTime = this.lastUpdateTime || Date.now();
    const avgSpeed =
      this.speedSamples.reduce((a, b) => a + b, 0) / this.speedSamples.length;

    const now = new Date(this.startTime);

    const trip: TripRecord = {
      id: `${this.startTime}-${Math.random().toString(36).slice(2, 6)}`,
      date: now.toISOString().slice(0, 10),
      dayOfWeek: now.getDay(),
      startTime: this.startTime,
      endTime,
      direction: this.direction,
      busCaught: this.busCaught,
      catchStop: this.catchStop,
      distanceWalked: this.maxRouteProgress * 1609, // approximate
      avgSpeed,
      dataSource: this.dataSource,
      durationSeconds: Math.round((endTime - this.startTime) / 1000),
    };

    saveTrip(trip);
  }
}

/** Compute summary stats from trip history */
export function tripStats(trips: TripRecord[]): {
  totalTrips: number;
  busCaughtCount: number;
  busCaughtRate: number;
  avgDurationMinutes: number;
  avgSpeedMph: number;
  dayBreakdown: Record<string, { trips: number; caught: number }>;
} | null {
  if (trips.length === 0) return null;

  const busCaughtCount = trips.filter((t) => t.busCaught).length;
  const avgDuration =
    trips.reduce((sum, t) => sum + t.durationSeconds, 0) / trips.length;
  const avgSpeed =
    trips.reduce((sum, t) => sum + t.avgSpeed, 0) / trips.length;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayBreakdown: Record<string, { trips: number; caught: number }> = {};
  for (const name of dayNames) {
    dayBreakdown[name] = { trips: 0, caught: 0 };
  }
  for (const trip of trips) {
    const day = dayNames[trip.dayOfWeek];
    dayBreakdown[day].trips++;
    if (trip.busCaught) dayBreakdown[day].caught++;
  }

  return {
    totalTrips: trips.length,
    busCaughtCount,
    busCaughtRate: busCaughtCount / trips.length,
    avgDurationMinutes: avgDuration / 60,
    avgSpeedMph: avgSpeed * 2.237, // m/s to mph
    dayBreakdown,
  };
}
