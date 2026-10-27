"use client";

import { useSyncExternalStore } from "react";
import { isPerfLite } from "./perfTier";

/** React: hafif mod (html.perf-lite) açık mı — sonradan açılırsa da
 *  günceller. Sunucuda ve hidrasyonda false; ardından gerçek değer. */
export function usePerfLite(): boolean {
  return useSyncExternalStore(subscribeClass, isPerfLite, () => false);
}

function subscribeClass(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => mo.disconnect();
}
