import {
  BusPrediction,
  Confidence,
  Recommendation,
  Stop,
  StopCatchAnalysis,
  UserPosition,
} from "./types";
import { STOPS } from "./route-data";
import { walkTimeSeconds } from "./geo";
import { sanitizePredictions } from "./prediction-sanity";
import {
  CATCH_BUFFER_SECONDS,
  DEFAULT_WALKING_SPEED,
  UNCERTAINTY_BUFFER_FACTOR,
  UNCERTAINTY_BUFFER_MAX,
  SCHEDULE_BUFFER_SECONDS,
  STALENESS_BUFFER_MAX,
  STALENESS_WARNING_SECONDS,
  MIN_INTERVAL_HALF_WIDTH_SECONDS,
  STOP_REEVAL_TOLERANCE_METERS,
} from "./constants";

type DataSource = "realtime" | "schedule" | "mock" | null;

export interface CatchOptions {
  /** Active data tier — schedule/mock/stale data widens the safety margin. */
  dataSource?: DataSource;
  /** Seconds since last successful fetch (widens margin past the warning threshold). */
  staleness?: number | null;
  /** Per-stop historical prediction volatility (stdSeconds) to widen intervals. */
  reliabilityByStop?: Map<string, number>;
}

/**
 * Extra margin (seconds) to add on top of the base catch buffer for a given
 * prediction, reflecting how much we distrust it: feed-reported uncertainty,
 * schedule/mock fallback, staleness, and historical volatility for this stop.
 * The same value drives both the catch decision and the displayed interval.
 */
function uncertaintyMargin(
  pred: BusPrediction | null,
  opts: CatchOptions,
  reliabilityStd: number
): number {
  let extra = 0;

  if (pred?.uncertainty !== undefined && pred.uncertainty > 0) {
    extra += Math.min(UNCERTAINTY_BUFFER_MAX, pred.uncertainty * UNCERTAINTY_BUFFER_FACTOR);
  }
  if (opts.dataSource === "schedule" || opts.dataSource === "mock") {
    extra += SCHEDULE_BUFFER_SECONDS;
  }
  if (opts.staleness != null && opts.staleness > STALENESS_WARNING_SECONDS) {
    extra += Math.min(STALENESS_BUFFER_MAX, opts.staleness - STALENESS_WARNING_SECONDS);
  }
  extra += reliabilityStd;

  return extra;
}

function confidenceLevel(
  pred: BusPrediction | null,
  opts: CatchOptions,
  halfWidth: number
): Confidence {
  if (opts.dataSource === "mock") return "low";
  if (pred?.scheduleRelationship === "NO_DATA") return "low";
  if (opts.dataSource === "schedule") return "low";

  const stale = opts.staleness != null && opts.staleness > STALENESS_WARNING_SECONDS;
  const veryUncertain = pred?.uncertainty !== undefined && pred.uncertainty > 60;
  if (stale || veryUncertain || halfWidth > 90) return "medium";

  // Realtime, fresh, tight interval, feed reports certainty (0 or omitted-small).
  if (
    opts.dataSource === "realtime" &&
    halfWidth <= MIN_INTERVAL_HALF_WIDTH_SECONDS + 1
  ) {
    return "high";
  }
  return "medium";
}

function emptyAnalysis(stop: Stop, walkSeconds = 0): StopCatchAnalysis {
  return {
    stop,
    walkSeconds,
    busSeconds: null,
    busSecondsLow: null,
    busSecondsHigh: null,
    confidence: null,
    catchable: false,
    recommended: false,
  };
}

/**
 * Pure function: given user position, bus predictions, and current time,
 * compute per-stop catch analysis and overall recommendation.
 *
 * Confidence-aware: each stop yields a bus-arrival interval (busSecondsLow/High)
 * and a confidence level, and the catch decision widens its safety buffer when
 * the underlying data is uncertain, schedule-based, stale, or historically jumpy.
 */
export function calculateCatch(
  user: UserPosition | null,
  predictions: BusPrediction[],
  nowSeconds: number,
  stops?: Stop[],
  options: CatchOptions = {}
): { analyses: StopCatchAnalysis[]; recommendation: Recommendation } {
  const activeStops = stops ?? STOPS;
  const reliabilityByStop = options.reliabilityByStop;

  if (!user) {
    return {
      analyses: activeStops.map((stop) => emptyAnalysis(stop)),
      recommendation: { action: "NO_DATA", reason: "Waiting for GPS..." },
    };
  }

  if (predictions.length === 0) {
    return {
      analyses: activeStops.map((stop) =>
        emptyAnalysis(
          stop,
          walkTimeSeconds(
            user.routeDistance,
            stop.routeDistance,
            user.walkingSpeed || DEFAULT_WALKING_SPEED
          )
        )
      ),
      recommendation: { action: "NO_DATA", reason: "No bus predictions available" },
    };
  }

  const speed = user.walkingSpeed || DEFAULT_WALKING_SPEED;
  // Drop physically-impossible predictions before reasoning about them.
  const cleanPredictions = sanitizePredictions(predictions, activeStops);

  // For each stop, find the soonest bus prediction and assess catchability.
  const analyses: StopCatchAnalysis[] = activeStops.map((stop) => {
    // Consider stops ahead of the user. Rescue a stop the user appears to have
    // just passed (small GPS drift) so it isn't dropped, but still exclude the
    // stop the user is standing on (their origin) and stops clearly behind.
    const behindBy = user.routeDistance - stop.routeDistance;
    if (behindBy === 0 || behindBy >= STOP_REEVAL_TOLERANCE_METERS) {
      return emptyAnalysis(stop);
    }

    const walkSec = walkTimeSeconds(user.routeDistance, stop.routeDistance, speed);

    // Soonest still-future prediction for this stop.
    const earliest = cleanPredictions
      .filter((p) => p.stopId === stop.id && p.arrivalTime - nowSeconds > 0)
      .sort((a, b) => a.arrivalTime - b.arrivalTime)[0];

    if (!earliest) {
      return emptyAnalysis(stop, walkSec);
    }

    const busSec = earliest.arrivalTime - nowSeconds;
    const reliabilityStd = reliabilityByStop?.get(stop.id) ?? 0;
    const margin = uncertaintyMargin(earliest, options, reliabilityStd);
    const halfWidth = Math.max(MIN_INTERVAL_HALF_WIDTH_SECONDS, margin);
    const confidence = confidenceLevel(earliest, options, halfWidth);

    // Catchable: bus arrives at least (base buffer + uncertainty margin) after
    // the user would. Noisier data demands a bigger cushion.
    const effectiveBuffer = CATCH_BUFFER_SECONDS + margin;
    const catchable = busSec >= walkSec + effectiveBuffer;

    return {
      stop,
      walkSeconds: walkSec,
      busSeconds: busSec,
      busSecondsLow: Math.max(0, Math.round(busSec - halfWidth)),
      busSecondsHigh: Math.round(busSec + halfWidth),
      confidence,
      catchable,
      recommended: false,
    };
  });

  const catchableStops = analyses.filter((a) => a.catchable);

  if (catchableStops.length === 0) {
    return {
      analyses,
      recommendation: {
        action: "KEEP_WALKING",
        reason: "No bus will arrive in time — keep walking",
      },
    };
  }

  // Recommend the nearest catchable stop.
  const recommended = catchableStops[0];
  recommended.recommended = true;

  const waitThreshold = 30;
  if (recommended.walkSeconds <= waitThreshold) {
    return {
      analyses,
      recommendation: {
        action: "WAIT",
        waitStop: recommended.stop,
        reason: `Wait here at ${recommended.stop.name}`,
      },
    };
  }

  return {
    analyses,
    recommendation: {
      action: "WAIT",
      waitStop: recommended.stop,
      reason: `Walk to ${recommended.stop.name} and wait`,
    },
  };
}
