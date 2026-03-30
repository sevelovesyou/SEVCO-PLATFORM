import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase, promoteFounderToAdmin, markExistingUsersVerified, seedProjects, seedServices, seedPlaylists, seedStoreProducts, migrateServiceCategories } from "./seed";
import { runWikiSeed } from "./wikiSeed";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { WebhookHandlers } from "./webhookHandlers";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { checkEmailCredentials } from "./emailClient";
import { logEmptyBodyEmails } from "./email";
import { pool } from "./db";

async function runStartupMigrations() {
  // Task #100 — X OAuth
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS x_id TEXT;`);
  await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_x_id_unique ON users(x_id) WHERE x_id IS NOT NULL;`);
  // Task #110 — Profile overhaul
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_bg_opacity INTEGER DEFAULT 20;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_status TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_featured_type TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_featured_id TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_layout TEXT DEFAULT 'default';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_font TEXT DEFAULT 'default';`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pronouns TEXT;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_accent_gradient BOOLEAN DEFAULT false;`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_show_followers BOOLEAN DEFAULT true;`);
  // Task #126 — Tasks tool
  await pool.query(`CREATE TABLE IF NOT EXISTS user_tasks (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id varchar NOT NULL,
    title text NOT NULL,
    description text,
    completed boolean NOT NULL DEFAULT false,
    pinned boolean NOT NULL DEFAULT false,
    priority text NOT NULL DEFAULT 'normal',
    due_date text,
    created_at timestamp DEFAULT now() NOT NULL
  );`);
  await pool.query(`ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS description text;`);
  await pool.query(`ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';`);
  await pool.query(`ALTER TABLE user_tasks ADD COLUMN IF NOT EXISTS due_date text;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS staff_tasks (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title text NOT NULL,
    description text,
    completed boolean NOT NULL DEFAULT false,
    priority text NOT NULL DEFAULT 'normal',
    due_date text,
    created_by_id varchar NOT NULL,
    assignee_id varchar,
    project_id integer,
    created_at timestamp DEFAULT now() NOT NULL
  );`);
  await pool.query(`ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS description text;`);
  await pool.query(`ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;`);
  await pool.query(`ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';`);
  await pool.query(`ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS due_date text;`);
  await pool.query(`ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS assignee_id varchar;`);
  await pool.query(`ALTER TABLE staff_tasks ADD COLUMN IF NOT EXISTS project_id integer;`);
  // Task #127 — Finance ↔ Projects sync
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget real;`);
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS financial_status text DEFAULT 'not_set';`);
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_public_budget boolean DEFAULT false;`);
  // Task #140 — Per-category X query
  await pool.query(`ALTER TABLE news_categories ADD COLUMN IF NOT EXISTS x_query TEXT;`);
  // Task #144 — Featured and pinned categories
  await pool.query(`ALTER TABLE news_categories ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;`);
  await pool.query(`ALTER TABLE news_categories ADD COLUMN IF NOT EXISTS pinned BOOLEAN DEFAULT false;`);
  // Task #141 — News page UX overhaul
  await pool.query(`CREATE TABLE IF NOT EXISTS user_news_bookmarks (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_url text NOT NULL,
    article_title text NOT NULL,
    article_image text,
    article_source text,
    article_category text,
    created_at timestamp DEFAULT now() NOT NULL
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS user_news_preferences (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id varchar NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    followed_category_ids integer[] NOT NULL DEFAULT '{}',
    created_at timestamp DEFAULT now() NOT NULL
  );`);
  await pool.query(`UPDATE news_categories SET query = 'music industry OR new music OR music news' WHERE query = 'SEVCO music OR music industry';`);
  await pool.query(`UPDATE news_categories SET query = 'technology AI startups OR tech news' WHERE query = 'technology startup AI';`);
  await pool.query(`UPDATE news_categories SET query = 'business entrepreneurship startups OR business news' WHERE query = 'business entrepreneurship startup';`);
  // Task #163 — Fix changelog entries that have wrong (non-platform-task-*) wiki slugs
  // Corrects any Task #N — ... entries that were cross-linked to the wrong wiki article slug
  await pool.query(`
    UPDATE changelog
    SET wiki_slug = 'platform-task-' || LPAD(
      REGEXP_REPLACE(title, '^Task #([0-9]+) — .*', '\\1'),
      3, '0'
    )
    WHERE title ~ '^Task #[0-9]+ — '
      AND wiki_slug IS NOT NULL
      AND wiki_slug NOT LIKE 'platform-task-%';
  `);
  console.log("[startup] migrations applied");
}

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) return res.status(400).json({ error: 'Missing stripe-signature' });
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set — skipping Stripe initialization');
    return;
  }

  try {
    log('Initializing Stripe schema...', 'stripe');
    await runMigrations({ databaseUrl, schema: 'stripe' });
    log('Stripe schema ready', 'stripe');

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    if (webhookBaseUrl && webhookBaseUrl !== 'https://undefined') {
      await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
      log('Stripe webhook configured', 'stripe');
    }

    stripeSync.syncBackfill()
      .then(() => log('Stripe data synced', 'stripe'))
      .catch((err: any) => console.error('Stripe sync error:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

(async () => {
  await runStartupMigrations().catch((err) => console.error("Startup migration error:", err));
  await initStripe().catch((err) => console.error("Stripe init error:", err));
  await seedDatabase().catch((err) => console.error("Seed error:", err));
  await promoteFounderToAdmin().catch((err) => console.error("Promotion error:", err));
  await markExistingUsersVerified().catch((err) => console.error("Email verify migration error:", err));
  await seedProjects().catch((err) => console.error("Project seed error:", err));
  await seedServices().catch((err) => console.error("Service seed error:", err));
  await migrateServiceCategories().catch((err) => console.error("Service category migration error:", err));
  await seedPlaylists().catch((err) => console.error("Playlist seed error:", err));
  await seedStoreProducts().catch((err) => console.error("Store products seed error:", err));
  await storage.seedSocialLinksIfEmpty().catch((err) => console.error("Social links seed error:", err));
  await storage.migrateSocialLinksShowOnListen().catch((err) => console.error("Social links listen migration error:", err));
  await checkEmailCredentials().catch((err) => console.warn("[email] Startup credential check failed:", err?.message ?? err));
  logEmptyBodyEmails().catch((err) => console.warn("[email] Backfill check error:", err?.message ?? err));
  runWikiSeed().catch((err) => console.error("Wiki seed error:", err));
  // Seed default X (Twitter) handles for SEVCO social feed
  await (async () => {
    try {
      const currentSettings = await storage.getPlatformSettings();
      const toSeed: Record<string, string> = {};
      if (!currentSettings["social.x.handles"]) {
        toSeed["social.x.handles"] = "sevelovesu";
      } else if (currentSettings["social.x.handles"].includes("sevelovesyou")) {
        toSeed["social.x.handles"] = "sevelovesu";
      }
      if (!currentSettings["social.x.enabled"]) {
        toSeed["social.x.enabled"] = "true";
      }
      if (!currentSettings["social.x.maxTweets"]) {
        toSeed["social.x.maxTweets"] = "12";
      }
      if (Object.keys(toSeed).length > 0) {
        await storage.setPlatformSettings(toSeed);
        console.log("[x-seed] X handles settings updated:", toSeed);
      }
    } catch (err: any) {
      console.warn("[x-seed] Failed to seed X handles:", err?.message ?? err);
    }
  })();

  setupAuth(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
