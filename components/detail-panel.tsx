"use client";

import { useEffect, useRef } from "react";
import {
  StopCatchAnalysis,
  BusPrediction,
  UserPosition,
} from "@/lib/types";
import { STALENESS_WARNING_SECONDS } from "@/lib/constants";
import { StopCard } from "@/components/stop-card";
import { RouteDiagram } from "@/components/route-diagram";
import { InstallPrompt } from "@/components/install-prompt";

interface DetailPanelProps {
  expanded: boolean;
  onClose: () => void;
  stopAnalyses: StopCatchAnalysis[];
  predictions: BusPrediction[];
  user: UserPosition | null;
  dataSource: "realtime" | "schedule" | "mock" | null;
  staleness: number | null;
  lastUpdated: number | null;
  dataError: string | null;
  direction: "northbound" | "southbound" | null;
  onToggleDirection: () => void;
}

export function DetailPanel({
  expanded,
  onClose,
  stopAnalyses,
  predictions,
  user,
  dataSource,
  staleness,
  lastUpdated,
  dataError,
  direction,
  onToggleDirection,
}: DetailPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset scroll to top when panel expands
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [expanded]);

  const stale = staleness !== null && staleness > STALENESS_WARNING_SECONDS;
  const visibleStops = stopAnalyses.filter(
    (a) => a.walkSeconds > 0 || a.recommended
  );

  return (
    <div
      className={`detail-panel fixed inset-0 z-50 bg-neutral-950 ${expanded ? "detail-panel-open" : ""}`}
      aria-hidden={!expanded}
    >
      {/* Close button — ≥44px touch target */}
      <div className="flex items-center justify-between px-4 pt-safe">
        <h2 className="pt-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Route Details
        </h2>
        <div className="flex items-center gap-2 pt-3">
          <button
            onClick={onToggleDirection}
            className="rounded-full bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 active:bg-neutral-700"
            style={{ minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label={`Switch to ${(direction ?? "southbound") === "northbound" ? "southbound" : "northbound"}`}
          >
            {(direction ?? "southbound") === "northbound" ? "↑ NB" : "↓ SB"}
          </button>
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-neutral-400 active:bg-neutral-800"
          aria-label="Close detail panel"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          ×
        </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="overscroll-contain h-full overflow-y-auto px-4 pb-40"
      >
        {/* Data source + staleness badge */}
        <div className="mb-4 flex items-center gap-2">
          {dataSource && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                dataSource === "realtime"
                  ? "bg-green-900/60 text-green-300"
                  : dataSource === "schedule"
                    ? "bg-yellow-900/60 text-yellow-300"
                    : "bg-neutral-600/60 text-neutral-300"
              }`}
            >
              {dataSource.toUpperCase()}
            </span>
          )}
          {staleness !== null && staleness > 0 && (
            <span
              className={`text-xs ${stale ? "font-medium text-orange-400" : "text-neutral-500"}`}
            >
              {Math.round(staleness)}s since last update
              {stale && " ⚠"}
            </span>
          )}
        </div>

        {/* Data error */}
        {dataError && (
          <div className="mb-4 rounded-lg bg-orange-900/40 px-3 py-2 text-sm text-orange-300">
            {dataError}
          </div>
        )}

        {/* Route diagram + Stop cards layout */}
        <div className="flex gap-4">
          {/* Route diagram */}
          <RouteDiagram
            user={user}
            stopAnalyses={stopAnalyses}
            predictions={predictions}
          />

          {/* Stop cards */}
          <div className="flex flex-1 flex-col gap-2">
            {visibleStops.map((analysis) => (
              <StopCard key={analysis.stop.id} analysis={analysis} />
            ))}

            {visibleStops.length === 0 && (
              <p className="text-center text-sm text-neutral-500">
                No stops ahead — you may have passed the last stop
              </p>
            )}
          </div>
        </div>

        {/* Last updated timestamp */}
        {lastUpdated && (
          <p className="mt-6 text-center text-xs text-neutral-600">
            Updated {Math.round((Date.now() - lastUpdated) / 1000)}s ago
          </p>
        )}
        <p className="mt-1 text-center text-xs text-neutral-600">
          Metro 222 {direction === "northbound" ? "Northbound" : "Southbound"} · Cahuenga Blvd
        </p>

        {/* Install prompt at footer */}
        <div className="mt-6 pb-safe">
          <InstallPrompt />
        </div>
      </div>
    </div>
  );
}
