"use client";

import { Confidence, StopCatchAnalysis } from "@/lib/types";

function formatSeconds(s: number | null): string {
  if (s === null) return "--";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

/** Format the bus arrival as a confidence range, e.g. "3–6m", falling back to a point. */
function formatBusRange(
  busSeconds: number | null,
  low: number | null,
  high: number | null
): string {
  if (busSeconds === null) return "--";
  if (low === null || high === null) return formatSeconds(busSeconds);
  return `${formatSeconds(low)}–${formatSeconds(high)}`;
}

const CONFIDENCE_DOT: Record<Confidence, { color: string; title: string }> = {
  high: { color: "bg-green-400", title: "High confidence" },
  medium: { color: "bg-yellow-400", title: "Approximate" },
  low: { color: "bg-red-400", title: "Low confidence" },
};

export function StopCard({ analysis }: { analysis: StopCatchAnalysis }) {
  const {
    stop,
    walkSeconds,
    busSeconds,
    busSecondsLow,
    busSecondsHigh,
    confidence,
    catchable,
    recommended,
  } = analysis;

  // Don't render stops behind the user
  if (walkSeconds <= 0 && !recommended) return null;

  const borderColor = recommended
    ? "border-amber-500"
    : catchable
      ? "border-green-800"
      : "border-neutral-800";

  const bgColor = recommended ? "bg-amber-500/10" : "bg-neutral-900";

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-200">
          {stop.name}
          {recommended && (
            <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-black">
              WAIT HERE
            </span>
          )}
        </h3>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-neutral-500">Walk</span>
          <span className="ml-2 font-mono text-neutral-300">{formatSeconds(walkSeconds)}</span>
        </div>
        <div className="flex items-center">
          <span className="text-neutral-500">Bus</span>
          <span
            className={`ml-2 font-mono ${
              busSeconds !== null && catchable ? "text-green-400" : "text-neutral-300"
            }`}
          >
            {formatBusRange(busSeconds, busSecondsLow, busSecondsHigh)}
          </span>
          {confidence && (
            <span
              className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${CONFIDENCE_DOT[confidence].color}`}
              title={CONFIDENCE_DOT[confidence].title}
            />
          )}
        </div>
      </div>
    </div>
  );
}
