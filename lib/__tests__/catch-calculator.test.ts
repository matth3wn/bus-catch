import { describe, it, expect } from "vitest";
import { calculateCatch } from "@/lib/catch-calculator";
import { STOPS, TOTAL_ROUTE_DISTANCE, NORTHBOUND_STOPS, NORTHBOUND_TOTAL_ROUTE_DISTANCE } from "@/lib/route-data";
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

  it("Mid-walk just past Broadlawn: WAIT there (re-eval tolerance keeps it catchable)", () => {
    // User at routeDist=1100, ~1m past Broadlawn (~1099). Within the 25m re-eval
    // tolerance the user is essentially AT Broadlawn (walk ≈ 0s), and a bus 5min
    // out is easily catchable — so WAIT here rather than discarding the stop.
    const user = makeUser(1100);
    const preds = makePredictionsAllStops(300);
    const { recommendation } = calculateCatch(user, preds, NOW);

    expect(recommendation.action).toBe("WAIT");
    expect(recommendation.waitStop?.id).toBe(BROADLAWN.id);
    expect(recommendation.reason).toMatch(/Wait here/i);
  });

  it("Mid-walk well past a stop: KEEP_WALKING when next stop's margin < buffer", () => {
    // User at routeDist=1130, ~31m past Broadlawn (beyond the 25m tolerance → dropped).
    // Next stop Universal Studios (~1406): walk (1406-1130)/1.4 ≈ 197s.
    // Bus in 280s → margin = 83s < 90s buffer → not catchable.
    const user = makeUser(1130);
    const preds = makePredictionsAllStops(280);
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

// ---------- Northbound scenarios ----------

describe("calculateCatch — northbound", () => {
  // Northbound stops: 9138 (Lakeridge) → 554 (Barham) → 558 (Oakshire) → 548 (Universal Studios) → 556 (Broadlawn) → 551 (Regal) → 30002 (Station)
  const NB_LAKERIDGE = NORTHBOUND_STOPS.find((s) => s.id === "9138")!;
  const NB_BARHAM = NORTHBOUND_STOPS.find((s) => s.id === "554")!;
  const NB_STATION = NORTHBOUND_STOPS.find((s) => s.id === "30002")!;

  function makeNorthboundUser(
    routeDistance: number,
    speed: number = DEFAULT_WALKING_SPEED
  ): UserPosition {
    return {
      position: { lat: 34.126, lng: -118.344 },
      routeDistance,
      walkingSpeed: speed,
      accuracy: 10,
      timestamp: NOW,
    };
  }

  function makeNBPrediction(
    stopId: string,
    secondsFromNow: number,
    tripId = "nb-trip-1"
  ): BusPrediction {
    return {
      tripId,
      stopId,
      arrivalTime: NOW + secondsFromNow,
    };
  }

  it("uses northbound stops when passed as parameter", () => {
    const user = makeNorthboundUser(0);
    const preds = [makeNBPrediction("554", 600)]; // Bus at Barham in 10 min
    const { analyses } = calculateCatch(user, preds, NOW, NORTHBOUND_STOPS);

    // Should have 7 stops (northbound), not 8 (southbound)
    expect(analyses).toHaveLength(7);
    expect(analyses[0].stop.id).toBe("9138"); // Lakeridge (first northbound stop)
    expect(analyses[6].stop.id).toBe("30002"); // Station (last northbound stop)
  });

  it("WAIT when northbound bus arrives in time at Barham", () => {
    // User near Lakeridge (start of northbound walk), bus at Barham in 10 min
    const user = makeNorthboundUser(NB_LAKERIDGE.routeDistance + 10);
    const preds = [makeNBPrediction("554", 600)];
    const { recommendation } = calculateCatch(user, preds, NOW, NORTHBOUND_STOPS);

    // Barham is ~500m from Lakeridge. At 1.4m/s ≈ 357s walk. 600s bus - 357s walk = 243s margin > 90s buffer.
    expect(recommendation.action).toBe("WAIT");
    expect(recommendation.waitStop?.id).toBe("554");
  });

  it("KEEP_WALKING when northbound bus arrives too soon", () => {
    // User near Lakeridge, bus at Station (far away) in 60s — can't catch it
    const user = makeNorthboundUser(NB_LAKERIDGE.routeDistance + 10);
    const preds = [makeNBPrediction("30002", 60)];
    const { recommendation } = calculateCatch(user, preds, NOW, NORTHBOUND_STOPS);

    expect(recommendation.action).toBe("KEEP_WALKING");
  });

  it("NO_DATA when no predictions for northbound stops", () => {
    const user = makeNorthboundUser(NB_LAKERIDGE.routeDistance + 10);
    const { recommendation } = calculateCatch(user, [], NOW, NORTHBOUND_STOPS);
    expect(recommendation.action).toBe("NO_DATA");
  });
});

// ---------- Confidence & uncertainty ----------

describe("calculateCatch — confidence and intervals", () => {
  it("emits a symmetric interval around the point ETA", () => {
    const user = makeUser(0);
    const preds = [makePrediction(LANKERSHIM.id, 300)];
    const { analyses } = calculateCatch(user, preds, NOW);
    const a = analyses.find((x) => x.stop.id === LANKERSHIM.id)!;

    expect(a.busSeconds).toBe(300);
    expect(a.busSecondsLow).not.toBeNull();
    expect(a.busSecondsHigh).not.toBeNull();
    expect(a.busSecondsLow!).toBeLessThan(a.busSeconds!);
    expect(a.busSecondsHigh!).toBeGreaterThan(a.busSeconds!);
    expect(a.confidence).not.toBeNull();
  });

  it("rates realtime + certain predictions as high confidence", () => {
    const user = makeUser(0);
    const preds: BusPrediction[] = [
      { tripId: "t1", stopId: LANKERSHIM.id, arrivalTime: NOW + 300, uncertainty: 0 },
    ];
    const { analyses } = calculateCatch(user, preds, NOW, undefined, {
      dataSource: "realtime",
      staleness: 0,
    });
    const a = analyses.find((x) => x.stop.id === LANKERSHIM.id)!;
    expect(a.confidence).toBe("high");
  });

  it("rates schedule data as low confidence and widens the interval", () => {
    const user = makeUser(0);
    const preds = [makePrediction(LANKERSHIM.id, 300)];
    const realtime = calculateCatch(user, preds, NOW, undefined, { dataSource: "realtime", staleness: 0 });
    const schedule = calculateCatch(user, preds, NOW, undefined, { dataSource: "schedule", staleness: 0 });

    const rt = realtime.analyses.find((x) => x.stop.id === LANKERSHIM.id)!;
    const sc = schedule.analyses.find((x) => x.stop.id === LANKERSHIM.id)!;

    expect(sc.confidence).toBe("low");
    const rtWidth = rt.busSecondsHigh! - rt.busSecondsLow!;
    const scWidth = sc.busSecondsHigh! - sc.busSecondsLow!;
    expect(scWidth).toBeGreaterThan(rtWidth);
  });

  it("widens the catch buffer when data is uncertain (a marginal stop becomes uncatchable)", () => {
    // Pick a margin that's catchable with the base 90s buffer but not with extra
    // schedule uncertainty. User at start; bus at Lankershim (~71m, walk ~51s).
    // busSeconds 150 → margin 99 > 90 (catchable), but schedule adds +60 → buffer 150 > 99.
    const user = makeUser(0);
    const preds = [makePrediction(LANKERSHIM.id, 150)];

    const realtime = calculateCatch(user, preds, NOW, undefined, { dataSource: "realtime", staleness: 0 });
    const schedule = calculateCatch(user, preds, NOW, undefined, { dataSource: "schedule", staleness: 0 });

    expect(realtime.analyses.find((x) => x.stop.id === LANKERSHIM.id)!.catchable).toBe(true);
    expect(schedule.analyses.find((x) => x.stop.id === LANKERSHIM.id)!.catchable).toBe(false);
  });

  it("widens the interval using per-stop reliability volatility", () => {
    const user = makeUser(0);
    const preds = [makePrediction(LANKERSHIM.id, 300)];
    const reliabilityByStop = new Map<string, number>([[LANKERSHIM.id, 120]]);

    const base = calculateCatch(user, preds, NOW, undefined, { dataSource: "realtime", staleness: 0 });
    const noisy = calculateCatch(user, preds, NOW, undefined, {
      dataSource: "realtime",
      staleness: 0,
      reliabilityByStop,
    });

    const b = base.analyses.find((x) => x.stop.id === LANKERSHIM.id)!;
    const n = noisy.analyses.find((x) => x.stop.id === LANKERSHIM.id)!;
    expect(n.busSecondsHigh! - n.busSecondsLow!).toBeGreaterThan(b.busSecondsHigh! - b.busSecondsLow!);
  });

  it("drops physically-impossible predictions before deciding", () => {
    // Same trip: Lankershim (nearer, ~71m) at 400s, Regal (further, ~475m) at 100s.
    // Regal-at-100 is impossible relative to Lankershim-at-400 and must be dropped,
    // so Regal should NOT be treated as an imminent catch.
    const user = makeUser(0);
    const preds = [
      makePrediction(LANKERSHIM.id, 400, "trip-x"),
      makePrediction(REGAL.id, 100, "trip-x"),
    ];
    const { analyses } = calculateCatch(user, preds, NOW);
    const regal = analyses.find((x) => x.stop.id === REGAL.id)!;
    expect(regal.busSeconds).toBeNull();
  });
});
