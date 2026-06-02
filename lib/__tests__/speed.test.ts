import { describe, it, expect } from "vitest";
import { smoothSpeed } from "@/lib/speed";

describe("smoothSpeed", () => {
  it("returns the measured value when there's no prior", () => {
    expect(smoothSpeed(null, 1.6, 0.35)).toBe(1.6);
  });

  it("eases toward the new measurement by alpha", () => {
    // 1.0 + 0.5 * (2.0 - 1.0) = 1.5
    expect(smoothSpeed(1.0, 2.0, 0.5)).toBeCloseTo(1.5, 5);
  });

  it("barely moves with a small alpha (heavy smoothing)", () => {
    expect(smoothSpeed(1.4, 3.0, 0.1)).toBeCloseTo(1.56, 5);
  });

  it("tracks exactly with alpha = 1", () => {
    expect(smoothSpeed(1.4, 2.2, 1)).toBeCloseTo(2.2, 5);
  });
});
