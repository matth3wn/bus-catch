"use client";

import { Recommendation } from "@/lib/types";

const STYLES: Record<string, { bg: string; text: string }> = {
  KEEP_WALKING: { bg: "bg-green-600", text: "text-white" },
  WAIT: { bg: "bg-amber-500", text: "text-black" },
  NO_DATA: { bg: "bg-neutral-700", text: "text-neutral-300" },
};

export function StatusBanner({ recommendation }: { recommendation: Recommendation }) {
  const style = STYLES[recommendation.action] || STYLES.NO_DATA;

  const headline =
    recommendation.action === "KEEP_WALKING"
      ? "KEEP WALKING"
      : recommendation.action === "WAIT"
        ? `WAIT AT ${recommendation.waitStop?.name.toUpperCase() ?? "STOP"}`
        : "NO BUS DATA";

  return (
    <div className={`${style.bg} ${style.text} px-4 py-6 text-center`}>
      <h1 className="text-2xl font-bold tracking-tight">{headline}</h1>
      <p className="mt-1 text-sm opacity-80">{recommendation.reason}</p>
    </div>
  );
}
