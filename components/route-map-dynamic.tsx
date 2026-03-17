"use client";

import dynamic from "next/dynamic";
import type { BusPrediction, StopCatchAnalysis, UserPosition } from "@/lib/types";

const RouteMap = dynamic(() => import("./route-map").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] items-center justify-center rounded-xl bg-neutral-800/50">
      <span className="text-sm text-neutral-500">Loading map…</span>
    </div>
  ),
});

// Re-export the dynamic version as default
export default RouteMap;

export interface RouteMapDynamicProps {
  user: UserPosition | null;
  stopAnalyses: StopCatchAnalysis[];
  predictions: BusPrediction[];
  direction: "northbound" | "southbound" | null;
}
