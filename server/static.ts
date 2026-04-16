import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";

function sanitizeMeasurementId(id: string): string {
  return id.replace(/[^A-Za-z0-9\-_]/g, "");
}

export function buildGtagSnippet(measurementId: string): string {
  const safe = sanitizeMeasurementId(measurementId);
  if (!safe) return "";
  return `\n    <!-- Google Analytics 4 -->\n    <script async src="https://www.googletagmanager.com/gtag/js?id=${safe}"></script>\n    <script>\n      window.dataLayer = window.dataLayer || [];\n      function gtag(){dataLayer.push(arguments);}\n      gtag('js', new Date());\n      gtag('config', '${safe}');\n    </script>`;
}

const DEFAULT_OG_IMAGE = "/favicon.jpg";
const DEFAULT_DESCRIPTION = "One platform for all things SEVCO — music, merch, projects, and a community built to last.";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function injectOgMeta(html: string, ogImageUrl?: string, description?: string): string {
  if (ogImageUrl && ogImageUrl.trim()) {
    const escaped = escapeAttr(ogImageUrl.trim());
    html = html.split(`content="${DEFAULT_OG_IMAGE}"`).join(`content="${escaped}"`);
  }
  if (description && description.trim()) {
    const escaped = escapeAttr(description.trim());
    html = html.split(DEFAULT_DESCRIPTION).join(escaped);
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

  app.use("/{*path}", async (_req, res) => {
    try {
      let html = await fs.promises.readFile(indexPath, "utf-8");
      try {
        const platformSettings = await storage.getPlatformSettings();
        const measurementId = platformSettings["analytics.ga4MeasurementId"];
        if (measurementId && measurementId.trim()) {
          const snippet = buildGtagSnippet(measurementId.trim());
          if (snippet) {
            html = html.replace("</head>", `${snippet}\n  </head>`);
          }
        }
        html = injectOgMeta(
          html,
          platformSettings["platform.ogImageUrl"],
          platformSettings["platform.description"],
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
