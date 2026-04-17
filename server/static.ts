import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

const DEFAULT_OG_IMAGE = "https://sevco.us/favicon.jpg";
const DEFAULT_DESCRIPTION = "One platform for all things SEVCO — music, merch, projects, and a community built to last.";
const DEFAULT_CANONICAL = "https://sevco.us";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
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
      try {
        const platformSettings = await storage.getPlatformSettings();
        const proto = (req.headers["x-forwarded-proto"] as string) || "https";
        const host = req.hostname;
        const canonicalUrl = `${proto}://${host}`;
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
      } catch {
        // Don't block page render if analytics settings fail to load
      }
      res.set("Content-Type", "text/html").send(html);
    } catch {
      res.sendFile(indexPath);
    }
  });
}
