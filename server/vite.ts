import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { buildGtagSnippet, injectOgMeta } from "./static";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("/{*path}", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      // Inject GA4 gtag.js if a Measurement ID is configured
      try {
        const platformSettings = await storage.getPlatformSettings();
        const measurementId = platformSettings["analytics.ga4MeasurementId"];
        if (measurementId && measurementId.trim()) {
          const snippet = buildGtagSnippet(measurementId.trim());
          if (snippet) {
            template = template.replace("</head>", `${snippet}\n  </head>`);
          }
        }
        const proto = (req.headers["x-forwarded-proto"] as string) || "https";
        const absoluteFallback = `${proto}://${req.hostname}/favicon.jpg`;
        template = injectOgMeta(
          template,
          platformSettings["platform.ogImageUrl"] || absoluteFallback,
          platformSettings["platform.description"],
        );
      } catch {
        // Don't block page render if analytics settings fail to load
      }

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
