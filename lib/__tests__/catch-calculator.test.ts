import { describe, it, expect } from "vitest";
import { calculateCatch } from "@/lib/catch-calculator";
import { STOPS, TOTAL_ROUTE_DISTANCE } from "@/lib/route-data";
import { CATCH_BUFFER_SECONDS, DEFAULT_WALKING_SPEED } from "@/lib/constants";
import type { BusPrediction, UserPosition } from "@/lib/types";

// ---------- Helpers ----------

const NOW = 1_700_000_000; // arbitrary fixed epoch (seconds)

/** Create a BusPrediction arriving `secondsFromNow` after NOW at the given stop */
function makePrediction(
  stopId: string,
  secondsFromNow: number,
  tripId = "trip-1"
): BusPrediction {
  return {
    tripId,
    stopId,
    arrivalTime: NOW + secondsFromNow,
  };
}

/** Create predictions for ALL stops arriving `secondsFromNow` from NOW */
function makePredictionsAllStops(secondsFromNow: number): BusPrediction[] {
  return STOPS.map((s) => makePrediction(s.id, secondsFromNow));
}

/** Create a UserPosition at a given routeDistance with optional speed override */
function makeUser(
  routeDistance: number,
  speed: number = DEFAULT_WALKING_SPEED
): UserPosition {
  return {
    position: { lat: 34.135, lng: -118.355 }, // approximate; not used by calculator
    routeDistance,
    walkingSpeed: speed,
    accuracy: 10,
    timestamp: NOW * 1000,
  };
}

// Real stop references from route-data (route distances computed at module load)
const STATION = STOPS[0]; // Universal City, routeDist ~0
const LANKERSHIM = STOPS[1]; // Lankershim, routeDist ~71
const REGAL = STOPS[2]; // Cahuenga/Regal, routeDist ~475
const BROADLAWN = STOPS[3]; // Cahuenga/Broadlawn, routeDist ~1099
const UNIVERSAL = STOPS[4]; // Cahuenga/Universal Studios, routeDist ~1406
const OAKSHIRE = STOPS[5]; // Cahuenga/Oakshire, routeDist ~1749
const BARHAM = STOPS[6]; // Cahuenga/Barham, routeDist ~2180
const OAKCREST = STOPS[7]; // Cahuenga/Oakcrest, routeDist ~2373

// ---------- Scenario Tests ----------

describe("calculateCatch — scenario tests", () => {
  it("No GPS (null user): returns NO_DATA with GPS reason", () => {
    const preds = makePredictionsAllStops(300);
    const { recommendation, analyses } = calculateCatch(null, preds, NOW);

    expect(recommendation.action).toBe("NO_DATA");
    expect(recommendation.reason).toMatch(/GPS/i);
    expect(analyses.every((a) => !a.catchable)).toBe(true);
  });

  it("No predictions (empty array): returns NO_DATA with predictions reason and walk times calculated", () => {
    const user = makeUser(500);
    const { recommendation, analyses } = calculateCatch(user, [], NOW);

    expect(recommendation.action).toBe("NO_DATA");
    expect(recommendation.reason).toMatch(/prediction/i);

    // Walk times should be computed for stops ahead of user
    const aheadStops = analyses.filter((a) => a.stop.routeDistance > 500);
    expect(aheadStops.length).toBeGreaterThan(0);
    expect(aheadStops.every((a) => a.walkSeconds > 0)).toBe(true);
  });

  it("All predictions in past: returns KEEP_WALKING (past predictions filtered out)", () => {
    // All predictions have arrival time before NOW → busSeconds ≤ 0
    const pastPreds = STOPS.map((s) => makePrediction(s.id, -60));
    const user = makeUser(0);
    const { recommendation, analyses } = calculateCatch(user, pastPreds, NOW);

    expect(recommendation.action).toBe("KEEP_WALKING");
    // No stop should be catchable since all bus arrivals are in the past
    expect(analyses.every((a) => !a.catchable)).toBe(true);
  });

  it("Start of walk, bus 5min out: WAIT at Lankershim (nearest catchable)", () => {
    // User at route start (dist=0), bus arriving in 300s at all stops
    const user = makeUser(0);
    const preds = makePredictionsAllStops(300);
    const { recommendation } = calculateCatch(user, preds, NOW);

    expect(recommendation.action).toBe("WAIT");
    // Lankershim is first stop ahead (~71m, walk ~51s at 1.4 m/s)
    // 300s bus - 51s walk = 249s margin >> 90s buffer → catchable
    expect(recommendation.waitStop?.id).toBe(LANKERSHIM.id);
    expect(recommendation.waitStop?.name).toMatch(/Lankershim/);
  });

  it("Mid-walk, bus 5min out: KEEP_WALKING (margin < 90s buffer)", () => {
    // User at routeDist=1100 (just before Broadlawn at ~1099)
    // Broadlawn walk ~0s (basically there), but stop.routeDistance <= user.routeDistance
    // So Broadlawn is behind/at user. Next ahead: Universal Studios at ~1406
    // Walk to Universal: (1406 - 1100) / 1.4 = ~219s
    // Bus in 300s, margin = 300 - 219 = 81s < 90s buffer → not catchable
    const user = makeUser(1100);
    const preds = makePredictionsAllStops(300);
    const { recommendation } = calculateCatch(user, preds, NOW);

    expect(recommendation.action).toBe("KEEP_WALKING");
  });

  it("At a stop, bus 3.5min: WAIT with 'Wait here' phrasing", () => {
    // User at routeDist=70, very close to Lankershim (~71m)
    // Walk to Lankershim: (71 - 70) / 1.4 ≈ 0.7s → < 30s threshold → "Wait here"
    const user = makeUser(70);
    const preds = [makePrediction(LANKERSHIM.id, 200)];
    const { recommendation } = calculateCatch(user, preds, NOW);

    expect(recommendation.action).toBe("WAIT");
    expect(recommendation.waitStop?.id).toBe(LANKERSHIM.id);
    expect(recommendation.reason).toMatch(/Wait here/i);
  });

  it("Past all stops: KEEP_WALKING (all stops behind user)", () => {
    // User at 2500m → past Oakcrest (~2373m), all stops behind
    const user = makeUser(2500);
    const preds = makePredictionsAllStops(300);
    const { recommendation, analyses } = calculateCatch(user, preds, NOW);

    expect(recommendation.action).toBe("KEEP_WALKING");
    expect(analyses.every((a) => !a.catchable)).toBe(true);
  });

  it("Fast walker (2.0 m/s): reaches more stops, WAIT at Broadlawn", () => {
    // User at routeDist=600, speed=2.0 m/s
    // Broadlawn at ~1099: walk = (1099 - 600) / 2.0 ≈ 250s
    // Bus arrives Broadlawn in 400s → margin = 400 - 250 = 150s > 90s → catchable
    // Regal at ~475: behind user (475 < 600) → skipped
    // Broadlawn is the first catchable stop ahead
    const user = makeUser(600, 2.0);
    const preds = STOPS.map((s) => {
      // Realistic per-stop predictions: bus is further from closer stops
      const busDist = s.routeDistance;
      const busTime = busDist < 600 ? 100 : 250 + (busDist - 600) * 0.3;
      return makePrediction(s.id, busTime);
    });
    const { recommendation } = calculateCatch(user, preds, NOW);

    expect(recommendation.action).toBe("WAIT");
    expect(recommendation.waitStop?.id).toBe(BROADLAWN.id);
  });

  it("Slow walker (0.8 m/s): fewer stops catchable, KEEP_WALKING", () => {
    // User at routeDist=600, speed=0.8 m/s
    // Same predictions as fast walker test
    // Broadlawn at ~1099: walk = (1099 - 600) / 0.8 ≈ 624s
    // Bus arrives Broadlawn in 400s → margin = 400 - 624 < 0 → not catchable
    // All further stops need even more walk time → none catchable
    const user = makeUser(600, 0.8);
    const preds = STOPS.map((s) => {
      const busDist = s.routeDistance;
      const busTime = busDist < 600 ? 100 : 250 + (busDist - 600) * 0.3;
      return makePrediction(s.id, busTime);
    });
    const { recommendation } = calculateCatch(user, preds, NOW);

    expect(recommendation.action).toBe("KEEP_WALKING");
  });
});

// ---------- Edge Case Tests ----------

describe("calculateCatch — edge cases", () => {
  it("Only one stop has a prediction: only that stop can be catchable", () => {
    // User at start, only Broadlawn has a prediction (far enough ahead with generous ETA)
    const user = makeUser(0);
    const preds = [makePrediction(BROADLAWN.id, 1200)]; // 20 min out
    const { recommendation, analyses } = calculateCatch(user, preds, NOW);

    // Broadlawn walk: ~1099 / 1.4 ≈ 785s, bus in 1200s, margin = 415s > 90s → catchable
    expect(recommendation.action).toBe("WAIT");
    expect(recommendation.waitStop?.id).toBe(BROADLAWN.id);

    // Stops without predictions should have busSeconds: null
    const unpredicted = analyses.filter(
      (a) => a.stop.id !== BROADLAWN.id && a.stop.routeDistance > 0
    );
    expect(unpredicted.every((a) => a.busSeconds === null)).toBe(true);
    expect(unpredicted.every((a) => !a.catchable)).toBe(true);
  });

  it("Bus arriving at stop behind user: stop is skipped", () => {
    // User at routeDist=500, Lankershim (~71m) is behind
    const user = makeUser(500);
    const preds = [makePrediction(LANKERSHIM.id, 300)];
    const { analyses } = calculateCatch(user, preds, NOW);

    const lankershimAnalysis = analyses.find((a) => a.stop.id === LANKERSHIM.id)!;
    expect(lankershimAnalysis.catchable).toBe(false);
    expect(lankershimAnalysis.walkSeconds).toBe(0);
    expect(lankershimAnalysis.busSeconds).toBeNull();
  });

  it("Multiple buses at same stop: earliest arrival used", () => {
    // User near start, two predictions at Lankershim — should use earliest
    const user = makeUser(0);
    const preds = [
      makePrediction(LANKERSHIM.id, 600, "trip-late"), // 10 min
      makePrediction(LANKERSHIM.id, 200, "trip-early"), // 3.3 min
    ];
    const { analyses } = calculateCatch(user, preds, NOW);

    const lankershimAnalysis = analyses.find((a) => a.stop.id === LANKERSHIM.id)!;
    // Should use the 200s arrival, not 600s
    expect(lankershimAnalysis.busSeconds).toBe(200);
    expect(lankershimAnalysis.catchable).toBe(true);
  });
});
