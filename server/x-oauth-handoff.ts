import crypto from "crypto";
import type { Request } from "express";

const CANONICAL_DOMAIN_RAW = process.env.X_OAUTH_CANONICAL_DOMAIN || "https://sevco.us";
const CANONICAL_DOMAIN = CANONICAL_DOMAIN_RAW.replace(/\/+$/, "");

const PRODUCTION_ALLOWLIST = [
  "https://sevco.us",
  "https://sevelovesyou.com",
  "https://sev.cx",
  "https://sevco.wiki",
];

const TOKEN_TTL_MS = 60 * 1000;
const INIT_TOKEN_TTL_MS = 60 * 1000;

function getDevReplitOrigin(): string | null {
  const domains = process.env.REPLIT_DOMAINS;
  if (!domains) return null;
  const first = domains.split(",")[0]?.trim();
  return first ? `https://${first}` : null;
}

function getAllowlist(): string[] {
  const list = new Set<string>(PRODUCTION_ALLOWLIST);
  list.add(CANONICAL_DOMAIN);
  if (process.env.REPLIT_DEPLOYMENT !== "1") {
    const dev = getDevReplitOrigin();
    if (dev) list.add(dev);
  }
  if (process.env.X_OAUTH_RETURN_TO_EXTRA) {
    for (const o of process.env.X_OAUTH_RETURN_TO_EXTRA.split(",")) {
      const v = o.trim();
      if (v) list.add(v.replace(/\/+$/, ""));
    }
  }
  return Array.from(list);
}

export function getCanonicalDomain(): string {
  return CANONICAL_DOMAIN;
}

export function getCanonicalCallbackUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${CANONICAL_DOMAIN}${p}`;
}

export function getRequestOrigin(req: Request): string {
  const host = req.get("host") || "";
  const forwardedProto = (req.get("x-forwarded-proto") || "").split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol || "https";
  return `${proto}://${host}`;
}

export function isCanonicalRequest(req: Request): boolean {
  const host = req.get("host");
  if (!host) return false;
  try {
    const canonical = new URL(CANONICAL_DOMAIN);
    return canonical.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

export function validateReturnTo(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  // Reject any path/search/hash; we only accept bare origins to prevent
  // open-redirect / path traversal tricks.
  if ((url.pathname && url.pathname !== "/") || url.search || url.hash) return null;
  if (url.username || url.password) return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // Require https in production deployments
  if (url.protocol !== "https:" && process.env.REPLIT_DEPLOYMENT === "1") return null;
  const candidate = `${url.protocol}//${url.host}`;
  for (const allowed of getAllowlist()) {
    try {
      const a = new URL(allowed);
      if (a.protocol === url.protocol && a.host.toLowerCase() === url.host.toLowerCase()) {
        return `${a.protocol}//${a.host}`;
      }
    } catch {
      // ignore malformed allowlist entry
    }
  }
  return null;
}

// ---------- HMAC-signed, single-use handoff tokens ----------

type TokenRecord = { used: boolean; expiresAt: number };
const tokenStore = new Map<string, TokenRecord>();

function purgeExpired(): void {
  const now = Date.now();
  Array.from(tokenStore.entries()).forEach(([id, rec]) => {
    if (rec.expiresAt < now) tokenStore.delete(id);
  });
}

const purgeInterval = setInterval(purgeExpired, 5 * 60 * 1000);
if (typeof purgeInterval.unref === "function") purgeInterval.unref();

function getSecret(): string {
  return process.env.X_OAUTH_HANDOFF_SECRET
    || process.env.SESSION_SECRET
    || "sevco-x-oauth-handoff-secret";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

function sign(payload: Buffer): Buffer {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest();
}

export type HandoffIntent = "signin" | "link";
export type HandoffStatus = "ok" | "already_linked" | "oauth_failed";

export interface HandoffPayload {
  jti: string;
  uid: string;
  intent: HandoffIntent;
  status: HandoffStatus;
  exp: number;
}

export function issueHandoffToken(opts: {
  userId: string;
  intent: HandoffIntent;
  status?: HandoffStatus;
}): string {
  const jti = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload: HandoffPayload = {
    jti,
    uid: opts.userId,
    intent: opts.intent,
    status: opts.status || "ok",
    exp,
  };
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = sign(json);
  tokenStore.set(jti, { used: false, expiresAt: exp });
  purgeExpired();
  return `${b64url(json)}.${b64url(sig)}`;
}

export function verifyAndConsumeHandoffToken(
  token: string,
  intent: HandoffIntent,
): HandoffPayload | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encPayload, encSig] = parts;
  if (!encPayload || !encSig) return null;
  let json: Buffer;
  let sig: Buffer;
  try {
    json = b64urlDecode(encPayload);
    sig = b64urlDecode(encSig);
  } catch {
    return null;
  }
  const expected = sign(json);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;
  let payload: HandoffPayload;
  try {
    payload = JSON.parse(json.toString("utf8")) as HandoffPayload;
  } catch {
    return null;
  }
  if (!payload.jti || !payload.uid || payload.intent !== intent) return null;
  if (Date.now() > payload.exp) return null;
  const rec = tokenStore.get(payload.jti);
  if (!rec || rec.used || rec.expiresAt < Date.now()) return null;
  rec.used = true;
  return payload;
}

// ---------- Link-init tokens (carry user identity from origin -> canonical) ----------

export interface LinkInitPayload {
  jti: string;
  uid: string;
  rt: string; // return_to origin
  exp: number;
}

const linkInitStore = new Map<string, TokenRecord>();

function purgeExpiredLinkInit(): void {
  const now = Date.now();
  Array.from(linkInitStore.entries()).forEach(([id, rec]) => {
    if (rec.expiresAt < now) linkInitStore.delete(id);
  });
}

const purgeInitInterval = setInterval(purgeExpiredLinkInit, 5 * 60 * 1000);
if (typeof purgeInitInterval.unref === "function") purgeInitInterval.unref();

export function issueLinkInitToken(opts: { userId: string; returnTo: string }): string {
  const jti = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + INIT_TOKEN_TTL_MS;
  const payload: LinkInitPayload = { jti, uid: opts.userId, rt: opts.returnTo, exp };
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const sig = sign(json);
  linkInitStore.set(jti, { used: false, expiresAt: exp });
  purgeExpiredLinkInit();
  return `${b64url(json)}.${b64url(sig)}`;
}

export function verifyAndConsumeLinkInitToken(token: string): LinkInitPayload | null {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encPayload, encSig] = parts;
  if (!encPayload || !encSig) return null;
  let json: Buffer;
  let sig: Buffer;
  try {
    json = b64urlDecode(encPayload);
    sig = b64urlDecode(encSig);
  } catch {
    return null;
  }
  const expected = sign(json);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;
  let payload: LinkInitPayload;
  try {
    payload = JSON.parse(json.toString("utf8")) as LinkInitPayload;
  } catch {
    return null;
  }
  if (!payload.jti || !payload.uid || !payload.rt) return null;
  if (Date.now() > payload.exp) return null;
  const rec = linkInitStore.get(payload.jti);
  if (!rec || rec.used || rec.expiresAt < Date.now()) return null;
  rec.used = true;
  return payload;
}
