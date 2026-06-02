import { BusPrediction } from "./types";
import { ETA_EMA_ALPHA, ETA_SNAP_THRESHOLD_SECONDS } from "./constants";

interface SmoothedEntry {
  arrivalTime: number;
  lastSeen: number;
}

const PRUNE_AFTER_SECONDS = 5 * 60;

/**
 * Smooths bus arrival-time predictions across polls with an exponential moving
 * average, keyed by trip+stop. Raw feeds make the predicted arrival hop around
 * between polls (re-estimation, GPS jitter); EMA tames the resulting countdown
 * flicker while still tracking genuine change.
 *
 * If a fresh prediction differs from the smoothed value by more than
 * ETA_SNAP_THRESHOLD_SECONDS we snap to it — the bus really jumped (long dwell,
 * new trip assignment), so easing would lag reality.
 *
 * Stateful by design: construct once and reuse across polls.
 */
export class EtaSmoother {
  private entries = new Map<string, SmoothedEntry>();

  constructor(
    private alpha: number = ETA_EMA_ALPHA,
    private snapThreshold: number = ETA_SNAP_THRESHOLD_SECONDS
  ) {}

  private key(p: BusPrediction): string {
    return `${p.tripId}:${p.stopId}`;
  }

  /** Return predictions with smoothed arrivalTime. NO_DATA / unusable entries pass through. */
  smooth(predictions: BusPrediction[], nowSeconds: number): BusPrediction[] {
    this.prune(nowSeconds);

    return predictions.map((p) => {
      if (p.arrivalTime <= 0) return p; // NO_DATA / unusable — don't smooth

      const k = this.key(p);
      const prior = this.entries.get(k);

      let smoothed: number;
      if (!prior || Math.abs(p.arrivalTime - prior.arrivalTime) > this.snapThreshold) {
        smoothed = p.arrivalTime;
      } else {
        smoothed = prior.arrivalTime + this.alpha * (p.arrivalTime - prior.arrivalTime);
      }

      this.entries.set(k, { arrivalTime: smoothed, lastSeen: nowSeconds });
      return { ...p, arrivalTime: Math.round(smoothed) };
    });
  }

  private prune(nowSeconds: number): void {
    for (const [k, v] of this.entries) {
      if (nowSeconds - v.lastSeen > PRUNE_AFTER_SECONDS) this.entries.delete(k);
    }
  }

  reset(): void {
    this.entries.clear();
  }
}
