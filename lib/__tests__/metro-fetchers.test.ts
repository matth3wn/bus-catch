import { describe, it, expect } from "vitest";
import type { BusPrediction } from "@/lib/types";

// These imports will fail until T02 implements the module.
// That is the expected behavior for contract tests.
import {
  getDayType,
  parseMetroTripDetail,
  parseScheduleResponse,
} from "@/lib/metro-fetchers";

// ---------- Fixtures ----------

/** Realistic Metro API v2 trip_detail response for route 222 southbound.
 *  Shape based on S01-RESEARCH: array of trip objects with vehicle/trip/route_code fields.
 */
const TRIP_DETAIL_FIXTURE = [
  {
    route_code: "222",
    trip_id: "t_222_001",
    direction_id: 1,
    vehicle: {
      id: "8501",
      position: { lat: 34.139, lng: -118.363 },
      timestamp: 1741718400, // arbitrary epoch
    },
    stop_time_updates: [
      {
        stop_id: "30002",
        arrival: { time: 1741718520 }, // +2 min
      },
      {
        stop_id: "15025",
        arrival: { time: 1741718640 }, // +4 min
      },
      {
        stop_id: "9141",
        arrival: { time: 1741718880 }, // +8 min
      },
    ],
  },
  {
    route_code: "222",
    trip_id: "t_222_002",
    direction_id: 1,
    vehicle: {
      id: "8502",
      position: { lat: 34.145, lng: -118.370 },
      timestamp: 1741718400,
    },
    stop_time_updates: [
      {
        stop_id: "9144",
        arrival: { time: 1741719600 }, // +20 min
      },
    ],
  },
  // Northbound trip — should be filtered out
  {
    route_code: "222",
    trip_id: "t_222_099",
    direction_id: 0,
    vehicle: {
      id: "8599",
      position: { lat: 34.130, lng: -118.350 },
      timestamp: 1741718400,
    },
    stop_time_updates: [
      {
        stop_id: "9133",
        arrival: { time: 1741719000 },
      },
    ],
  },
];

/**
 * Realistic Metro API v2 route_stops response.
 * Shape: array of stop objects, each with departure_times by day type.
 * Based on S01-RESEARCH: route_stops/222 returns per-stop departure times.
 */
const ROUTE_STOPS_FIXTURE = {
  direction_id: 1,
  stops: [
    {
      stop_id: "30002",
      stop_name: "Universal City / Studio City Station",
      departure_times: ["06:15:00", "06:45:00", "07:15:00", "13:00:00", "13:30:00", "22:45:00"],
    },
    {
      stop_id: "15025",
      stop_name: "Lankershim / Campo De Cahuenga",
      departure_times: ["06:17:00", "06:47:00", "07:17:00", "13:02:00", "13:32:00", "22:47:00"],
    },
    {
      stop_id: "9141",
      stop_name: "Cahuenga / Regal",
      departure_times: ["06:22:00", "06:52:00", "07:22:00", "13:07:00", "13:37:00", "22:52:00"],
    },
  ],
};

/** Fixture with >24h GTFS times (after-midnight service) */
const ROUTE_STOPS_LATE_NIGHT_FIXTURE = {
  direction_id: 1,
  stops: [
    {
      stop_id: "30002",
      stop_name: "Universal City / Studio City Station",
      departure_times: ["23:45:00", "25:15:00", "26:00:00"],
    },
  ],
};

// ---------- getDayType ----------

describe("getDayType", () => {
  it("returns 'weekday' for a Wednesday", () => {
    // 2026-03-11 is a Wednesday
    const date = new Date(2026, 2, 11);
    expect(getDayType(date)).toBe("weekday");
  });

  it("returns 'weekday' for a Monday", () => {
    const date = new Date(2026, 2, 9);
    expect(getDayType(date)).toBe("weekday");
  });

  it("returns 'weekday' for a Friday", () => {
    const date = new Date(2026, 2, 13);
    expect(getDayType(date)).toBe("weekday");
  });

  it("returns 'saturday' for a Saturday", () => {
    const date = new Date(2026, 2, 14);
    expect(getDayType(date)).toBe("saturday");
  });

  it("returns 'sunday' for a Sunday", () => {
    const date = new Date(2026, 2, 15);
    expect(getDayType(date)).toBe("sunday");
  });
});

// ---------- parseMetroTripDetail ----------

describe("parseMetroTripDetail", () => {
  it("maps a realistic Metro API v2 trip_detail response to BusPrediction[]", () => {
    const predictions = parseMetroTripDetail(TRIP_DETAIL_FIXTURE);

    // Should have 4 predictions from 2 southbound trips (3 + 1 stops)
    // The northbound trip (direction_id=0) must be filtered out
    expect(predictions).toHaveLength(4);

    // Check first prediction shape matches BusPrediction
    const first = predictions[0];
    expect(first).toMatchObject({
      tripId: "t_222_001",
      vehicleId: "8501",
      stopId: "30002",
      arrivalTime: 1741718520,
    });

    // Vehicle position should be included
    expect(first.vehiclePosition).toEqual({ lat: 34.139, lng: -118.363 });

    // Verify all predictions have required fields
    for (const p of predictions) {
      expect(p.tripId).toBeDefined();
      expect(p.stopId).toBeDefined();
      expect(typeof p.arrivalTime).toBe("number");
      expect(p.arrivalTime).toBeGreaterThan(0);
    }
  });

  it("filters out northbound trips (direction_id != 1)", () => {
    const predictions = parseMetroTripDetail(TRIP_DETAIL_FIXTURE);
    const tripIds = predictions.map((p) => p.tripId);
    expect(tripIds).not.toContain("t_222_099");
  });

  it("returns empty array for empty response", () => {
    const predictions = parseMetroTripDetail([]);
    expect(predictions).toEqual([]);
  });

  it("returns empty array for null/undefined input", () => {
    const predictions = parseMetroTripDetail(null as unknown as unknown[]);
    expect(predictions).toEqual([]);
  });

  it("returns northbound predictions when direction=0 is passed", () => {
    const predictions = parseMetroTripDetail(TRIP_DETAIL_FIXTURE, 0);
    // The fixture has one northbound trip (t_222_099, direction_id=0)
    expect(predictions).toHaveLength(1);
    expect(predictions[0].tripId).toBe("t_222_099");
    expect(predictions[0].stopId).toBe("9133");
  });
});

// ---------- parseScheduleResponse ----------

describe("parseScheduleResponse", () => {
  it("converts route_stops response with HH:MM:SS times to epoch-based BusPrediction[]", () => {
    // Use a known reference date: 2026-03-11 at noon (PST)
    const referenceDate = new Date("2026-03-11T12:00:00-08:00");
    const predictions = parseScheduleResponse(ROUTE_STOPS_FIXTURE, referenceDate);

    // All predictions should have valid BusPrediction shape
    expect(predictions.length).toBeGreaterThan(0);
    for (const p of predictions) {
      expect(p.tripId).toBeDefined();
      expect(p.tripId).toMatch(/^schedule-/);
      expect(p.stopId).toBeDefined();
      expect(typeof p.arrivalTime).toBe("number");
      expect(p.arrivalTime).toBeGreaterThan(0);
    }

    // Stop IDs should be from the fixture
    const stopIds = new Set(predictions.map((p) => p.stopId));
    expect(stopIds).toContain("30002");
    expect(stopIds).toContain("15025");
    expect(stopIds).toContain("9141");
  });

  it("filters to only future departure times", () => {
    // At noon, times before 12:00:00 should be excluded
    const referenceDate = new Date("2026-03-11T12:00:00-08:00");
    const predictions = parseScheduleResponse(ROUTE_STOPS_FIXTURE, referenceDate);

    // From the fixture, 06:15, 06:45, 07:15 are all before noon — only 13:00, 13:30, 22:45 survive for stop 30002
    const stop30002Predictions = predictions.filter((p) => p.stopId === "30002");
    expect(stop30002Predictions.length).toBe(3); // 13:00, 13:30, 22:45

    // All arrival times should be in the future relative to noon
    const noonEpoch = Math.floor(referenceDate.getTime() / 1000);
    for (const p of predictions) {
      expect(p.arrivalTime).toBeGreaterThanOrEqual(noonEpoch);
    }
  });

  it("handles >24:00 GTFS times (e.g., 25:15:00)", () => {
    // At 11:30 PM, the 25:15:00 should become 1:15 AM next day
    const referenceDate = new Date("2026-03-11T23:30:00-08:00");
    const predictions = parseScheduleResponse(ROUTE_STOPS_LATE_NIGHT_FIXTURE, referenceDate);

    // 23:45 is in the future (by 15 min), 25:15 = 1:15 AM next day, 26:00 = 2:00 AM next day
    expect(predictions.length).toBe(3);

    // Sort by arrival time
    const sorted = [...predictions].sort((a, b) => a.arrivalTime - b.arrivalTime);

    // 23:45 should be first
    const date2345 = new Date(sorted[0].arrivalTime * 1000);
    expect(date2345.getHours()).toBe(23);
    expect(date2345.getMinutes()).toBe(45);

    // 25:15 → 01:15 next day
    const date2515 = new Date(sorted[1].arrivalTime * 1000);
    expect(date2515.getHours()).toBe(1);
    expect(date2515.getMinutes()).toBe(15);

    // 26:00 → 02:00 next day
    const date2600 = new Date(sorted[2].arrivalTime * 1000);
    expect(date2600.getHours()).toBe(2);
    expect(date2600.getMinutes()).toBe(0);
  });

  it("filters by direction_id parameter (default=1 southbound)", () => {
    // If fixture has direction_id=1 and we pass direction=1, predictions should be non-empty
    const referenceDate = new Date("2026-03-11T05:00:00-08:00");
    const predictions = parseScheduleResponse(ROUTE_STOPS_FIXTURE, referenceDate, 1);
    expect(predictions.length).toBeGreaterThan(0);

    // Same fixture but requesting direction=0 should get empty (fixture is direction_id=1)
    const predictions0 = parseScheduleResponse(ROUTE_STOPS_FIXTURE, referenceDate, 0);
    expect(predictions0).toEqual([]);
  });

  it("parses northbound schedule when direction=0 is passed", () => {
    const northboundFixture = {
      direction_id: 0,
      stops: [
        {
          stop_id: "554",
          stop_name: "Cahuenga / Barham",
          departure_times: ["06:15:00", "13:00:00", "22:45:00"],
        },
      ],
    };
    const referenceDate = new Date("2026-03-11T05:00:00-08:00");
    const predictions = parseScheduleResponse(northboundFixture, referenceDate, 0);
    expect(predictions.length).toBe(3);
    expect(predictions[0].stopId).toBe("554");
  });

  it("returns empty array for empty stops", () => {
    const predictions = parseScheduleResponse(
      { direction_id: 1, stops: [] },
      new Date()
    );
    expect(predictions).toEqual([]);
  });
});
