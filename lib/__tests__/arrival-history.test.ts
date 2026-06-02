import { describe, it, expect, beforeEach } from "vitest";
import { ArrivalHistory, bucketKey } from "@/lib/arrival-history";

const DATE = new Date("2026-06-02T08:30:00"); // a Tuesday, hour 8

describe("ArrivalHistory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null reliability before enough samples accrue", () => {
    const h = new ArrivalHistory();
    h.record([{ tripId: "t1", stopId: "s1", arrivalTime: 1000 }], DATE);
    expect(h.getStopReliability("s1", DATE)).toBeNull();
  });

  it("accumulates inter-poll prediction changes into volatility", () => {
    const h = new ArrivalHistory();
    // First sighting establishes baseline (no delta recorded).
    h.record([{ tripId: "t1", stopId: "s1", arrivalTime: 1000 }], DATE);
    // Each subsequent poll changes the prediction by 30s → deltas of 30.
    for (let i = 1; i <= 6; i++) {
      h.record([{ tripId: "t1", stopId: "s1", arrivalTime: 1000 + i * 30 }], DATE);
    }
    const r = h.getStopReliability("s1", DATE);
    expect(r).not.toBeNull();
    expect(r!.samples).toBeGreaterThanOrEqual(5);
    // Constant 30s deltas → stddev ~0, but a positive sample count.
    expect(r!.stdSeconds).toBeCloseTo(0, 5);
  });

  it("captures spread when prediction changes vary", () => {
    const h = new ArrivalHistory();
    const deltas = [10, 90, 5, 120, 40, 70];
    let t = 1000;
    h.record([{ tripId: "t1", stopId: "s1", arrivalTime: t }], DATE);
    for (const d of deltas) {
      t += d;
      h.record([{ tripId: "t1", stopId: "s1", arrivalTime: t }], DATE);
    }
    const r = h.getStopReliability("s1", DATE)!;
    expect(r.stdSeconds).toBeGreaterThan(0);
  });

  it("buckets by stop, day type, and hour", () => {
    expect(bucketKey("s1", DATE)).toBe("s1|weekday|8");
    expect(bucketKey("s1", new Date("2026-06-06T08:00:00"))).toBe("s1|saturday|8");
  });

  it("persists across instances via localStorage", () => {
    const h1 = new ArrivalHistory();
    let t = 1000;
    h1.record([{ tripId: "t1", stopId: "s1", arrivalTime: t }], DATE);
    for (let i = 0; i < 6; i++) {
      t += 30;
      h1.record([{ tripId: "t1", stopId: "s1", arrivalTime: t }], DATE);
    }
    // New instance loads the persisted buckets.
    const h2 = new ArrivalHistory();
    expect(h2.getStopReliability("s1", DATE)).not.toBeNull();
  });
});
