"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BusCatchState, BusPrediction, LatLng, UserPosition } from "./types";
import { snapToRoute } from "./geo";
import { calculateCatch, CatchOptions } from "./catch-calculator";
import { fetchTripUpdates, fetchVehiclePositions } from "./metro-api";
import { estimateSpeed, smoothSpeed, PositionRecord } from "./speed";
import { detectDirection, PositionSample } from "./direction";
import { EtaSmoother } from "./eta-smoothing";
import { ArrivalHistory } from "./arrival-history";
import { getRouteData } from "./route-data";
import {
  POLL_INTERVAL_MS,
  MAX_GPS_ACCURACY,
  MAX_OFF_ROUTE_DISTANCE,
  SPEED_HISTORY_WINDOW,
  SPEED_EMA_ALPHA,
  STALENESS_WARNING_SECONDS,
  STALENESS_ERROR_SECONDS,
  DIRECTION_ID,
  NORTHBOUND_DIRECTION_ID,
} from "./constants";
import { TripSession } from "./trip-history";

type DataSource = "realtime" | "schedule" | "mock" | null;

/** Map API source strings to BusCatchState dataSource values */
function mapDataSource(
  apiSource: string | undefined
): "realtime" | "schedule" | "mock" | null {
  if (!apiSource) return null;
  switch (apiSource) {
    case "metro-realtime":
    case "swiftly":
      return "realtime";
    case "schedule":
      return "schedule";
    case "mock":
      return "mock";
    default:
      return null;
  }
}

export function useBusCatch(): BusCatchState {
  const [state, setState] = useState<BusCatchState>({
    user: null,
    predictions: [],
    stopAnalyses: [],
    recommendation: { action: "NO_DATA", reason: "Starting up..." },
    lastUpdated: null,
    gpsError: null,
    loading: true,
    dataSource: null,
    staleness: null,
    dataError: null,
    direction: null,
    toggleDirection: () => {},
  });

  const positionHistory = useRef<PositionRecord[]>([]);
  const directionHistory = useRef<PositionSample[]>([]);
  const predictionsRef = useRef<BusPrediction[]>([]);
  const smoothedSpeed = useRef<number | null>(null);
  const etaSmoother = useRef(new EtaSmoother());
  const arrivalHistory = useRef(new ArrivalHistory());
  const dataSourceRef = useRef<DataSource>(null);
  const reliabilityRef = useRef<Map<string, number>>(new Map());
  const lastRecommendationAction = useRef<string | null>(null);
  const lastSuccessfulFetch = useRef<number | null>(null);
  const wasStalePrev = useRef<boolean>(false);
  const directionRef = useRef<"northbound" | "southbound" | null>(null);
  const directionOverride = useRef<"northbound" | "southbound" | null>(null);
  const pollNow = useRef<(() => void) | null>(null);
  const tripSession = useRef(new TripSession());

  // Vibrate + notify on recommendation change
  const maybeVibrate = useCallback((action: string, waitStopName?: string) => {
    if (
      lastRecommendationAction.current &&
      lastRecommendationAction.current !== action
    ) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(action === "WAIT" ? [200, 100, 200] : [200]);
      }

      // Send notification when page is hidden (backgrounded)
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden" &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const title = action === "WAIT"
          ? `🚌 Wait at ${waitStopName ?? "stop"}`
          : action === "KEEP_WALKING"
            ? "🚶 Keep walking"
            : "Bus data unavailable";
        const body = action === "WAIT"
          ? "Bus is approaching — stop and wait!"
          : "No bus will arrive in time";

        // Use service worker registration for persistent notification
        navigator.serviceWorker?.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: "/icon-192.png",
            tag: "bus-catch-recommendation",
            renotify: true,
          } as NotificationOptions);
        }).catch(() => {
          // Fallback to regular notification
          new Notification(title, { body, tag: "bus-catch-recommendation" });
        });
      }
    }
    lastRecommendationAction.current = action;
  }, []);

  // Compute staleness fields based on lastSuccessfulFetch
  const computeStaleness = useCallback((): {
    staleness: number | null;
    dataError: string | null;
  } => {
    if (lastSuccessfulFetch.current === null) {
      return { staleness: null, dataError: null };
    }
    const stalenessSeconds =
      (Date.now() - lastSuccessfulFetch.current) / 1000;

    const isStaleNow = stalenessSeconds > STALENESS_WARNING_SECONDS;

    // Log staleness transition
    if (isStaleNow && !wasStalePrev.current) {
      console.warn(
        `[bus-catch] Data stale: ${Math.round(stalenessSeconds)}s since last update`
      );
    }
    wasStalePrev.current = isStaleNow;

    if (stalenessSeconds > STALENESS_ERROR_SECONDS) {
      return {
        staleness: stalenessSeconds,
        dataError: `Bus data is stale (>${Math.round(STALENESS_ERROR_SECONDS / 60)} min since last update)`,
      };
    }

    return {
      staleness: stalenessSeconds,
      dataError: null,
    };
  }, []);

  // Build confidence-aware options for calculateCatch from the latest feed state.
  const catchOptions = useCallback((): CatchOptions => {
    const staleness =
      lastSuccessfulFetch.current === null
        ? null
        : (Date.now() - lastSuccessfulFetch.current) / 1000;
    return {
      dataSource: dataSourceRef.current,
      staleness,
      reliabilityByStop: reliabilityRef.current,
    };
  }, []);

  // Resolve effective direction: override takes precedence over auto-detected
  const getDirection = useCallback(() => {
    return directionOverride.current ?? directionRef.current;
  }, []);

  // Toggle between northbound and southbound
  const toggleDirection = useCallback(() => {
    const current = getDirection() ?? "southbound";
    const next = current === "northbound" ? "southbound" : "northbound";
    directionOverride.current = next;
    directionRef.current = next;

    // Trigger immediate re-poll and recalculate
    setState((prev) => ({ ...prev, direction: next }));
    if (pollNow.current) pollNow.current();
  }, [getDirection]);

  // Recalculate based on current state
  const recalculate = useCallback(
    (user: UserPosition | null) => {
      const now = Math.floor(Date.now() / 1000);
      const dir = getDirection();
      const { stops } = dir === "northbound"
        ? getRouteData(NORTHBOUND_DIRECTION_ID)
        : getRouteData(DIRECTION_ID);

      const { analyses, recommendation } = calculateCatch(
        user,
        predictionsRef.current,
        now,
        stops,
        catchOptions()
      );

      maybeVibrate(recommendation.action, recommendation.waitStop?.name);

      const { staleness, dataError } = computeStaleness();

      setState((prev) => {
        // Update trip session with current data source from state
        if (user) {
          const dirId = dir === "northbound" ? NORTHBOUND_DIRECTION_ID : DIRECTION_ID;
          const { totalDistance } = getRouteData(dirId);
          tripSession.current.update({
            routeDistance: user.routeDistance,
            totalRouteDistance: totalDistance,
            speed: user.walkingSpeed,
            direction: dir,
            recommendationAction: recommendation.action,
            waitStopName: recommendation.waitStop?.name,
            dataSource: prev.dataSource,
          });
        }

        return {
          ...prev,
          user,
          stopAnalyses: analyses,
          recommendation,
          staleness,
          direction: dir,
          // Only overwrite dataError from staleness if there's no existing fetch error
          // or if staleness is actively producing an error
          dataError: dataError ?? prev.dataError,
        };
      });
    },
    [maybeVibrate, computeStaleness, getDirection, catchOptions]
  );

  // GPS tracking
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState((prev) => ({
        ...prev,
        gpsError: "Geolocation not available",
        loading: false,
      }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (accuracy > MAX_GPS_ACCURACY) return;

        const gpsPosition: LatLng = { lat: latitude, lng: longitude };
        const timestamp = pos.timestamp / 1000;

        // Update direction history and detect direction (only if no manual override)
        directionHistory.current.push({ position: gpsPosition, timestamp });
        // Keep last 20 samples for direction detection
        if (directionHistory.current.length > 20) {
          directionHistory.current = directionHistory.current.slice(-20);
        }
        if (!directionOverride.current) {
          // Pass the current direction so hysteresis prevents jitter from flipping it.
          const detected = detectDirection(
            directionHistory.current,
            directionRef.current
          );
          if (detected) {
            directionRef.current = detected;
          }
        }

        // Use direction-aware route for snapping
        const dir = getDirection();
        const { walkingRoute } = dir === "northbound"
          ? getRouteData(NORTHBOUND_DIRECTION_ID)
          : getRouteData(DIRECTION_ID);

        const snap = snapToRoute(gpsPosition, walkingRoute);

        if (snap.offRouteDistance > MAX_OFF_ROUTE_DISTANCE) return;

        positionHistory.current.push({
          position: gpsPosition,
          routeDistance: snap.routeDistance,
          timestamp,
        });

        // Keep only recent history
        const cutoff = timestamp - SPEED_HISTORY_WINDOW * 2;
        positionHistory.current = positionHistory.current.filter(
          (h) => h.timestamp > cutoff
        );

        const now = Date.now() / 1000;
        const measuredSpeed = estimateSpeed(
          positionHistory.current,
          now,
          SPEED_HISTORY_WINDOW
        );
        // Smooth the jumpy window estimate with an EMA so walk-time doesn't flicker.
        smoothedSpeed.current = smoothSpeed(
          smoothedSpeed.current,
          measuredSpeed,
          SPEED_EMA_ALPHA
        );
        const user: UserPosition = {
          position: snap.point,
          routeDistance: snap.routeDistance,
          walkingSpeed: smoothedSpeed.current,
          accuracy,
          timestamp,
        };

        recalculate(user);
        setState((prev) => ({ ...prev, gpsError: null, loading: false }));
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          gpsError: `GPS error: ${err.message}`,
          loading: false,
        }));
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [recalculate]);

  // API polling
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const dir = getDirection();
        const dirId = dir === "northbound" ? NORTHBOUND_DIRECTION_ID : DIRECTION_ID;

        const [tripData, vehicleData] = await Promise.all([
          fetchTripUpdates(dirId),
          fetchVehiclePositions(dirId),
        ]);

        if (cancelled) return;

        // Record successful fetch time and data source
        lastSuccessfulFetch.current = Date.now();
        const dataSource = mapDataSource(tripData.source);
        dataSourceRef.current = dataSource;
        const nowSec = Math.floor(Date.now() / 1000);

        // Merge vehicle positions (and their timestamps) into predictions
        const vehicleMap = new Map(
          vehicleData.vehicles.map((v) => [v.tripId, v])
        );
        const merged = tripData.predictions.map((p) => {
          const vehicle = vehicleMap.get(p.tripId);
          return {
            ...p,
            vehicleId: p.vehicleId || vehicle?.vehicleId,
            vehiclePosition: p.vehiclePosition ?? vehicle?.position,
            vehicleTimestamp: p.vehicleTimestamp ?? vehicle?.timestamp,
          };
        });

        // Log raw (pre-smoothing) predictions so reliability reflects true feed churn.
        arrivalHistory.current.record(
          merged
            .filter((p) => p.arrivalTime > 0)
            .map((p) => ({ tripId: p.tripId, stopId: p.stopId, arrivalTime: p.arrivalTime })),
          new Date()
        );

        // Refresh per-stop reliability (prediction volatility) for the active direction.
        const { stops } = getRouteData(dirId);
        const nowDate = new Date();
        const reliability = new Map<string, number>();
        for (const stop of stops) {
          const r = arrivalHistory.current.getStopReliability(stop.id, nowDate);
          if (r) reliability.set(stop.id, r.stdSeconds);
        }
        reliabilityRef.current = reliability;

        // Smooth arrival predictions across polls to tame countdown jitter.
        const predictions = etaSmoother.current.smooth(merged, nowSec);
        predictionsRef.current = predictions;

        setState((prev) => ({
          ...prev,
          predictions,
          lastUpdated: Date.now(),
          dataSource,
          dataError: null,
          staleness: 0,
        }));

        // Trigger recalculation with current user position
        setState((prev) => {
          const { analyses, recommendation } = calculateCatch(
            prev.user,
            predictions,
            nowSec,
            stops,
            catchOptions()
          );
          return { ...prev, stopAnalyses: analyses, recommendation };
        });
      } catch (err) {
        if (cancelled) return;
        const errorMessage =
          err instanceof Error ? err.message : "Unknown fetch error";
        console.error("[bus-catch] Poll error:", errorMessage);

        const { staleness } = computeStaleness();

        setState((prev) => ({
          ...prev,
          dataError: errorMessage,
          staleness,
        }));
      }
    }

    poll();
    pollNow.current = poll;
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      pollNow.current = null;
      clearInterval(interval);
    };
  }, [computeStaleness, getDirection, catchOptions]);

  // Trip session staleness check — save if user stops moving for 5 min
  useEffect(() => {
    const interval = setInterval(() => {
      tripSession.current.checkStale();
    }, 60_000);
    return () => {
      clearInterval(interval);
      // Save on unmount if there's an active session
      tripSession.current.save();
    };
  }, []);

  return { ...state, toggleDirection };
}
