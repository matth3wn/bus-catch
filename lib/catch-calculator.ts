import { BusPrediction, Recommendation, Stop, StopCatchAnalysis, UserPosition } from "./types";
import { STOPS } from "./route-data";
import { walkTimeSeconds } from "./geo";
import { CATCH_BUFFER_SECONDS, DEFAULT_WALKING_SPEED } from "./constants";

/**
 * Pure function: given user position, bus predictions, and current time,
 * compute per-stop catch analysis and overall recommendation.
 * Accepts optional stops array for direction-aware calculations.
 */
export function calculateCatch(
  user: UserPosition | null,
  predictions: BusPrediction[],
  nowSeconds: number,
  stops?: Stop[]
): { analyses: StopCatchAnalysis[]; recommendation: Recommendation } {
  const activeStops = stops ?? STOPS;

  if (!user) {
    return {
      analyses: activeStops.map((stop) => ({
        stop,
        walkSeconds: 0,
        busSeconds: null,
        catchable: false,
        recommended: false,
      })),
      recommendation: { action: "NO_DATA", reason: "Waiting for GPS..." },
    };
  }

  if (predictions.length === 0) {
    return {
      analyses: activeStops.map((stop) => ({
        stop,
        walkSeconds: walkTimeSeconds(
          user.routeDistance,
          stop.routeDistance,
          user.walkingSpeed || DEFAULT_WALKING_SPEED
        ),
        busSeconds: null,
        catchable: false,
        recommended: false,
      })),
      recommendation: { action: "NO_DATA", reason: "No bus predictions available" },
    };
  }

  const speed = user.walkingSpeed || DEFAULT_WALKING_SPEED;

  // For each stop, find the soonest bus prediction
  const analyses: StopCatchAnalysis[] = activeStops.map((stop) => {
    // Only consider stops ahead of the user
    if (stop.routeDistance <= user.routeDistance) {
      return {
        stop,
        walkSeconds: 0,
        busSeconds: null,
        catchable: false,
        recommended: false,
      };
    }

    const walkSec = walkTimeSeconds(user.routeDistance, stop.routeDistance, speed);

    // Find earliest prediction for this stop
    const stopPredictions = predictions
      .filter((p) => p.stopId === stop.id)
      .map((p) => p.arrivalTime - nowSeconds)
      .filter((s) => s > 0)
      .sort((a, b) => a - b);

    const busSec = stopPredictions.length > 0 ? stopPredictions[0] : null;

    // Catchable: bus arrives at least BUFFER seconds after user would arrive
    const catchable = busSec !== null && busSec >= walkSec + CATCH_BUFFER_SECONDS;

    return { stop, walkSeconds: walkSec, busSeconds: busSec, catchable, recommended: false };
  });

  // Find the nearest catchable stop (first one ahead with catchable = true)
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

  // Recommend the nearest catchable stop
  const recommended = catchableStops[0];
  recommended.recommended = true;

  // If the recommended stop is very close (< 30s walk), say WAIT
  // Otherwise, say KEEP_WALKING toward the stop
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
