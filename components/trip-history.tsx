"use client";

import { useEffect, useState } from "react";
import { loadTrips, tripStats, TripRecord } from "@/lib/trip-history";

export function TripHistory() {
  const [trips, setTrips] = useState<TripRecord[]>([]);

  useEffect(() => {
    setTrips(loadTrips());
  }, []);

  const stats = tripStats(trips);

  if (!stats || stats.totalTrips === 0) {
    return (
      <div className="rounded-xl bg-neutral-800/50 px-4 py-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
          Trip History
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          No trips recorded yet. Walk your route to start tracking.
        </p>
      </div>
    );
  }

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  // Reorder dayBreakdown to Mon–Sun
  const orderedDays = dayNames.map((d) => ({
    name: d,
    ...(stats.dayBreakdown[d] ?? { trips: 0, caught: 0 }),
  }));

  const maxDayTrips = Math.max(...orderedDays.map((d) => d.trips), 1);

  return (
    <div className="rounded-xl bg-neutral-800/50 px-4 py-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
        Trip History
      </h3>

      {/* Key stats */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xl font-bold text-neutral-100">{stats.totalTrips}</p>
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">trips</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-neutral-100">
            {Math.round(stats.busCaughtRate * 100)}%
          </p>
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">caught bus</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-neutral-100">
            {stats.avgDurationMinutes.toFixed(0)}m
          </p>
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">avg walk</p>
        </div>
      </div>

      {/* Day-of-week breakdown */}
      <div className="mt-4">
        <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">
          By day
        </p>
        <div className="flex items-end gap-1">
          {orderedDays.map((day) => (
            <div key={day.name} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative w-full" style={{ height: 40 }}>
                {/* Total trips bar */}
                <div
                  className="absolute bottom-0 w-full rounded-sm bg-neutral-600"
                  style={{
                    height: `${(day.trips / maxDayTrips) * 100}%`,
                    minHeight: day.trips > 0 ? 3 : 0,
                  }}
                />
                {/* Caught portion */}
                <div
                  className="absolute bottom-0 w-full rounded-sm bg-amber-500/80"
                  style={{
                    height: `${(day.caught / maxDayTrips) * 100}%`,
                    minHeight: day.caught > 0 ? 3 : 0,
                  }}
                />
              </div>
              <span className="text-[9px] text-neutral-500">{day.name}</span>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-[9px] text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-sm bg-neutral-600" />
            walked
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-sm bg-amber-500/80" />
            caught bus
          </span>
        </div>
      </div>

      {/* Recent trips */}
      {trips.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-neutral-500">
            Recent
          </p>
          <div className="space-y-1">
            {trips.slice(-5).reverse().map((trip) => (
              <div
                key={trip.id}
                className="flex items-center justify-between text-xs text-neutral-400"
              >
                <span>
                  {new Date(trip.startTime).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {new Date(trip.startTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-neutral-500">
                    {Math.round(trip.durationSeconds / 60)}m
                  </span>
                  {trip.busCaught ? (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                      🚌 {trip.catchStop?.split(" / ")[1] ?? "caught"}
                    </span>
                  ) : (
                    <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-400">
                      🚶 walked
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
