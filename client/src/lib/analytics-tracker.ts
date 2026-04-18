import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const ENDPOINT = "/api/analytics/track";

function shouldSkip(path: string): boolean {
  if (typeof window === "undefined") return true;
  if (typeof navigator !== "undefined") {
    const dnt =
      (navigator as Navigator & { doNotTrack?: string }).doNotTrack ??
      (window as Window & { doNotTrack?: string }).doNotTrack;
    if (dnt === "1" || dnt === "yes") return true;
  }
  if (path.startsWith("/cmd")) return true;
  if (path.startsWith("/command")) return true;
  if (path.startsWith("/__")) return true;
  try {
    if (window.localStorage?.getItem("sevco-analytics-opt-out") === "1") return true;
  } catch {
    // ignore localStorage failures (e.g. private mode)
  }
  return false;
}

function send(path: string) {
  try {
    const body = JSON.stringify({ path, referrer: document.referrer || null });
    const url = ENDPOINT;
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    // never break the page on tracking failure
  }
}

/**
 * Fire a virtual pageview for a CTA click so we can measure conversion per
 * slot in /command/traffic without adding new endpoints. The path namespace
 * `/cta/<slot>` is intentionally distinct from real routes so it shows up
 * as its own row in Top Pages.
 *
 * Slots in use on the home page: "hero", "mid", "closer", "discord".
 */
export function trackCtaClick(slot: string): void {
  if (typeof window === "undefined") return;
  const safe = slot.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "unknown";
  const path = `/cta/${safe}`;
  // Honour the same DNT / opt-out / admin-route exclusions that pageview
  // tracking uses, so CTA events never bypass the privacy contract.
  if (shouldSkip(path)) return;
  send(path);
}

export function useAnalyticsTracker(): void {
  const [location] = useLocation();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    const path = location || "/";
    if (lastSent.current === path) return;
    if (shouldSkip(path)) {
      lastSent.current = path;
      return;
    }
    lastSent.current = path;
    send(path);
  }, [location]);
}
