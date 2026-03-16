"use client";

import { useEffect, useState } from "react";
import { useBusCatch } from "@/lib/use-bus-catch";
import { GlanceableScreen, RECOMMENDATION_STYLES } from "@/components/glanceable-screen";
import { DetailPanel } from "@/components/detail-panel";

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

  return (
    <>
      <GlanceableScreen
        recommendation={state.recommendation}
        dataSource={state.dataSource}
        staleness={state.staleness}
        dataError={state.dataError}
        gpsError={state.gpsError}
        loading={state.loading}
        direction={state.direction}
        onTap={() => setExpanded(true)}
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
