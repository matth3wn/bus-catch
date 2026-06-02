import { describe, it, expect } from "vitest";
import { sanitizePredictions } from "@/lib/prediction-sanity";
import type { BusPrediction, Stop } from "@/lib/types";

const STOPS: Stop[] = [
  { id: "A", name: "A", position: { lat: 0, lng: 0 }, routeDistance: 0 },
  { id: "B", name: "B", position: { lat: 0, lng: 0 }, routeDistance: 100 },
  { id: "C", name: "C", position: { lat: 0, lng: 0 }, routeDistance: 200 },
];

function p(stopId: string, arrivalTime: number, tripId = "t1"): BusPrediction {
  return { tripId, stopId, arrivalTime };
}

describe("sanitizePredictions", () => {
  it("keeps monotonically-increasing predictions untouched", () => {
    const preds = [p("A", 100), p("B", 200), p("C", 300)];
    expect(sanitizePredictions(preds, STOPS)).toEqual(preds);
  });

  it("drops a further stop that arrives before a nearer stop on the same trip", () => {
    // B (nearer) at 200, C (further) at 150 → impossible, drop C
    const preds = [p("A", 100), p("B", 200), p("C", 150)];
    const result = sanitizePredictions(preds, STOPS);
    expect(result.map((x) => x.stopId)).toEqual(["A", "B"]);
  });

  it("does not cross trips when checking monotonicity", () => {
    const preds = [p("A", 300, "t1"), p("B", 100, "t2")];
    // Different trips → both valid
    expect(sanitizePredictions(preds, STOPS)).toHaveLength(2);
  });

  it("passes through NO_DATA / zero-arrival markers", () => {
    const nodata: BusPrediction = {
      tripId: "t1",
      stopId: "B",
      arrivalTime: 0,
      scheduleRelationship: "NO_DATA",
    };
    const preds = [p("A", 100), nodata, p("C", 200)];
    const result = sanitizePredictions(preds, STOPS);
    expect(result).toContain(nodata);
    expect(result).toHaveLength(3);
  });

  it("leaves predictions for unknown stops alone", () => {
    const preds = [p("A", 100), p("Z", 50)];
    expect(sanitizePredictions(preds, STOPS)).toHaveLength(2);
  });

  it("returns the same array reference when nothing is dropped", () => {
    const preds = [p("A", 100), p("B", 200)];
    expect(sanitizePredictions(preds, STOPS)).toBe(preds);
  });
});
