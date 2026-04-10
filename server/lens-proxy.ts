import type { Express, Request, Response } from "express";
import { requireAuth } from "./middleware/permissions";
import * as https from "https";
import * as http from "http";
import * as dns from "dns";
import { URL } from "url";

// Block SSRF — private IP ranges + loopback (pre-DNS check)
const BLOCKED_HOST_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|0\.0\.0\.0|169\.254\.)/i;

const MAX_REDIRECTS = 5;

// Only forward a safe allowlist of response headers to avoid cookie injection
// and other header-based attacks from untrusted upstream origins.
const SAFE_RESPONSE_HEADERS = new Set([
  "content-type",
  "content-length",
  "content-encoding",
  "last-modified",
  "etag",
  "cache-control",
  "expires",
  "vary",
  "accept-ranges",
  "content-language",
  "content-security-policy",
  "x-content-type-options",
]);

function sanitizeCSP(csp: string): string {
  return csp
    .split(";")
    .map((d) => d.trim())
    .filter((d) => !d.toLowerCase().startsWith("frame-ancestors"))
    .join("; ");
}

// Check whether a resolved IP address is in a private/internal range.
// Handles IPv4 and IPv6.
function isPrivateIp(ip: string): boolean {
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  const ipv4Mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const checkIp = ipv4Mapped ? ipv4Mapped[1] : ip;

  if (BLOCKED_HOST_RE.test(checkIp)) return true;

  // Additional IPv6 checks: loopback, link-local, unique-local, multicast
  if (/^(::1|fe80:|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:|ff[0-9a-f]{2}:)/i.test(checkIp))
    return true;

  return false;
}

function resolveAndCheck(hostname: string): Promise<void> {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) {
        reject(new Error("DNS resolution failed"));
        return;
      }
      for (const addr of addresses) {
        if (isPrivateIp(addr.address)) {
          reject(new Error("URL not allowed"));
          return;
        }
      }
      resolve();
    });
  });
}

function doProxyRequest(
  targetUrl: URL,
  req: Request,
  res: Response,
  hopsLeft: number
): void {
  if (hopsLeft <= 0) {
    if (!res.headersSent)
      res.status(400).json({ error: "Too many redirects" });
    return;
  }

  // Pre-DNS hostname pattern check
  if (BLOCKED_HOST_RE.test(targetUrl.hostname)) {
    if (!res.headersSent) res.status(403).json({ error: "URL not allowed" });
    return;
  }

  resolveAndCheck(targetUrl.hostname).then(() => {
    const transport = targetUrl.protocol === "https:" ? https : http;

    const proxyReq = transport.get(
      targetUrl.toString(),
      {
        timeout: 15000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; SEVCO-Lens/1.0; +https://sevco.us)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      },
      (proxyRes) => {
        // Handle redirects manually — enforces MAX_REDIRECTS hop limit
        const location = proxyRes.headers["location"];
        if (
          proxyRes.statusCode &&
          proxyRes.statusCode >= 300 &&
          proxyRes.statusCode < 400 &&
          location
        ) {
          proxyRes.resume();
          let redirectTarget: URL;
          try {
            redirectTarget = new URL(location, targetUrl.toString());
          } catch {
            if (!res.headersSent)
              res.status(502).json({ error: "Invalid redirect location" });
            return;
          }
          if (
            redirectTarget.protocol !== "http:" &&
            redirectTarget.protocol !== "https:"
          ) {
            if (!res.headersSent)
              res.status(400).json({ error: "Redirect to unsupported protocol" });
            return;
          }
          doProxyRequest(redirectTarget, req, res, hopsLeft - 1);
          return;
        }

        res.status(proxyRes.statusCode ?? 200);

        // Allowlist-based header forwarding — never pass set-cookie or
        // other sensitive headers from untrusted upstream origins.
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          const lk = key.toLowerCase();
          if (!SAFE_RESPONSE_HEADERS.has(lk)) continue;
          if (lk === "content-security-policy" && value) {
            const cspVal = Array.isArray(value) ? value[0] : value;
            res.setHeader(key, sanitizeCSP(cspVal));
            continue;
          }
          if (value !== undefined) {
            res.setHeader(key, value as string | string[]);
          }
        }

        // Allow framing only from same origin (our app)
        res.setHeader("X-Frame-Options", "SAMEORIGIN");

        // Enforce a size limit (~8 MB)
        let size = 0;
        const MAX = 8 * 1024 * 1024;

        proxyRes.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX) {
            res.destroy();
            proxyReq.destroy();
          }
        });

        proxyRes.pipe(res);
      }
    );

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      if (!res.headersSent) res.status(504).json({ error: "Upstream timeout" });
    });

    proxyReq.on("error", (err) => {
      if (!res.headersSent) {
        res.status(502).json({ error: "Upstream error", detail: err.message });
      }
    });

    req.on("close", () => proxyReq.destroy());
  }).catch((err: Error) => {
    if (!res.headersSent) {
      const status = err.message === "URL not allowed" ? 403 : 502;
      res.status(status).json({ error: err.message });
    }
  });
}

export function registerLensProxy(app: Express) {
  app.get("/api/lens/proxy", requireAuth, (req: Request, res: Response) => {
    const raw = req.query.url as string | undefined;
    if (!raw) {
      res.status(400).json({ error: "Missing url param" });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(decodeURIComponent(raw));
    } catch {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.status(400).json({ error: "Only http/https URLs are supported" });
      return;
    }

    doProxyRequest(parsed, req, res, MAX_REDIRECTS);
  });
}
