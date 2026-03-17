"use client";

import { useCallback, useEffect, useState } from "react";
import { useBusCatch } from "@/lib/use-bus-catch";
import { GlanceableScreen, RECOMMENDATION_STYLES } from "@/components/glanceable-screen";
import { DetailPanel } from "@/components/detail-panel";
import { getRouteData } from "@/lib/route-data";
import { DIRECTION_ID, NORTHBOUND_DIRECTION_ID } from "@/lib/constants";

export default function Home() {
  const state = useBusCatch();
  const [expanded, setExpanded] = useState(false);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Dynamic theme-color: update existing <meta name="theme-color"> to match recommendation
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (meta) {
      const style = RECOMMENDATION_STYLES[state.recommendation.action];
      meta.content = style.themeColor;
    }
  }, [state.recommendation.action]);

  // Request notification permission on first user interaction
  const requestNotificationPermission = useCallback(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, []);

  const handleTap = useCallback(() => {
    requestNotificationPermission();
    setExpanded(true);
  }, [requestNotificationPermission]);

  const dirId = state.direction === "northbound" ? NORTHBOUND_DIRECTION_ID : DIRECTION_ID;
  const { totalDistance } = getRouteData(dirId);

  return (
    <>
      <GlanceableScreen
        recommendation={state.recommendation}
        stopAnalyses={state.stopAnalyses}
        user={state.user}
        totalRouteDistance={totalDistance}
        dataSource={state.dataSource}
        staleness={state.staleness}
        dataError={state.dataError}
        gpsError={state.gpsError}
        loading={state.loading}
        direction={state.direction}
        onTap={handleTap}
        onToggleDirection={state.toggleDirection}
      />
      <DetailPanel
        expanded={expanded}
        onClose={() => setExpanded(false)}
        stopAnalyses={state.stopAnalyses}
        predictions={state.predictions}
        user={state.user}
        dataSource={state.dataSource}
        staleness={state.staleness}
        lastUpdated={state.lastUpdated}
        dataError={state.dataError}
        direction={state.direction}
        onToggleDirection={state.toggleDirection}
      />
    </>
  );
}
