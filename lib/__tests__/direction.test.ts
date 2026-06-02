import { describe, it, expect } from "vitest";
import { detectDirection, PositionSample } from "@/lib/direction";

/** Helper: create position samples along Cahuenga Blvd */
function makeSamples(
  startLat: number,
  endLat: number,
  count: number,
  lng = -118.35
): PositionSample[] {
  const samples: PositionSample[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    samples.push({
      position: {
        lat: startLat + t * (endLat - startLat),
        lng,
      },
      timestamp: 1000 + i * 5,
    });
  }
  return samples;
}

describe("detectDirection", () => {
  it("returns 'northbound' for clear northward movement", () => {
    // Walking north: lat increases from ~34.124 to ~34.135 (~1.2km)
    const samples = makeSamples(34.124, 34.135, 5);
    expect(detectDirection(samples)).toBe("northbound");
  });

  it("returns 'southbound' for clear southward movement", () => {
    // Walking south: lat decreases from ~34.139 to ~34.128 (~1.2km)
    const samples = makeSamples(34.139, 34.128, 5);
    expect(detectDirection(samples)).toBe("southbound");
  });

  it("returns null when stationary (below displacement threshold)", () => {
    // Barely any movement — within ~5m
    const samples = makeSamples(34.130, 34.13002, 5);
    expect(detectDirection(samples)).toBeNull();
  });

  it("returns null with too few samples", () => {
    const samples = makeSamples(34.124, 34.135, 2); // only 2 samples
    expect(detectDirection(samples)).toBeNull();
  });

  it("returns null with empty history", () => {
    expect(detectDirection([])).toBeNull();
  });

  it("returns 'northbound' for noisy but net-northward track", () => {
    // GPS noise: zigzags but net movement is north
    const samples: PositionSample[] = [
      { position: { lat: 34.126, lng: -118.345 }, timestamp: 1000 },
      { position: { lat: 34.1255, lng: -118.3451 }, timestamp: 1005 }, // slight south
      { position: { lat: 34.127, lng: -118.3449 }, timestamp: 1010 }, // north
      { position: { lat: 34.1265, lng: -118.345 }, timestamp: 1015 }, // slight south
      { position: { lat: 34.129, lng: -118.3448 }, timestamp: 1020 }, // north
    ];
    // Net: 34.129 - 34.126 = 0.003 degrees ≈ 334m > 30m threshold
    expect(detectDirection(samples)).toBe("northbound");
  });

  it("handles exactly DIRECTION_MIN_SAMPLES samples", () => {
    // 3 samples with clear direction
    const samples = makeSamples(34.130, 34.134, 3);
    expect(detectDirection(samples)).toBe("northbound");
  });

  it("returns null when displacement is just below threshold", () => {
    // 30m threshold = ~0.0002695 degrees latitude
    // Make displacement just under 30m
    const samples = makeSamples(34.130, 34.13020, 4); // ~22m
    expect(detectDirection(samples)).toBeNull();
  });

  it("returns direction when displacement is just above threshold", () => {
    // Make displacement just over 30m
    const samples = makeSamples(34.130, 34.13030, 4); // ~33m
    expect(detectDirection(samples)).toBe("northbound");
  });
});

describe("detectDirection — hysteresis", () => {
  it("holds the current direction when movement is below the flip threshold", () => {
    // ~33m north (above acquire threshold, below the 60m flip threshold).
    const samples = makeSamples(34.130, 34.13030, 4);
    // Already southbound: a small northward wobble must not flip it.
    expect(detectDirection(samples, "southbound")).toBe("southbound");
  });

  it("flips direction when movement clearly exceeds the flip threshold", () => {
    // ~78m north (> 60m flip threshold).
    const samples = makeSamples(34.130, 34.13070, 4);
    expect(detectDirection(samples, "southbound")).toBe("northbound");
  });

  it("keeps the held direction with too few samples instead of returning null", () => {
    const samples = makeSamples(34.124, 34.135, 2);
    expect(detectDirection(samples, "northbound")).toBe("northbound");
  });

  it("does not flip when candidate matches the held direction", () => {
    const samples = makeSamples(34.130, 34.13070, 4); // strong north
    expect(detectDirection(samples, "northbound")).toBe("northbound");
  });
});
