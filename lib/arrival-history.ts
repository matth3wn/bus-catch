/**
 * Arrival-prediction reliability tracker.
 *
 * The app never observes when a bus *actually* arrives (it isn't at the stop),
 * so it can't learn true prediction error. What it CAN observe — purely
 * client-side — is how much the feed's predicted arrival time for a given bus
 * churns between polls. A prediction that keeps hopping around is untrustworthy.
 *
 * We bucket that observed volatility by stop, day type, and hour of day, persist
 * it to localStorage, and surface a per-stop reliability estimate that widens the
 * displayed confidence interval where this stop/time is historically jumpy.
 *
 * This is the honest, low-cost version of "fuse history into the prediction": it
 * learns prediction *stability*, not absolute bias.
 */

const STORAGE_KEY = "bus-catch-arrival-history";
const MAX_SAMPLES_PER_BUCKET = 40;
const MIN_SAMPLES_FOR_RELIABILITY = 5;

type DayType = "weekday" | "saturday" | "sunday";

function dayType(date: Date): DayType {
  const d = date.getDay();
  if (d === 0) return "sunday";
  if (d === 6) return "saturday";
  return "weekday";
}

export function bucketKey(stopId: string, date: Date): string {
  return `${stopId}|${dayType(date)}|${date.getHours()}`;
}

type Buckets = Record<string, number[]>;

function loadBuckets(): Buckets {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Buckets) : {};
  } catch {
    return {};
  }
}

function saveBuckets(b: Buckets): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
  } catch {
    // full/unavailable — fail silently
  }
}

function stddev(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}

export interface StopReliability {
  samples: number;
  /** Standard deviation of inter-poll prediction changes, in seconds. */
  stdSeconds: number;
}

interface Observation {
  tripId: string;
  stopId: string;
  /** Predicted arrival as absolute Unix seconds. */
  arrivalTime: number;
}

export class ArrivalHistory {
  private lastArrival = new Map<string, number>();
  private buckets: Buckets;

  constructor() {
    this.buckets = loadBuckets();
  }

  /**
   * Feed the current poll's predictions. For each (trip, stop) seen before, the
   * absolute change in predicted arrival time is recorded into the relevant bucket.
   */
  record(observations: Observation[], date: Date): void {
    let changed = false;

    for (const o of observations) {
      if (o.arrivalTime <= 0) continue;
      const k = `${o.tripId}:${o.stopId}`;
      const prev = this.lastArrival.get(k);
      this.lastArrival.set(k, o.arrivalTime);
      if (prev === undefined) continue;

      const delta = Math.abs(o.arrivalTime - prev);
      const bk = bucketKey(o.stopId, date);
      const arr = this.buckets[bk] ?? [];
      arr.push(delta);
      if (arr.length > MAX_SAMPLES_PER_BUCKET) {
        arr.splice(0, arr.length - MAX_SAMPLES_PER_BUCKET);
      }
      this.buckets[bk] = arr;
      changed = true;
    }

    if (changed) saveBuckets(this.buckets);
  }

  /** Reliability for a stop at the given time, or null if too few samples. */
  getStopReliability(stopId: string, date: Date): StopReliability | null {
    const arr = this.buckets[bucketKey(stopId, date)];
    if (!arr || arr.length < MIN_SAMPLES_FOR_RELIABILITY) return null;
    return { samples: arr.length, stdSeconds: stddev(arr) };
  }
}
