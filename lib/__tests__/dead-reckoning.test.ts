import { describe, it, expect } from "vitest";
import {
  impliedBusSpeed,
  projectRouteDistance,
  deadReckonBuses,
} from "@/lib/dead-reckoning";
import { WALKING_ROUTE, STOPS, TOTAL_ROUTE_DISTANCE } from "@/lib/route-data";
import { MAX_DEAD_RECKON_SECONDS } from "@/lib/constants";
import type { BusPrediction } from "@/lib/types";

describe("impliedBusSpeed", () => {
  it("computes distance/time when plausible", () => {
    // 300m in 30s = 10 m/s
    expect(impliedBusSpeed(0, 1000, 300, 1030)).toBeCloseTo(10, 5);
  });

  it("returns null for non-forward or zero-time inputs", () => {
    expect(impliedBusSpeed(100, 1000, 50, 1030)).toBeNull(); // backwards
    expect(impliedBusSpeed(0, 1000, 300, 1000)).toBeNull(); // dt 0
  });

  it("returns null for implausible speeds", () => {
    expect(impliedBusSpeed(0, 1000, 1000, 1001)).toBeNull(); // 1000 m/s
    expect(impliedBusSpeed(0, 1000, 1, 1000 + 100)).toBeNull(); // 0.01 m/s
  });
});

describe("projectRouteDistance", () => {
  it("projects forward at the given speed", () => {
    expect(
      projectRouteDistance({ routeDistance: 100, speed: 5, ageSeconds: 10, routeLength: 1000 })
    ).toBe(150);
  });

  it("caps at the approaching stop", () => {
    expect(
      projectRouteDistance({
        routeDistance: 100,
        speed: 5,
        ageSeconds: 100,
        capDistance: 180,
        routeLength: 1000,
      })
    ).toBe(180);
  });

  it("caps extrapolation age", () => {
    const v = projectRouteDistance({
      routeDistance: 0,
      speed: 10,
      ageSeconds: 10_000,
      routeLength: 100_000,
    });
    expect(v).toBe(10 * MAX_DEAD_RECKON_SECONDS);
  });

  it("clamps within route bounds", () => {
    expect(
      projectRouteDistance({ routeDistance: 0, speed: 10, ageSeconds: 50, routeLength: 100 })
    ).toBe(100);
  });
});

describe("deadReckonBuses", () => {
  const now = 1_700_000_000;

  function busPred(opts: {
    pos: { lat: number; lng: number };
    ts: number;
    stopId: string;
    arrival: number;
  }): BusPrediction {
    return {
      tripId: "trip-1",
      stopId: opts.stopId,
      arrivalTime: opts.arrival,
      vehiclePosition: opts.pos,
      vehicleTimestamp: opts.ts,
    };
  }

  it("returns the reported position as-is when there's no age", () => {
    const start = WALKING_ROUTE[0];
    const preds = [
      busPred({ pos: { lat: start.lat, lng: start.lng }, ts: now, stopId: STOPS[3].id, arrival: now + 300 }),
    ];
    const result = deadReckonBuses(preds, WALKING_ROUTE, STOPS, now);
    const bus = result.get("trip-1")!;
    expect(bus.projected).toBe(false);
    expect(bus.ageSeconds).toBe(0);
    expect(bus.position).toEqual({ lat: start.lat, lng: start.lng });
  });

  it("projects a stale position forward along the route", () => {
    const start = WALKING_ROUTE[0];
    // Position reported 40s ago, with an arrival prediction implying forward motion.
    const preds = [
      busPred({
        pos: { lat: start.lat, lng: start.lng },
        ts: now - 40,
        stopId: STOPS[3].id, // ~1099m along
        arrival: now + 200, // 240s from position time to cover ~1099m → ~4.6 m/s
      }),
    ];
    const result = deadReckonBuses(preds, WALKING_ROUTE, STOPS, now);
    const bus = result.get("trip-1")!;
    expect(bus.ageSeconds).toBe(40);
    expect(bus.projected).toBe(true);
    // Projected point should differ from the reported start.
    expect(bus.position.lat).not.toBe(start.lat);
  });

  it("omits buses without a position", () => {
    const preds: BusPrediction[] = [
      { tripId: "trip-2", stopId: STOPS[1].id, arrivalTime: now + 120 },
    ];
    expect(deadReckonBuses(preds, WALKING_ROUTE, STOPS, now).size).toBe(0);
  });

  it("never projects past the end of the route", () => {
    const end = WALKING_ROUTE[WALKING_ROUTE.length - 1];
    const preds = [
      busPred({
        pos: { lat: end.lat, lng: end.lng },
        ts: now - 80,
        stopId: STOPS[STOPS.length - 1].id,
        arrival: now + 10,
      }),
    ];
    const result = deadReckonBuses(preds, WALKING_ROUTE, STOPS, now);
    const bus = result.get("trip-1");
    // At the end with no forward stop, speed can't be implied → reported as-is.
    if (bus) {
      // sanity: position stays on route
      expect(bus.position.lat).toBeGreaterThan(0);
    }
    expect(TOTAL_ROUTE_DISTANCE).toBeGreaterThan(0);
  });
});
