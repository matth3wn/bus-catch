"use client";

import { BusPrediction, StopCatchAnalysis, UserPosition } from "@/lib/types";
import { TOTAL_ROUTE_DISTANCE } from "@/lib/route-data";

interface RouteDiagramProps {
  user: UserPosition | null;
  stopAnalyses: StopCatchAnalysis[];
  predictions: BusPrediction[];
}

export function RouteDiagram({ user, stopAnalyses, predictions }: RouteDiagramProps) {
  const routeHeight = 400;

  function distToY(routeDistance: number): number {
    return (routeDistance / TOTAL_ROUTE_DISTANCE) * routeHeight;
  }

  // Deduplicate bus positions by trip
  const busPositions = new Map<string, BusPrediction>();
  for (const p of predictions) {
    if (p.vehiclePosition && !busPositions.has(p.tripId)) {
      busPositions.set(p.tripId, p);
    }
  }

  return (
    <div className="relative mx-auto" style={{ width: 60, height: routeHeight }}>
      {/* Route line */}
      <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-neutral-600" />

      {/* Stop dots */}
      {stopAnalyses.map((analysis) => {
        const y = distToY(analysis.stop.routeDistance);
        return (
          <div
            key={analysis.stop.id}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: y - 5 }}
          >
            <div
              className={`h-2.5 w-2.5 rounded-full border-2 ${
                analysis.recommended
                  ? "border-amber-400 bg-amber-400"
                  : analysis.catchable
                    ? "border-green-400 bg-green-900"
                    : "border-neutral-500 bg-neutral-800"
              }`}
            />
          </div>
        );
      })}

      {/* User marker */}
      {user && (
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: distToY(user.routeDistance) - 7 }}
        >
          <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-400 bg-blue-500 shadow-lg shadow-blue-500/50" />
        </div>
      )}

      {/* Bus markers — shown at approximate position based on first stop prediction */}
      {Array.from(busPositions.values()).map((bp) => {
        // Estimate bus position along route from predictions
        // Use the earliest stop prediction time to approximate
        const busStopAnalysis = stopAnalyses.find((a) => a.stop.id === bp.stopId);
        if (!busStopAnalysis) return null;

        // Approximate: bus is somewhere before this stop
        const approxDistance = Math.max(0, busStopAnalysis.stop.routeDistance - 200);
        const y = distToY(approxDistance);

        return (
          <div
            key={bp.tripId}
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: y - 6 }}
          >
            <div className="h-3 w-3 rotate-45 border-2 border-amber-400 bg-amber-500" />
          </div>
        );
      })}
    </div>
  );
}
