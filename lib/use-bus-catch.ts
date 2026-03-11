"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BusCatchState, BusPrediction, LatLng, UserPosition } from "./types";
import { snapToRoute } from "./geo";
import { haversine } from "./geo";
import { calculateCatch } from "./catch-calculator";
import { fetchTripUpdates, fetchVehiclePositions } from "./metro-api";
import {
  DEFAULT_WALKING_SPEED,
  POLL_INTERVAL_MS,
  MAX_GPS_ACCURACY,
  MAX_OFF_ROUTE_DISTANCE,
  SPEED_HISTORY_WINDOW,
} from "./constants";

interface PositionRecord {
  position: LatLng;
  routeDistance: number;
  timestamp: number;
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
  });

  const positionHistory = useRef<PositionRecord[]>([]);
  const predictionsRef = useRef<BusPrediction[]>([]);
  const lastRecommendationAction = useRef<string | null>(null);

  // Estimate walking speed from recent position history
  const estimateSpeed = useCallback((): number => {
    const history = positionHistory.current;
    const now = Date.now() / 1000;
    const recent = history.filter((h) => now - h.timestamp < SPEED_HISTORY_WINDOW);

    if (recent.length < 2) return DEFAULT_WALKING_SPEED;

    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeDelta = last.timestamp - first.timestamp;
    if (timeDelta < 5) return DEFAULT_WALKING_SPEED;

    const distDelta = last.routeDistance - first.routeDistance;
    if (distDelta <= 0) return DEFAULT_WALKING_SPEED;

    const speed = distDelta / timeDelta;
    // Sanity check: between 0.5 and 3.0 m/s
    if (speed < 0.5 || speed > 3.0) return DEFAULT_WALKING_SPEED;
    return speed;
  }, []);

  // Vibrate on recommendation change
  const maybeVibrate = useCallback((action: string) => {
    if (lastRecommendationAction.current && lastRecommendationAction.current !== action) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(action === "WAIT" ? [200, 100, 200] : [200]);
      }
    }
    lastRecommendationAction.current = action;
  }, []);

  // Recalculate based on current state
  const recalculate = useCallback(
    (user: UserPosition | null) => {
      const now = Math.floor(Date.now() / 1000);
      const { analyses, recommendation } = calculateCatch(user, predictionsRef.current, now);

      maybeVibrate(recommendation.action);

      setState((prev) => ({
        ...prev,
        user,
        stopAnalyses: analyses,
        recommendation,
      }));
    },
    [maybeVibrate]
  );

  // GPS tracking
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState((prev) => ({ ...prev, gpsError: "Geolocation not available", loading: false }));
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (accuracy > MAX_GPS_ACCURACY) return;

        const gpsPosition: LatLng = { lat: latitude, lng: longitude };
        const snap = snapToRoute(gpsPosition);

        if (snap.offRouteDistance > MAX_OFF_ROUTE_DISTANCE) return;

        const timestamp = pos.timestamp / 1000;

        positionHistory.current.push({
          position: gpsPosition,
          routeDistance: snap.routeDistance,
          timestamp,
        });

        // Keep only recent history
        const cutoff = timestamp - SPEED_HISTORY_WINDOW * 2;
        positionHistory.current = positionHistory.current.filter((h) => h.timestamp > cutoff);

        const user: UserPosition = {
          position: snap.point,
          routeDistance: snap.routeDistance,
          walkingSpeed: estimateSpeed(),
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
  }, [estimateSpeed, recalculate]);

  // API polling
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const [tripData, vehicleData] = await Promise.all([
          fetchTripUpdates(),
          fetchVehiclePositions(),
        ]);

        if (cancelled) return;

        // Merge vehicle positions into predictions
        const vehicleMap = new Map(vehicleData.vehicles.map((v) => [v.tripId, v]));
        const predictions = tripData.predictions.map((p) => {
          const vehicle = vehicleMap.get(p.tripId);
          return {
            ...p,
            vehicleId: p.vehicleId || vehicle?.vehicleId,
            vehiclePosition: vehicle?.position,
          };
        });

        predictionsRef.current = predictions;

        setState((prev) => ({
          ...prev,
          predictions,
          lastUpdated: Date.now(),
        }));

        // Trigger recalculation with current user position
        setState((prev) => {
          const now = Math.floor(Date.now() / 1000);
          const { analyses, recommendation } = calculateCatch(prev.user, predictions, now);
          return { ...prev, stopAnalyses: analyses, recommendation };
        });
      } catch (err) {
        console.error("Poll error:", err);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
