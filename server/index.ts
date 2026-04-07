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
import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { checkEmailCredentials } from "./emailClient";
import { logEmptyBodyEmails } from "./email";
import { pool } from "./db";
import { fetchAllMarketData } from "./market-data";
import { startNewsAggregator } from "./news-aggregator";

const SPARK_PACK_DEFS = [
  { name: "Starter",  sparks: 100,    price: 800,    sortOrder: 0 },
  { name: "Boost",    sparks: 500,    price: 3600,   sortOrder: 1 },
  { name: "Surge",    sparks: 1000,   price: 6900,   sortOrder: 2 },
  { name: "Inferno",  sparks: 10000,  price: 60000,  sortOrder: 3 },
];

async function seedSparkPacks() {
  try {
    const existing = await storage.listSparkPacks();
    if (existing.length >= SPARK_PACK_DEFS.length) return;

    if (existing.length > 0 && existing.length < SPARK_PACK_DEFS.length) {
      console.warn(`[sparks] Only ${existing.length} of ${SPARK_PACK_DEFS.length} packs found — completing seed`);
    }

    const existingNames = new Set(existing.map((p) => p.name));
    const stripe = process.env.STRIPE_SECRET_KEY ? getUncachableStripeClient() : null;

    for (const def of SPARK_PACK_DEFS) {
      if (existingNames.has(def.name)) continue;

      let stripeProductId: string | null = null;
      let stripePriceId: string | null = null;
      let stripeRecurringPriceId: string | null = null;

      if (stripe) {
        const product = await stripe.products.create({
          name: `${def.name} Spark Pack`,
          metadata: { type: "spark_pack" },
        });
        stripeProductId = product.id;

        const oneTimePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: def.price,
          currency: "usd",
        });
        stripePriceId = oneTimePrice.id;

        const recurringPrice = await stripe.prices.create({
          product: product.id,
          unit_amount: def.price,
          currency: "usd",
          recurring: { interval: "month" },
        });
        stripeRecurringPriceId = recurringPrice.id;
      }

      await storage.upsertSparkPack({
        name: def.name,
        sparks: def.sparks,
        price: def.price,
        stripeProductId,
        stripePriceId,
        stripeRecurringPriceId,
        active: true,
        sortOrder: def.sortOrder,
      });
    }

    const finalCount = (await storage.listSparkPacks()).length;
    if (finalCount < SPARK_PACK_DEFS.length) {
      console.warn(`[sparks] Seed incomplete: ${finalCount}/${SPARK_PACK_DEFS.length} packs present`);
    } else {
      console.log(`[sparks] Seeded ${SPARK_PACK_DEFS.length} spark packs`);
    }
  } catch (err: any) {
    console.warn("[sparks] Pack seed skipped:", err?.message ?? err);
  }
}

async function runStartupMigrations() {
  // Task #260 — Fix missing parent_id column in categories table
  await pool.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id integer;`);
  await pool.query(`ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_unique;`);
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
  // Task #182 — Add display_order to tables where it was in schema but not in DB
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;`);
  await pool.query(`ALTER TABLE platform_social_links ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE spotify_artists ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;`);
  await pool.query(`ALTER TABLE minecraft_servers ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE news_categories ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;`);
  // Task #181 — Notifications system
  await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp DEFAULT now() NOT NULL
  );`);
  // Task #182 — Domains table (display_order was added; also ensure table exists)
  await pool.query(`CREATE TABLE IF NOT EXISTS domains (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    url text,
    status text NOT NULL DEFAULT 'active',
    renewal_date text,
    renewal_price text,
    hosting_provider text,
    purpose text,
    project_id integer REFERENCES projects(id) ON DELETE SET NULL,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp DEFAULT now() NOT NULL
  );`);
  // Task #197 — Music track library
  // Task #196 + #198 — Music tracks table
  await pool.query(`CREATE TABLE IF NOT EXISTS music_tracks (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title text NOT NULL,
    artist_name text NOT NULL,
    artist_id integer REFERENCES artists(id) ON DELETE SET NULL,
    album_name text,
    cover_image_url text,
    file_url text NOT NULL,
    duration integer,
    type text NOT NULL DEFAULT 'track',
    status text NOT NULL DEFAULT 'published',
    stream_count integer NOT NULL DEFAULT 0,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp DEFAULT now() NOT NULL
  );`);
  // Task #202 — Add genre column to music_tracks
  await pool.query(`ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS genre text;`);
  // Task #205 — Link user account to artist profile
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_artist_id integer REFERENCES artists(id) ON DELETE SET NULL;`);
  // Task #211 — System mailboxes
  await pool.query(`CREATE TABLE IF NOT EXISTS system_mailboxes (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    address text NOT NULL UNIQUE,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT now()
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS system_mailbox_emails (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    mailbox_id integer NOT NULL REFERENCES system_mailboxes(id) ON DELETE CASCADE,
    resend_email_id text,
    direction text NOT NULL,
    from_address text NOT NULL,
    to_addresses text[] NOT NULL,
    subject text NOT NULL DEFAULT '',
    body_html text DEFAULT '',
    body_text text DEFAULT '',
    is_read boolean DEFAULT false,
    thread_id text,
    created_at timestamp DEFAULT now() NOT NULL
  );`);
  // Task #237 — News RSS aggregator with DB cache
  await pool.query(`CREATE TABLE IF NOT EXISTS news_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    description TEXT,
    pub_date TIMESTAMP,
    source TEXT NOT NULL,
    image_url TEXT,
    category_id INTEGER,
    category_query TEXT,
    source_type TEXT NOT NULL DEFAULT 'rss',
    ai_insight TEXT,
    fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS news_items_link_idx ON news_items (link);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS news_items_cat_query_idx ON news_items (category_query);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS news_items_fetched_at_idx ON news_items (fetched_at);`);
  // Task #233 — Product multi-photo upload
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls text[];`);
  await pool.query(`UPDATE products SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND image_urls IS NULL;`);
  // Task #232 — Store categories management
  await pool.query(`CREATE TABLE IF NOT EXISTS store_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
  );`);
  await pool.query(`INSERT INTO store_categories (name)
    SELECT DISTINCT category_name FROM products
    WHERE category_name IS NOT NULL AND category_name != ''
    ON CONFLICT (name) DO NOTHING;`);
  // Task #242 — Sparks currency
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS sparks_balance integer NOT NULL DEFAULT 0;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS spark_transactions (
    id SERIAL PRIMARY KEY,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    stripe_session_id text,
    metadata jsonb,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS spark_packs (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    sparks integer NOT NULL,
    price integer NOT NULL,
    stripe_price_id text,
    stripe_product_id text,
    stripe_recurring_price_id text,
    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0
  );`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS spark_txn_stripe_session_idx ON spark_transactions (stripe_session_id) WHERE stripe_session_id IS NOT NULL;`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS spark_txn_free_allocation_month_idx ON spark_transactions (user_id, date_trunc('month', created_at)) WHERE type = 'free_allocation';`);
  // Task #236 — Live Markets
  await pool.query(`CREATE TABLE IF NOT EXISTS market_data (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    instrument_type text NOT NULL,
    symbol text NOT NULL UNIQUE,
    name text NOT NULL,
    price real NOT NULL,
    change_percent real NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    fetched_at timestamp NOT NULL DEFAULT now()
  );`);
  // Task #275 — Social Sparks schema
  await pool.query(`ALTER TABLE articles ADD COLUMN IF NOT EXISTS author_id VARCHAR REFERENCES users(id) ON DELETE SET NULL;`);
  await pool.query(`ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR REFERENCES users(id) ON DELETE SET NULL;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS post_sparks (
    post_id integer NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT post_sparks_post_user_unique UNIQUE (post_id, user_id)
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS article_sparks (
    article_id integer NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT article_sparks_article_user_unique UNIQUE (article_id, user_id)
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS gallery_sparks (
    image_id integer NOT NULL REFERENCES gallery_images(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT gallery_sparks_image_user_unique UNIQUE (image_id, user_id)
  );`);
  // Task #276 — content_sparks table (leaderboard / notifications)
  await pool.query(`DO $$ BEGIN
    CREATE TYPE content_spark_content_type AS ENUM ('post', 'article', 'gallery');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS content_sparks (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    sender_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type content_spark_content_type NOT NULL,
    content_id integer NOT NULL,
    amount integer NOT NULL DEFAULT 1,
    created_at timestamp NOT NULL DEFAULT NOW()
  );`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS content_sparks_sender_content_idx ON content_sparks (sender_id, content_type, content_id);`);
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
  // Seed official Spark Packs
  await seedSparkPacks().catch((err: any) => console.warn("[sparks] Pack seed warning:", err?.message ?? err));

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

  await (async () => {
    try {
      const cats = await storage.getNewsCategories();
      if (cats.length === 0) {
        await storage.createNewsCategory({ name: "General", query: "world news OR breaking news", xQuery: null, accentColor: "#6b7280", displayOrder: 0, enabled: true, featured: false, pinned: false });
        await storage.createNewsCategory({ name: "Technology", query: "technology AI startups OR tech news", xQuery: null, accentColor: "#3b82f6", displayOrder: 1, enabled: true, featured: false, pinned: false });
        await storage.createNewsCategory({ name: "Business", query: "business entrepreneurship startups OR business news", xQuery: null, accentColor: "#10b981", displayOrder: 2, enabled: true, featured: false, pinned: false });
        console.log("[news] Seeded 3 default news categories");
      }
    } catch (err: any) {
      console.warn("[news] Category seed failed:", err?.message ?? err);
    }
  })();

  startNewsAggregator();
  setupAuth(app);
  await registerRoutes(httpServer, app);

  async function refreshMarketData() {
    try {
      const items = await fetchAllMarketData();
      if (items.length > 0) {
        await storage.deleteExpiredMarketData(30);
        await storage.upsertMarketData(items);
        log(`Market data refreshed: ${items.length} instruments`, "market");
      }
    } catch (err: any) {
      console.error("[market] Background refresh error:", err?.message ?? err);
    }
  }

  refreshMarketData().catch(() => {});
  setInterval(() => refreshMarketData().catch(() => {}), 7 * 60 * 1000);

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
