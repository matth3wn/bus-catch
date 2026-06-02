import { describe, it, expect } from "vitest";
import { EtaSmoother } from "@/lib/eta-smoothing";
import type { BusPrediction } from "@/lib/types";

function pred(arrivalTime: number): BusPrediction {
  return { tripId: "t1", stopId: "s1", arrivalTime };
}

describe("EtaSmoother", () => {
  it("returns the first observation unchanged", () => {
    const s = new EtaSmoother(0.5, 120);
    const out = s.smooth([pred(1000)], 0);
    expect(out[0].arrivalTime).toBe(1000);
  });

  it("eases toward small changes instead of jumping", () => {
    const s = new EtaSmoother(0.5, 120);
    s.smooth([pred(1000)], 0);
    // +60s change, within snap threshold → EMA halfway: 1000 + 0.5*60 = 1030
    const out = s.smooth([pred(1060)], 15);
    expect(out[0].arrivalTime).toBe(1030);
  });

  it("snaps when the change exceeds the threshold", () => {
    const s = new EtaSmoother(0.5, 120);
    s.smooth([pred(1000)], 0);
    const out = s.smooth([pred(1500)], 15); // +500 > 120 → snap
    expect(out[0].arrivalTime).toBe(1500);
  });

  it("passes NO_DATA / zero-arrival entries through untouched", () => {
    const s = new EtaSmoother();
    const nodata: BusPrediction = { tripId: "t1", stopId: "s1", arrivalTime: 0 };
    const out = s.smooth([nodata], 0);
    expect(out[0]).toBe(nodata);
  });

  it("smooths each trip:stop independently", () => {
    const s = new EtaSmoother(0.5, 120);
    s.smooth(
      [
        { tripId: "t1", stopId: "s1", arrivalTime: 1000 },
        { tripId: "t2", stopId: "s1", arrivalTime: 2000 },
      ],
      0
    );
    const out = s.smooth(
      [
        { tripId: "t1", stopId: "s1", arrivalTime: 1040 },
        { tripId: "t2", stopId: "s1", arrivalTime: 2040 },
      ],
      15
    );
    expect(out[0].arrivalTime).toBe(1020);
    expect(out[1].arrivalTime).toBe(2020);
  });
});
