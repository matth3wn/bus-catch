import { BusPrediction, Stop } from "./types";

/**
 * Drop physically-impossible predictions.
 *
 * For a single trip, the bus must arrive at stops in route order: a stop further
 * along the route cannot be predicted to arrive *before* a nearer stop on the same
 * trip. Feeds occasionally emit such contradictions; using them produces nonsense
 * ETAs. We walk each trip's stops in route order and drop any prediction whose
 * arrival time goes backwards relative to the last accepted one.
 *
 * Predictions with no usable arrival time (arrivalTime <= 0, e.g. NO_DATA markers)
 * and predictions for stops not present in `stops` are passed through untouched —
 * we can't order what we can't place.
 *
 * @param predictions Raw predictions (any number of trips).
 * @param stops Ordered stops for the active direction (ascending routeDistance).
 * @returns Filtered predictions in their original relative order.
 */
export function sanitizePredictions(
  predictions: BusPrediction[],
  stops: Stop[]
): BusPrediction[] {
  // Map stopId -> route order index. Lower index = nearer the route start.
  const order = new Map<string, number>();
  stops.forEach((s, i) => order.set(s.id, i));

  // Group orderable predictions by trip; remember which ones to drop.
  const dropped = new Set<BusPrediction>();
  const byTrip = new Map<string, BusPrediction[]>();

  for (const p of predictions) {
    if (p.arrivalTime <= 0) continue; // NO_DATA / unusable — never dropped here
    if (!order.has(p.stopId)) continue; // can't place it — leave alone
    const list = byTrip.get(p.tripId) ?? [];
    list.push(p);
    byTrip.set(p.tripId, list);
  }

  for (const list of byTrip.values()) {
    // Sort by route order, tie-break by arrival time for stability.
    const sorted = [...list].sort((a, b) => {
      const oa = order.get(a.stopId)!;
      const ob = order.get(b.stopId)!;
      return oa !== ob ? oa - ob : a.arrivalTime - b.arrivalTime;
    });

    let lastAccepted = -Infinity;
    for (const p of sorted) {
      if (p.arrivalTime < lastAccepted) {
        // Arrival goes backwards along the route — impossible. Drop it.
        dropped.add(p);
      } else {
        lastAccepted = p.arrivalTime;
      }
    }
  }

  if (dropped.size === 0) return predictions;
  return predictions.filter((p) => !dropped.has(p));
}
