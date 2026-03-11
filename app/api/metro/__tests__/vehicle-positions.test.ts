import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Integration tests for the vehicle-positions API route.
 * Tests exercise the fallback chain: Swiftly → Metro real-time → mock.
 * (No schedule tier for positions — schedule data has no vehicle locations.)
 *
 * The GET handler is imported directly and called as a function.
 * Global fetch is mocked to control external API responses.
 */

import { GET } from "@/app/api/metro/vehicle-positions/route";

/** Create a mock NextRequest with optional direction query param */
function makeRequest(direction?: number): NextRequest {
  const url = direction !== undefined
    ? `http://localhost:3000/api/metro/vehicle-positions?direction=${direction}`
    : "http://localhost:3000/api/metro/vehicle-positions";
  return new NextRequest(url);
}

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.SWIFTLY_API_KEY;
});

describe("GET /api/metro/vehicle-positions", () => {
  it("response always contains vehicles array and source string", async () => {
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body).toHaveProperty("vehicles");
    expect(Array.isArray(body.vehicles)).toBe(true);
    expect(body).toHaveProperty("source");
    expect(typeof body.source).toBe("string");
  });

  it("returns vehicles with source: 'swiftly' when Swiftly succeeds", async () => {
    process.env.SWIFTLY_API_KEY = "test-key";

    const mockSwiftlyResponse = {
      entity: [
        {
          vehicle: {
            trip: {
              tripId: "trip-sw-001",
              routeId: "222-13196",
              directionId: 1,
            },
            vehicle: { id: "v-sw-001" },
            position: { latitude: 34.139, longitude: -118.363 },
            timestamp: Math.floor(Date.now() / 1000),
          },
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSwiftlyResponse),
      })
    );

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.source).toBe("swiftly");
    expect(body.vehicles.length).toBeGreaterThan(0);
    expect(body.vehicles[0]).toHaveProperty("position");
    expect(body.vehicles[0].position).toHaveProperty("lat");
    expect(body.vehicles[0].position).toHaveProperty("lng");
  });

  it("falls back to Metro API v2 with source: 'metro-realtime' when Swiftly key missing", async () => {
    // No SWIFTLY_API_KEY — skip Swiftly, try Metro API v2
    const mockMetroTripDetail = [
      {
        route_code: "222",
        trip_id: "t_metro_001",
        direction_id: 1,
        vehicle: {
          id: "8501",
          position: { lat: 34.139, lng: -118.363 },
          timestamp: Math.floor(Date.now() / 1000),
        },
        stop_time_updates: [],
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetroTripDetail),
      })
    );

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.source).toBe("metro-realtime");
    expect(body.vehicles.length).toBeGreaterThan(0);
    expect(body.vehicles[0].vehicleId).toBe("8501");
  });

  it("falls back to mock with source: 'mock' when Metro real-time fails", async () => {
    // No API key, fetch fails
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.source).toBe("mock");
    expect(body.vehicles.length).toBeGreaterThan(0);
  });

  it("Swiftly failure falls through to Metro API v2 (no schedule tier for positions)", async () => {
    process.env.SWIFTLY_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("goswift.ly")) {
          return Promise.resolve({
            ok: false,
            status: 403,
            json: () => Promise.resolve({}),
          });
        }
        if (url.includes("api.metro.net") && url.includes("trip_detail")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  route_code: "222",
                  trip_id: "t_metro_fb",
                  direction_id: 1,
                  vehicle: {
                    id: "8520",
                    position: { lat: 34.130, lng: -118.350 },
                    timestamp: Math.floor(Date.now() / 1000),
                  },
                  stop_time_updates: [],
                },
              ]),
          });
        }
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
      })
    );

    const response = await GET(makeRequest());
    const body = await response.json();

    expect(body.source).toBe("metro-realtime");
    expect(body.vehicles.length).toBeGreaterThan(0);
  });
});
