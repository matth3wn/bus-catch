"use client";

/**
 * Quantile dotplot for bus arrival uncertainty.
 *
 * Following Kay et al., "When (ish) is My Bus?" (CHI 2016): ~20 dots, each
 * representing 1/20 (5%) of the predicted-arrival probability mass, placed at the
 * quantiles of the distribution. A point ETA conveys false precision; a dotplot
 * lets the rider apply their own risk tolerance — "how many dots am I willing to
 * miss the bus over?"
 *
 * When a walk-arrival threshold is given, dots to its left (bus arrives before you
 * reach the stop → you miss it) are dimmed red; dots to its right (you make it) are
 * green. Counting the red dots is the rider's miss-probability, in 5% units.
 */

// Standard-normal quantiles for p = (i + 0.5) / 20, i = 0..19 (symmetric).
const Z_QUANTILES = [
  -1.96, -1.44, -1.15, -0.935, -0.755, -0.598, -0.454, -0.319, -0.189, -0.063,
  0.063, 0.189, 0.319, 0.454, 0.598, 0.755, 0.935, 1.15, 1.44, 1.96,
];

interface EtaDotplotProps {
  /** Median seconds until the bus arrives. */
  busSeconds: number;
  /** Lower/upper bounds of the confidence interval (seconds). */
  busSecondsLow: number;
  busSecondsHigh: number;
  /** Optional walk-arrival threshold (seconds): dots before it = "you'd miss it". */
  walkSeconds?: number;
  className?: string;
}

export function EtaDotplot({
  busSeconds,
  busSecondsLow,
  busSecondsHigh,
  walkSeconds,
  className = "",
}: EtaDotplotProps) {
  // Treat the interval half-width as ~1σ; floor it so a "certain" prediction still
  // shows honest spread rather than a single stacked column.
  const sigma = Math.max(15, (busSecondsHigh - busSecondsLow) / 2);

  const values = Z_QUANTILES.map((z) => Math.max(0, busSeconds + z * sigma));
  const min = Math.min(values[0], walkSeconds ?? values[0]);
  const max = Math.max(values[values.length - 1], walkSeconds ?? 0);
  const span = Math.max(1, max - min);

  const pct = (v: number) => ((v - min) / span) * 100;

  return (
    <div className={`relative h-7 w-full ${className}`} aria-hidden="true">
      {/* Walk-arrival threshold line */}
      {walkSeconds !== undefined && (
        <div
          className="absolute top-0 bottom-0 w-px bg-current opacity-40"
          style={{ left: `${pct(walkSeconds)}%` }}
        />
      )}
      {/* Arrival quantile dots */}
      {values.map((v, i) => {
        const missed = walkSeconds !== undefined && v < walkSeconds;
        return (
          <span
            key={i}
            className={`absolute h-2 w-2 -translate-x-1/2 rounded-full ${
              missed ? "bg-red-400/70" : "bg-current"
            }`}
            style={{ left: `${pct(v)}%`, bottom: "2px" }}
          />
        );
      })}
    </div>
  );
}
