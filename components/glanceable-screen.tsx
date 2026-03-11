"use client";

import { RecommendationAction, Recommendation } from "@/lib/types";

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
  dataSource: "realtime" | "schedule" | "mock" | null;
  staleness: number | null;
  dataError: string | null;
  gpsError: string | null;
  loading: boolean;
  onTap: () => void;
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
  dataSource,
  staleness,
  dataError,
  gpsError,
  loading,
  onTap,
}: GlanceableScreenProps) {
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

      {/* Data source mini-badge at bottom */}
      {dataSource && (
        <div className="absolute bottom-6 left-0 right-0 pb-safe">
          <div className="flex items-center justify-center gap-2">
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
            {staleness !== null && staleness > 0 && (
              <span className="text-xs text-white/50">
                {Math.round(staleness)}s ago
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
