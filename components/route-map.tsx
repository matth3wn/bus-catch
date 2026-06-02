"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BusPrediction, StopCatchAnalysis, UserPosition } from "@/lib/types";
import { getRouteData } from "@/lib/route-data";
import { deadReckonBuses } from "@/lib/dead-reckoning";
import { DIRECTION_ID, NORTHBOUND_DIRECTION_ID } from "@/lib/constants";

interface RouteMapProps {
  user: UserPosition | null;
  stopAnalyses: StopCatchAnalysis[];
  predictions: BusPrediction[];
  direction: "northbound" | "southbound" | null;
}

/** Auto-fit the map bounds when user or bus positions change */
function MapBoundsUpdater({
  user,
  predictions,
  stopAnalyses,
  direction,
}: RouteMapProps) {
  const map = useMap();

  useEffect(() => {
    const dirId =
      direction === "northbound" ? NORTHBOUND_DIRECTION_ID : DIRECTION_ID;
    const { walkingRoute } = getRouteData(dirId);

    // Build bounds from route polyline
    const points: L.LatLngExpression[] = walkingRoute.map((p) => [
      p.lat,
      p.lng,
    ]);
    if (points.length === 0) return;

    const bounds = L.latLngBounds(points);

    // Include user position
    if (user) {
      bounds.extend([user.position.lat, user.position.lng]);
    }

    // Include bus positions
    for (const p of predictions) {
      if (p.vehiclePosition) {
        bounds.extend([p.vehiclePosition.lat, p.vehiclePosition.lng]);
      }
    }

    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
  }, [map, user, predictions, stopAnalyses, direction]);

  return null;
}

export function RouteMap({
  user,
  stopAnalyses,
  predictions,
  direction,
}: RouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  const dirId =
    direction === "northbound" ? NORTHBOUND_DIRECTION_ID : DIRECTION_ID;
  const { walkingRoute, stops } = getRouteData(dirId);

  // Route polyline coordinates
  const routePositions: [number, number][] = useMemo(
    () => walkingRoute.map((p) => [p.lat, p.lng]),
    [walkingRoute]
  );

  // Center on the midpoint of the route for initial render
  const center: [number, number] = useMemo(() => {
    const mid = walkingRoute[Math.floor(walkingRoute.length / 2)];
    return [mid.lat, mid.lng];
  }, [walkingRoute]);

  // Dead-reckon each bus forward from its last-reported position to "now", so a
  // stale feed fix is drawn where the bus likely is rather than where it was.
  const busPositions = useMemo(() => {
    const nowSeconds = Date.now() / 1000;
    const reckoned = deadReckonBuses(predictions, walkingRoute, stops, nowSeconds);
    return Array.from(reckoned.values()).map((b) => ({
      tripId: b.tripId,
      lat: b.position.lat,
      lng: b.position.lng,
      ageSeconds: b.ageSeconds,
      projected: b.projected,
    }));
  }, [predictions, walkingRoute, stops]);

  return (
    <div className="route-map-container relative overflow-hidden rounded-xl">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "300px", width: "100%" }}
        ref={mapRef}
      >
        {/* Dark map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Walking route polyline */}
        <Polyline
          positions={routePositions}
          pathOptions={{
            color: "#6b7280",
            weight: 4,
            opacity: 0.6,
            dashArray: "8, 8",
          }}
        />

        {/* Stop markers */}
        {stops.map((stop) => {
          const analysis = stopAnalyses.find((a) => a.stop.id === stop.id);
          const isRecommended = analysis?.recommended ?? false;
          const isCatchable = analysis?.catchable ?? false;

          let color = "#6b7280"; // neutral
          let radius = 5;
          if (isRecommended) {
            color = "#fbbf24"; // amber
            radius = 7;
          } else if (isCatchable) {
            color = "#4ade80"; // green
            radius = 6;
          }

          return (
            <CircleMarker
              key={stop.id}
              center={[stop.position.lat, stop.position.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.8,
                weight: 2,
                opacity: 1,
              }}
            >
              <Tooltip
                direction="right"
                offset={[10, 0]}
                className="route-map-tooltip"
                permanent={isRecommended}
              >
                <span className="text-xs font-medium">{stop.name}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* User position */}
        {user && (
          <>
            {/* Accuracy ring */}
            <CircleMarker
              center={[user.position.lat, user.position.lng]}
              radius={12}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.15,
                weight: 1,
                opacity: 0.4,
              }}
            />
            {/* User dot */}
            <CircleMarker
              center={[user.position.lat, user.position.lng]}
              radius={6}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#3b82f6",
                fillOpacity: 1,
                weight: 2,
                opacity: 1,
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                className="route-map-tooltip"
              >
                <span className="text-xs font-semibold">You</span>
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* Bus positions */}
        {busPositions.map((bus) => (
          <CircleMarker
            key={bus.tripId}
            center={[bus.lat, bus.lng]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#f59e0b",
              fillOpacity: 1,
              weight: 2,
              opacity: 1,
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -8]}
              className="route-map-tooltip"
            >
              <span className="text-xs font-semibold">
                🚌 Bus 222
                {bus.projected
                  ? " (est.)"
                  : bus.ageSeconds > 30
                    ? ` (${Math.round(bus.ageSeconds)}s old)`
                    : ""}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Auto-fit bounds */}
        <MapBoundsUpdater
          user={user}
          stopAnalyses={stopAnalyses}
          predictions={predictions}
          direction={direction}
        />
      </MapContainer>

      {/* Attribution overlay */}
      <div className="absolute bottom-1 right-2 z-[1000] text-[9px] text-neutral-500">
        © OSM · CARTO
      </div>
    </div>
  );
}
