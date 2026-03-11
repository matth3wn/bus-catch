import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration tests for the trip-updates API route.
 * Tests exercise the full fallback chain: Swiftly → Metro real-time → schedule → mock.
 *
 * The GET handler is imported directly and called as a function.
 * Global fetch is mocked to control external API responses.
 * Environment variables are manipulated to test different tiers.
 */

// Will fail until T03 wires the fallback chain
import { GET } from "@/app/api/metro/trip-updates/route";

beforeEach(() => {
  vi.restoreAllMocks();
  // Clear env vars between tests
  delete process.env.SWIFTLY_API_KEY;
});

describe("GET /api/metro/trip-updates", () => {
  it("response always contains predictions array and source string", async () => {
    // With no API key set, should fall through to mock
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty("predictions");
    expect(Array.isArray(body.predictions)).toBe(true);
    expect(body).toHaveProperty("source");
    expect(typeof body.source).toBe("string");
  });

  it("returns predictions with source: 'swiftly' when Swiftly succeeds", async () => {
    process.env.SWIFTLY_API_KEY = "test-key";

    // Mock Swiftly returning valid GTFS-RT data
    const mockSwiftlyResponse = {
      entity: [
        {
          tripUpdate: {
            trip: {
              tripId: "trip-sw-001",
              routeId: "222-13196",
              directionId: 1,
            },
            vehicle: { id: "v-sw-001" },
            stopTimeUpdate: [
              {
                stopId: "30002",
                arrival: { time: Math.floor(Date.now() / 1000) + 300 },
              },
            ],
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

    const response = await GET();
    const body = await response.json();

    expect(body.source).toBe("swiftly");
    expect(body.predictions.length).toBeGreaterThan(0);
    expect(body.predictions[0].stopId).toBe("30002");
  });

  it("falls back to Metro API v2 with source: 'metro-realtime' when Swiftly key missing", async () => {
    // No SWIFTLY_API_KEY set — should skip Swiftly and try Metro API v2

    const mockMetroResponse = [
      {
        route_code: "222",
        trip_id: "t_metro_001",
        direction_id: 1,
        vehicle: {
          id: "8501",
          position: { lat: 34.139, lng: -118.363 },
          timestamp: Math.floor(Date.now() / 1000),
        },
        stop_time_updates: [
          {
            stop_id: "30002",
            arrival: { time: Math.floor(Date.now() / 1000) + 600 },
          },
        ],
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetroResponse),
      })
    );

    const response = await GET();
    const body = await response.json();

    expect(body.source).toBe("metro-realtime");
    expect(body.predictions.length).toBeGreaterThan(0);
  });

  it("falls back to schedule with source: 'schedule' when Metro real-time returns empty", async () => {
    // No SWIFTLY_API_KEY, Metro returns empty trip_detail

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        callCount++;
        if (url.includes("trip_detail")) {
          // Metro real-time returns empty
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        if (url.includes("route_stops")) {
          // Schedule data available
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                direction_id: 1,
                stops: [
                  {
                    stop_id: "30002",
                    stop_name: "Universal City",
                    departure_times: [
                      // Far-future time that will always be "upcoming"
                      "23:55:00",
                    ],
                  },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
      })
    );

    const response = await GET();
    const body = await response.json();

    expect(body.source).toBe("schedule");
    expect(body.predictions.length).toBeGreaterThan(0);
  });

  it("falls back to mock with source: 'mock' when all tiers fail", async () => {
    // No API key, all fetches fail
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure"))
    );

    const response = await GET();
    const body = await response.json();

    expect(body.source).toBe("mock");
    expect(body.predictions.length).toBeGreaterThan(0);
  });

  it("Swiftly failure falls through to Metro API v2", async () => {
    process.env.SWIFTLY_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("goswift.ly")) {
          // Swiftly returns 401
          return Promise.resolve({
            ok: false,
            status: 401,
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
                  trip_id: "t_metro_fallback",
                  direction_id: 1,
                  vehicle: {
                    id: "8510",
                    position: { lat: 34.139, lng: -118.363 },
                    timestamp: Math.floor(Date.now() / 1000),
                  },
                  stop_time_updates: [
                    {
                      stop_id: "9141",
                      arrival: { time: Math.floor(Date.now() / 1000) + 300 },
                    },
                  ],
                },
              ]),
          });
        }
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
      })
    );

    const response = await GET();
    const body = await response.json();

    expect(body.source).toBe("metro-realtime");
    expect(body.predictions.length).toBeGreaterThan(0);
  });
});
