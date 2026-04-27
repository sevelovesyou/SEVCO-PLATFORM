import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

const DEFAULT_OG_IMAGE = "https://sevco.us/favicon.jpg";
const DEFAULT_DESCRIPTION = "One platform for all things SEVCO — music, merch, projects, and a community built to last.";
const DEFAULT_CANONICAL = "https://sevco.us";
const DEFAULT_FAVICON = "/favicon.jpg";

const SETTINGS_READ_TIMEOUT_MS = 750;

const PUBLIC_SETTINGS_KEYS = [
  "platform.faviconUrl",
  "platform.ogImageUrl",
  "platform.logoUrl",
  "platform.description",
  "hero.headline",
  "hero.text",
  "hero.backgroundImageUrl",
  "hero.overlayOpacity",
  "search.placeholder",
  "search.backgroundUrl",
  "search.logoUrl",
  "nav.services.title",
  "nav.services.icon",
  "nav.services.categoryOrder",
  "services.categories",
];

const PUBLIC_PREFIXES = [
  "hero.shader.",
  "hero.button1.",
  "hero.button2.",
  "seo.page.",
  "seo.geo.",
];

const SECRET_GUARD = /secret|token|webhook|apikey|oauth|stripe\.|internal\./i;

function isPublicSettingsKey(key: string): boolean {
  if (SECRET_GUARD.test(key)) return false;
  if (PUBLIC_SETTINGS_KEYS.includes(key)) return true;
  if (key.startsWith("section.") && key.endsWith(".visible")) return true;
  for (const prefix of PUBLIC_PREFIXES) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

function pickPublicSettings(settings: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (typeof v !== "string") continue;
    if (!isPublicSettingsKey(k)) continue;
    out[k] = v;
  }
  return out;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\/script/gi, "<\\/script");
}

async function readSettingsWithTimeout(): Promise<Record<string, string> | null> {
  try {
    return await Promise.race<Record<string, string> | null>([
      storage.getPlatformSettings(),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), SETTINGS_READ_TIMEOUT_MS),
      ),
    ]);
  } catch {
    return null;
  }
}

export function injectOgMeta(
  html: string,
  ogImageUrl?: string,
  description?: string,
  canonicalUrl?: string,
): string {
  if (ogImageUrl && ogImageUrl.trim()) {
    const escaped = escapeAttr(ogImageUrl.trim());
    html = html.split(`content="${DEFAULT_OG_IMAGE}"`).join(`content="${escaped}"`);
  }
  if (description && description.trim()) {
    const escaped = escapeAttr(description.trim());
    html = html.split(DEFAULT_DESCRIPTION).join(escaped);
  }
  if (canonicalUrl && canonicalUrl.trim()) {
    const escaped = escapeAttr(canonicalUrl.trim());
    html = html.split(`href="${DEFAULT_CANONICAL}"`).join(`href="${escaped}"`);
    html = html.split(`content="${DEFAULT_CANONICAL}"`).join(`content="${escaped}"`);
  }
  return html;
}

export async function injectPlatformMetaIntoHtml(
  html: string,
  ctx: { proto: string; host: string },
): Promise<string> {
  const platformSettings = await readSettingsWithTimeout();
  if (!platformSettings) return html;

  const { proto, host } = ctx;
  const canonicalUrl = `${proto}://${host}`;

  try {
    const rawOgImage = platformSettings["platform.ogImageUrl"];
    const resolvedOgImage = rawOgImage
      ? /^https?:\/\//.test(rawOgImage)
        ? rawOgImage
        : `${proto}://${host}${rawOgImage.startsWith("/") ? "" : "/"}${rawOgImage}`
      : `${proto}://${host}/favicon.jpg`;
    html = injectOgMeta(
      html,
      resolvedOgImage,
      platformSettings["platform.description"],
      canonicalUrl,
    );

    const rawFavicon = platformSettings["platform.faviconUrl"];
    let resolvedFavicon: string | null = null;
    if (rawFavicon) {
      resolvedFavicon = /^https?:\/\//.test(rawFavicon)
        ? rawFavicon
        : `${rawFavicon.startsWith("/") ? "" : "/"}${rawFavicon}`;
    }

    const publicSettings = pickPublicSettings(platformSettings);
    html = injectFaviconAndSettings(html, resolvedFavicon, publicSettings);
  } catch {
    // Never block the page render if injection fails.
  }

  return html;
}

export function injectFaviconAndSettings(
  html: string,
  faviconUrl: string | null,
  publicSettings: Record<string, string> | null,
): string {
  if (faviconUrl && faviconUrl.trim()) {
    const escaped = escapeAttr(faviconUrl.trim());
    html = html.replace(
      /(<link[^>]*id="dynamic-favicon"[^>]*href=")[^"]*(")/,
      `$1${escaped}$2`,
    );
  }

  if (publicSettings) {
    const json = safeJsonForScript(publicSettings);
    const versionMeta = `<meta name="x-platform-settings-version" content="${Date.now()}">`;
    const scriptTag = `<script id="__PLATFORM_SETTINGS__" type="application/json">${json}</script>`;
    const injection = `${versionMeta}\n${scriptTag}\n</body>`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", injection);
    } else {
      html += injection;
    }
  }

  return html;
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath, { index: false }));

  const indexPath = path.resolve(distPath, "index.html");

  app.use("/{*path}", async (req, res) => {
    try {
      let html = await fs.promises.readFile(indexPath, "utf-8");
      html = await injectPlatformMetaIntoHtml(html, {
        proto: (req.headers["x-forwarded-proto"] as string) || "https",
        host: req.hostname,
      });
      res
        .set("Content-Type", "text/html")
        .set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        .set("Pragma", "no-cache")
        .set("Expires", "0")
        .set("Surrogate-Control", "no-store")
        .send(html);
    } catch {
      res
        .set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
        .set("Pragma", "no-cache")
        .set("Expires", "0")
        .set("Surrogate-Control", "no-store")
        .sendFile(indexPath);
    }
  });
}
