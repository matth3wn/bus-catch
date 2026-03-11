"use client";

import { useEffect } from "react";
import { useBusCatch } from "@/lib/use-bus-catch";
import { StatusBanner } from "@/components/status-banner";
import { RouteDiagram } from "@/components/route-diagram";
import { StopCard } from "@/components/stop-card";
import { InstallPrompt } from "@/components/install-prompt";

export default function Home() {
  const state = useBusCatch();

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <main className="min-h-dvh bg-neutral-950 text-white">
      <StatusBanner recommendation={state.recommendation} />

      {state.gpsError && (
        <div className="bg-red-900/50 px-4 py-2 text-center text-sm text-red-300">
          {state.gpsError}
        </div>
      )}

      <div className="flex gap-4 px-4 py-6">
        {/* Route diagram */}
        <RouteDiagram
          user={state.user}
          stopAnalyses={state.stopAnalyses}
          predictions={state.predictions}
        />

        {/* Stop cards */}
        <div className="flex flex-1 flex-col gap-2">
          {state.stopAnalyses
            .filter((a) => a.walkSeconds > 0 || a.recommended)
            .map((analysis) => (
              <StopCard key={analysis.stop.id} analysis={analysis} />
            ))}

          {state.stopAnalyses.every((a) => a.walkSeconds <= 0) && !state.loading && (
            <p className="text-center text-sm text-neutral-500">
              No stops ahead — you may have passed the last stop
            </p>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="px-4 pb-4 text-center text-xs text-neutral-600">
        {state.lastUpdated && (
          <p>
            Updated {Math.round((Date.now() - state.lastUpdated) / 1000)}s ago
          </p>
        )}
        <p className="mt-1">Metro 222 Southbound &middot; Cahuenga Blvd</p>
      </div>

      <InstallPrompt />
    </main>
  );
}
