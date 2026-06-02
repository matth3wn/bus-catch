"use client";

import { Confidence, RecommendationAction, Recommendation, StopCatchAnalysis, UserPosition } from "@/lib/types";
import { EtaDotplot } from "@/components/eta-dotplot";

/** Color/text/theme mapping for each recommendation action — shared constant for
 *  glanceable screen rendering and dynamic theme-color meta tag updates. */
export const RECOMMENDATION_STYLES: Record<
  RecommendationAction,
  { bg: string; text: string; themeColor: string }
> = {
  KEEP_WALKING: { bg: "bg-green-600", text: "text-white", themeColor: "#16a34a" },
  WAIT: { bg: "bg-amber-500", text: "text-black", themeColor: "#f59e0b" },
  NO_DATA: { bg: "bg-neutral-700", text: "text-neutral-300", themeColor: "#404040" },
};

interface GlanceableScreenProps {
  recommendation: Recommendation;
  stopAnalyses: StopCatchAnalysis[];
  user: UserPosition | null;
  totalRouteDistance: number;
  dataSource: "realtime" | "schedule" | "mock" | null;
  staleness: number | null;
  dataError: string | null;
  gpsError: string | null;
  loading: boolean;
  direction: "northbound" | "southbound" | null;
  onTap: () => void;
  onToggleDirection: () => void;
}

/** Format seconds into a human-friendly countdown string */
function formatCountdown(seconds: number): string {
  if (seconds < 60) return `<1 min`;
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

/** Format a confidence interval (seconds) as a minute range, e.g. "4–7 min". */
function formatRange(low: number, high: number): string {
  const lo = Math.max(0, Math.round(low / 60));
  const hi = Math.round(high / 60);
  if (hi < 1) return "<1 min";
  if (lo === hi) return `~${hi} min`;
  return `${lo}–${hi} min`;
}

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "high confidence",
  medium: "approximate",
  low: "low confidence",
};

/** Convert meters to miles */
function metersToMiles(m: number): string {
  return (m / 1609.34).toFixed(1);
}

function headlineText(recommendation: Recommendation): string {
  switch (recommendation.action) {
    case "KEEP_WALKING":
      return "KEEP WALKING";
    case "WAIT":
      return `WAIT AT ${recommendation.waitStop?.name.toUpperCase() ?? "STOP"}`;
    case "NO_DATA":
      return "NO BUS DATA";
  }
}

export function GlanceableScreen({
  recommendation,
  stopAnalyses,
  user,
  totalRouteDistance,
  dataSource,
  staleness,
  dataError,
  gpsError,
  loading,
  direction,
  onTap,
  onToggleDirection,
}: GlanceableScreenProps) {
  // Find the recommended stop analysis for ETA display
  const recommendedAnalysis = stopAnalyses.find((a) => a.recommended);

  // Walking progress
  const progressFraction = user && totalRouteDistance > 0
    ? Math.min(1, Math.max(0, user.routeDistance / totalRouteDistance))
    : null;
  const remainingDistance = user && totalRouteDistance > 0
    ? Math.max(0, totalRouteDistance - user.routeDistance)
    : null;
  // Loading state: before first GPS + API response
  if (loading && dataSource === null) {
    return (
      <div
        className="flex h-dvh flex-col items-center justify-center bg-neutral-700 pt-safe"
        style={{ animation: "pulse-slow 2s ease-in-out infinite" }}
        onClick={onTap}
        role="button"
        tabIndex={0}
        aria-label="Starting up — tap for details"
      >
        <p className="text-5xl font-bold tracking-tight text-neutral-300">
          STARTING UP…
        </p>
        <p className="mt-3 text-lg text-neutral-400">
          Waiting for GPS &amp; bus data
        </p>
      </div>
    );
  }

  const style = RECOMMENDATION_STYLES[recommendation.action] ?? RECOMMENDATION_STYLES.NO_DATA;
  const headline = headlineText(recommendation);

  return (
    <div
      className={`relative flex h-dvh flex-col items-center justify-center transition-colors duration-500 ${style.bg} pt-safe`}
      onClick={onTap}
      role="button"
      tabIndex={0}
      aria-label={`${headline} — tap for details`}
    >
      {/* Error badges — fixed at top */}
      <div className="absolute left-0 right-0 top-0 flex flex-col gap-1 p-3 pt-safe">
        {gpsError && (
          <div className="rounded-lg bg-red-900/70 px-3 py-2 text-center text-sm text-red-200 backdrop-blur-sm">
            {gpsError}
          </div>
        )}
        {dataError && (
          <div className="rounded-lg bg-orange-900/70 px-3 py-2 text-center text-sm text-orange-200 backdrop-blur-sm">
            {dataError}
          </div>
        )}
      </div>

      {/* Main recommendation */}
      <h1
        className={`px-6 text-center text-5xl font-black leading-tight tracking-tight ${style.text}`}
      >
        {headline}
      </h1>
      <p className={`mt-3 px-8 text-center text-lg ${style.text} opacity-80`}>
        {recommendation.reason}
      </p>

      {/* ETA countdown + arrival uncertainty */}
      {recommendedAnalysis && (
        <div className={`mt-5 flex flex-col items-center ${style.text}`}>
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">
                {formatCountdown(recommendedAnalysis.walkSeconds)}
              </p>
              <p className="text-xs uppercase tracking-wide opacity-60">walk</p>
            </div>
            {recommendedAnalysis.busSeconds !== null && (
              <>
                <div className="text-2xl font-light opacity-40">·</div>
                <div className="text-center">
                  <p className="text-2xl font-bold tabular-nums">
                    {recommendedAnalysis.busSecondsLow !== null &&
                    recommendedAnalysis.busSecondsHigh !== null
                      ? formatRange(
                          recommendedAnalysis.busSecondsLow,
                          recommendedAnalysis.busSecondsHigh
                        )
                      : formatCountdown(recommendedAnalysis.busSeconds)}
                  </p>
                  <p className="text-xs uppercase tracking-wide opacity-60">
                    bus
                    {recommendedAnalysis.confidence &&
                      ` · ${CONFIDENCE_LABEL[recommendedAnalysis.confidence]}`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Quantile dotplot — when the bus arrives, vs. when you'd reach the stop */}
          {recommendedAnalysis.busSeconds !== null &&
            recommendedAnalysis.busSecondsLow !== null &&
            recommendedAnalysis.busSecondsHigh !== null && (
              <div className="mt-3 w-56 max-w-[70vw]">
                <EtaDotplot
                  busSeconds={recommendedAnalysis.busSeconds}
                  busSecondsLow={recommendedAnalysis.busSecondsLow}
                  busSecondsHigh={recommendedAnalysis.busSecondsHigh}
                  walkSeconds={recommendedAnalysis.walkSeconds}
                />
                <p className="mt-0.5 text-center text-[10px] uppercase tracking-wide opacity-50">
                  bus arrival likelihood · line = you arrive
                </p>
              </div>
            )}
        </div>
      )}

      {/* Walking progress bar */}
      {progressFraction !== null && remainingDistance !== null && (
        <div className="absolute inset-x-0 bottom-16 px-8 pb-safe">
          <div className="mx-auto max-w-xs">
            <div className="mb-1.5 flex justify-between text-xs opacity-60">
              <span className={style.text}>{metersToMiles(remainingDistance)} mi left</span>
              <span className={style.text}>{Math.round(progressFraction * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-white/50 transition-all duration-700"
                style={{ width: `${progressFraction * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Direction + data source badges at bottom */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-safe" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleDirection(); }}
            className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white active:bg-white/30"
            aria-label={`Switch to ${(direction ?? "southbound") === "northbound" ? "southbound" : "northbound"}`}
          >
            {(direction ?? "southbound") === "northbound" ? "↑ NB" : "↓ SB"}
          </button>
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
            <span className="text-xs text-white/50">
              {Math.round(staleness)}s ago
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
