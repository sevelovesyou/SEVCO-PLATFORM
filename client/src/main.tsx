import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

(() => {
  if (typeof window === "undefined") return;
  const w = window as Window & { __sevcoGlobalErrorNet?: boolean };
  if (w.__sevcoGlobalErrorNet) return;
  w.__sevcoGlobalErrorNet = true;

  const recent = new Map<string, number>();
  const DEDUP_MS = 5000;

  const shouldReport = (key: string): boolean => {
    const now = Date.now();
    for (const [k, t] of recent) {
      if (now - t > DEDUP_MS) recent.delete(k);
    }
    const last = recent.get(key);
    if (last !== undefined && now - last < DEDUP_MS) return false;
    recent.set(key, now);
    return true;
  };

  const send = (payload: Record<string, unknown>) => {
    try {
      void fetch("/api/freeball/client-error", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => { /* swallow */ });
    } catch { /* never throw from the reporter */ }
  };

  const buildHash = (): string | null => {
    try {
      return document.querySelector('meta[name="build-hash"]')?.getAttribute("content") ?? null;
    } catch {
      return null;
    }
  };

  window.addEventListener("error", (ev: ErrorEvent) => {
    try {
      const message = (ev.message || (ev.error && (ev.error as Error).message) || "unknown error").toString();
      const source = (ev.filename || "").toString();
      const line = typeof ev.lineno === "number" ? ev.lineno : 0;
      const col = typeof ev.colno === "number" ? ev.colno : 0;
      const stack = ((ev.error as Error | undefined)?.stack ?? "").toString();
      const key = `error|${message}|${source}|${line}|${col}`;
      if (!shouldReport(key)) return;
      send({
        message: message.slice(0, 4096),
        source: source.slice(0, 4096),
        line,
        col,
        stack: stack.slice(0, 4096),
        componentStack: "",
        url: window.location.href.slice(0, 4096),
        userAgent: navigator.userAgent.slice(0, 4096),
        kind: "error",
        buildHash: buildHash(),
      });
    } catch { /* never throw from the listener */ }
  });

  window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
    try {
      const reason = ev.reason as unknown;
      let message = "unhandled rejection";
      let stack = "";
      if (reason instanceof Error) {
        message = reason.message || message;
        stack = reason.stack ?? "";
      } else if (typeof reason === "string") {
        message = reason;
      } else {
        try { message = JSON.stringify(reason); } catch { /* keep default */ }
      }
      const key = `rejection|${message}`;
      if (!shouldReport(key)) return;
      send({
        message: message.slice(0, 4096),
        source: "",
        line: 0,
        col: 0,
        stack: stack.slice(0, 4096),
        componentStack: "",
        url: window.location.href.slice(0, 4096),
        userAgent: navigator.userAgent.slice(0, 4096),
        kind: "unhandledrejection",
        buildHash: buildHash(),
      });
    } catch { /* never throw from the listener */ }
  });
})();

createRoot(document.getElementById("root")!).render(<App />);

requestAnimationFrame(() => {
  const splash = document.getElementById("app-loading");
  if (splash) {
    splash.classList.add("loaded");
  }
});
