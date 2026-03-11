"use client";

import { useEffect, useState } from "react";

export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on iOS Safari when not already installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && (navigator as unknown as Record<string, boolean>).standalone);

    if (isIOS && !isStandalone) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mx-4 mb-4 rounded-lg border border-neutral-700 bg-neutral-800 p-3 text-center text-sm text-neutral-300">
      <p>
        Tap{" "}
        <span className="inline-block rounded bg-neutral-700 px-1.5 py-0.5 text-xs">
          Share
        </span>{" "}
        then{" "}
        <span className="inline-block rounded bg-neutral-700 px-1.5 py-0.5 text-xs">
          Add to Home Screen
        </span>{" "}
        for the best experience
      </p>
      <button
        onClick={() => setShow(false)}
        className="mt-2 text-xs text-neutral-500 underline"
      >
        Dismiss
      </button>
    </div>
  );
}
