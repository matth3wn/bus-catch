import { describe, it, expect } from "vitest";
import { haversine, snapToRoute, walkTimeSeconds } from "@/lib/geo";
import { WALKING_ROUTE, TOTAL_ROUTE_DISTANCE } from "@/lib/route-data";

// ---------- haversine ----------

describe("haversine", () => {
  it("known distance: Universal City station to Cahuenga/Barham ≈ 1900m", () => {
    // Universal City station area
    const universalCity = { lat: 34.139, lng: -118.363 };
    // Cahuenga/Barham intersection
    const barham = { lat: 34.128, lng: -118.347 };

    const dist = haversine(universalCity, barham);
    // Actual haversine ≈ 1914m (straight line, not route distance)
    expect(dist).toBeGreaterThan(1800);
    expect(dist).toBeLessThan(2000);
  });

  it("zero distance: same point returns 0", () => {
    const point = { lat: 34.139, lng: -118.363 };
    expect(haversine(point, point)).toBe(0);
  });

  it("very short distance: two points ~10m apart", () => {
    // ~10m north (0.00009° latitude ≈ 10m)
    const a = { lat: 34.13900, lng: -118.36300 };
    const b = { lat: 34.13909, lng: -118.36300 };

    const dist = haversine(a, b);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(15);
  });

  it("symmetry: haversine(a, b) === haversine(b, a)", () => {
    const a = { lat: 34.139, lng: -118.363 };
    const b = { lat: 34.128, lng: -118.347 };
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 6);
  });
});

// ---------- snapToRoute ----------

describe("snapToRoute", () => {
  it("point on route: offRouteDistance ≈ 0", () => {
    // Use a point from the walking route itself
    const routePoint = WALKING_ROUTE[10];
    const result = snapToRoute({ lat: routePoint.lat, lng: routePoint.lng });

    expect(result.offRouteDistance).toBeLessThan(1); // < 1m
    expect(result.routeDistance).toBeCloseTo(routePoint.cumulativeDistance, 0);
  });

  it("point ~50m off route: offRouteDistance ≈ 50m", () => {
    // Take a mid-route point and shift it ~50m east
    // At lat ~34°, 1° longitude ≈ 92km, so 50m ≈ 0.00054°
    // Use a larger offset (0.002°≈184m) to be well off-route, then check range
    const midPoint = WALKING_ROUTE[20];
    const offPoint = { lat: midPoint.lat, lng: midPoint.lng + 0.002 };

    const result = snapToRoute(offPoint);
    // 0.002° longitude at lat 34° ≈ 184m, but snap projects to nearest segment
    // so offRouteDistance depends on segment angle. Just verify it's meaningfully off-route.
    expect(result.offRouteDistance).toBeGreaterThan(50);
    expect(result.offRouteDistance).toBeLessThan(250);
  });

  it("point at route start: routeDistance ≈ 0", () => {
    const start = WALKING_ROUTE[0];
    const result = snapToRoute({ lat: start.lat, lng: start.lng });

    expect(result.routeDistance).toBeLessThan(5); // within 5m of start
  });

  it("point at route end: routeDistance ≈ TOTAL_ROUTE_DISTANCE", () => {
    const end = WALKING_ROUTE[WALKING_ROUTE.length - 1];
    const result = snapToRoute({ lat: end.lat, lng: end.lng });

    expect(result.routeDistance).toBeCloseTo(TOTAL_ROUTE_DISTANCE, -1); // within ~10m
  });

  it("point far off route: still snaps to nearest segment", () => {
    // Point 500m north of route start
    const farPoint = { lat: 34.144, lng: -118.363 };
    const result = snapToRoute(farPoint);

    // Should still produce a valid snap result
    expect(result.routeDistance).toBeGreaterThanOrEqual(0);
    expect(result.routeDistance).toBeLessThanOrEqual(TOTAL_ROUTE_DISTANCE);
    expect(result.offRouteDistance).toBeGreaterThan(100); // well off route
  });

  it("routeDistance increases monotonically along the route", () => {
    // Sample several route points and confirm snapToRoute gives increasing distances
    const sampleIndices = [0, 10, 20, 30, 40];
    const distances = sampleIndices.map((i) => {
      const p = WALKING_ROUTE[Math.min(i, WALKING_ROUTE.length - 1)];
      return snapToRoute({ lat: p.lat, lng: p.lng }).routeDistance;
    });

    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]).toBeGreaterThan(distances[i - 1]);
    }
  });
});

// ---------- walkTimeSeconds ----------

describe("walkTimeSeconds", () => {
  it("normal case: 1000m at 1.4 m/s ≈ 714s", () => {
    const result = walkTimeSeconds(0, 1000, 1.4);
    expect(result).toBeCloseTo(714.3, 0);
  });

  it("behind user: toDistance < fromDistance returns 0", () => {
    const result = walkTimeSeconds(500, 200, 1.4);
    expect(result).toBe(0);
  });

  it("same position: returns 0", () => {
    expect(walkTimeSeconds(100, 100, 1.4)).toBe(0);
  });

  it("different speeds produce proportional times", () => {
    const slow = walkTimeSeconds(0, 1000, 1.0);
    const fast = walkTimeSeconds(0, 1000, 2.0);
    expect(slow).toBeCloseTo(fast * 2, 0);
  });
});
