import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase, promoteFounderToAdmin, markExistingUsersVerified, seedProjects, seedServices, seedPlaylists, seedStoreProducts, migrateServiceCategories, seedFeatureArticles, seedInfrastructureServices } from "./seed";
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
import { sevcoSitesMiddleware } from "./sites-middleware";
import { runFileMigrations } from "./fileMigrator";
import { applySchemaFromCode } from "./schemaSync";
import type { InsertArticle } from "@shared/schema";
import { readFileSync, existsSync } from "fs";
import { resolve as pathResolve } from "path";

const SPARK_PACK_DEFS = [
  { name: "Starter", sparks: 1000,   price: 800,   sortOrder: 0 },
  { name: "Boost",   sparks: 5000,   price: 3600,  sortOrder: 1 },
  { name: "Pro",     sparks: 10000,  price: 6900,  sortOrder: 2 },
  { name: "Surge",   sparks: 100000, price: 60000, sortOrder: 3 },
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

// Task #525 — On every boot, read data/changelog-snapshot.json and upsert
// every entry into the local DB. The snapshot is regenerated on every
// merge by scripts/dump-changelog-snapshot.js (called from post-merge.sh)
// and committed as part of the merge, so each deploy ships the latest
// preview-DB state. Production then self-syncs its own DB on startup —
// this is what keeps sevco.us aligned with the Replit preview without
// touching deployment secrets. Idempotent: rows that match exactly are
// skipped; rows that differ are updated; missing rows are inserted.
async function applyChangelogSnapshot() {
  // Task #526 — Resolve the snapshot from multiple candidate paths so it
  // works in BOTH dev (process.cwd() = repo root) AND prod (the bundled
  // CJS lives under dist/, and script/build.ts copies data/ to dist/data
  // alongside it). Without the dist/data fallback prod silently boots
  // with an empty changelog because process.cwd() is dist/, not the repo.
  // Use only process.cwd()-relative paths — __dirname is unreliable across
  // the dev (tsx ESM) and prod (esbuild CJS) runtimes. cwd covers both:
  // dev cwd is repo root (data/), prod cwd is repo root with `node
  // dist/index.cjs` (dist/data/), and if cwd ever becomes dist/ itself,
  // the leading data/ candidate still resolves.
  const candidates = [
    pathResolve(process.cwd(), "data", "changelog-snapshot.json"),
    pathResolve(process.cwd(), "dist", "data", "changelog-snapshot.json"),
  ];
  const snapshotPath = candidates.find((p) => existsSync(p));
  if (!snapshotPath) {
    console.warn(
      `[snapshot] changelog-snapshot.json not found in any of: ${candidates.join(", ")} — skipping snapshot apply`,
    );
    return;
  }
  console.log(`[snapshot] reading snapshot from ${snapshotPath}`);
  let payload: any;
  try {
    payload = JSON.parse(readFileSync(snapshotPath, "utf8"));
  } catch (err: any) {
    console.warn(`[snapshot] could not parse snapshot: ${err?.message ?? err} — skipping`);
    return;
  }
  const entries: any[] = Array.isArray(payload?.entries) ? payload.entries : [];
  if (entries.length === 0) {
    console.log("[snapshot] snapshot is empty — nothing to apply");
    return;
  }

  const platformCat = await storage.getCategoryBySlug("sevco-platform");
  if (!platformCat) {
    console.warn("[snapshot] 'sevco-platform' category missing — only changelog rows will be applied; articles will be backfilled on the next boot once the category exists");
  }
  const peter = await storage.getUserByUsername("Peter").catch(() => null);

  let changelogInserted = 0;
  let changelogUpdated  = 0;
  let articlesInserted  = 0;
  let articlesUpdated   = 0;

  for (const e of entries) {
    if (!e?.wikiSlug || typeof e.wikiSlug !== "string" || !e.wikiSlug.startsWith("platform-task-")) continue;
    const title       = String(e.title ?? "").trim();
    const description = String(e.description ?? "").trim();
    const category    = (e.category ?? "improvement");
    const version     = e.version ?? null;
    const wikiSlug    = e.wikiSlug;
    const createdAt   = e.createdAt ? new Date(e.createdAt) : new Date();
    if (!title || !description) continue;

    // ── changelog upsert (keyed by wiki_slug) ──
    try {
      const existing = await pool.query(
        `SELECT id, title, description, category, version FROM changelog WHERE wiki_slug = $1 LIMIT 1`,
        [wikiSlug],
      );
      if ((existing.rowCount ?? 0) === 0) {
        await pool.query(
          `INSERT INTO changelog (title, description, category, version, wiki_slug, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
          [title, description, category, version, wikiSlug, createdAt.toISOString()],
        );
        changelogInserted++;
      } else {
        const row = existing.rows[0];
        const differs =
          row.title       !== title       ||
          row.description !== description ||
          row.category    !== category    ||
          (row.version ?? null) !== (version ?? null);
        if (differs) {
          await pool.query(
            `UPDATE changelog SET title = $1, description = $2, category = $3, version = $4 WHERE id = $5`,
            [title, description, category, version, row.id],
          );
          changelogUpdated++;
        }
      }
    } catch (err: any) {
      console.warn(`[snapshot] changelog upsert failed for ${wikiSlug}: ${err?.message ?? err}`);
    }

    // ── article upsert (keyed by slug) ── only when we have content + category
    if (!platformCat) continue;
    const articleContent = typeof e.articleContent === "string" ? e.articleContent : null;
    const articleSummary = typeof e.articleSummary === "string" ? e.articleSummary : description;
    const articleTags    = Array.isArray(e.articleTags) ? e.articleTags : ["platform-history", "engineering"];
    if (!articleContent) continue;

    try {
      const existing = await pool.query(
        `SELECT id, title, content, summary FROM articles WHERE slug = $1 LIMIT 1`,
        [wikiSlug],
      );
      if ((existing.rowCount ?? 0) === 0) {
        const insert: InsertArticle = {
          title,
          slug: wikiSlug,
          content: articleContent,
          summary: articleSummary,
          categoryId: platformCat.id,
          status: "published",
          tags: articleTags,
          authorId: peter?.id ?? null,
        };
        await storage.createArticle(insert);
        articlesInserted++;
      } else {
        const row = existing.rows[0];
        const differs =
          row.title   !== title          ||
          row.content !== articleContent ||
          (row.summary ?? null) !== (articleSummary ?? null);
        if (differs) {
          await pool.query(
            `UPDATE articles SET title = $1, content = $2, summary = $3, updated_at = NOW() WHERE id = $4`,
            [title, articleContent, articleSummary, row.id],
          );
          articlesUpdated++;
        }
      }
    } catch (err: any) {
      console.warn(`[snapshot] article upsert failed for ${wikiSlug}: ${err?.message ?? err}`);
    }
  }

  console.log(
    `[snapshot] Applied changelog snapshot — ${entries.length} entries; ` +
    `changelog: +${changelogInserted}/~${changelogUpdated}, ` +
    `articles: +${articlesInserted}/~${articlesUpdated}` +
    (payload.generatedAt ? ` (snapshot generated ${payload.generatedAt})` : ""),
  );
}

async function runStartupMigrations() {
  // Task #449 — Apply any /migrations/*.sql files automatically before the
  // legacy hand-rolled block. Tracked in __file_migrations so each file
  // runs exactly once per database.
  await runFileMigrations();

  // Task #477 — Auto-sync the live DB to whatever `shared/schema.ts` declares.
  // This is what makes new tables / new columns reach production automatically
  // without anyone hand-mirroring them in the block below. Idempotent and
  // additive only — type changes / drops still need an explicit migration SQL
  // file in /migrations.
  await applySchemaFromCode(pool);

  // ─────────────────────────────────────────────────────────────────────────
  // Legacy hand-rolled DDL kept for reference — these are now redundant with
  // applySchemaFromCode() above (which derives equivalent IF NOT EXISTS DDL
  // straight from shared/schema.ts), BUT they also include data fix-ups
  // (UPDATEs, DELETEs, type drops, schema-only-once cleanups) that the
  // synthesizer doesn't touch. Leave them in place; they are all idempotent.
  // ─────────────────────────────────────────────────────────────────────────

  // Task #322 — Fix missing repost_of column in posts table
  await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_of integer REFERENCES posts(id) ON DELETE CASCADE;`);
  // Task #283 — Fix missing link_url column in services table
  await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS link_url text;`);
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
  // Task #480 — Music lives on profiles: associate tracks with users directly
  await pool.query(`ALTER TABLE music_tracks ADD COLUMN IF NOT EXISTS user_id varchar REFERENCES users(id) ON DELETE SET NULL;`);
  await pool.query(`UPDATE music_tracks t SET user_id = u.id
    FROM users u WHERE t.user_id IS NULL AND u.linked_artist_id IS NOT NULL AND u.linked_artist_id = t.artist_id;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS music_tracks_user_id_idx ON music_tracks (user_id);`);
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
  // Task #354 — Product variants
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;`);
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
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS spark_txn_onboarding_task_idx ON spark_transactions (user_id, (metadata->>'taskKey')) WHERE type = 'onboarding_bonus';`);
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
  // Task #466 — drop the unused content_sparks table (leaderboard now reads legacy tables)
  await pool.query(`DROP TABLE IF EXISTS content_sparks;`);
  await pool.query(`DROP TYPE IF EXISTS content_spark_content_type;`);

  // Task #468 / #476 — Sparks for tracks, products, projects, services + lead user FKs.
  // These ran in dev via raw SQL but never landed in production, which left
  // /api/projects, /api/services, /api/store/products, /api/music/tracks, and
  // /api/sparks/leaderboard returning 500 ("column lead_user_id does not exist" /
  // "relation track_sparks does not exist"). Idempotent so safe to re-run.
  await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS lead_user_id varchar REFERENCES users(id) ON DELETE SET NULL;`);
  await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS lead_user_id varchar REFERENCES users(id) ON DELETE SET NULL;`);
  await pool.query(`CREATE TABLE IF NOT EXISTS track_sparks (
    track_id integer NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT track_sparks_track_user_unique UNIQUE (track_id, user_id)
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS product_sparks (
    product_id integer NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT product_sparks_product_user_unique UNIQUE (product_id, user_id)
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS project_sparks (
    project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT project_sparks_project_user_unique UNIQUE (project_id, user_id)
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS service_sparks (
    service_id integer NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp NOT NULL DEFAULT NOW(),
    CONSTRAINT service_sparks_service_user_unique UNIQUE (service_id, user_id)
  );`);

  // Task #280 — Delete old auto-generated task articles from production
  // Only delete if >= 10 such articles exist (production guard, safe after dev cleanup)
  const oldTaskCount = await pool.query(`
    SELECT COUNT(*) FROM articles
    WHERE slug LIKE 'platform-task-%' OR slug LIKE 'eng-task-%' OR slug LIKE 'engineering-task-%'
  `);
  const oldTaskTotal = parseInt(oldTaskCount.rows[0].count, 10);
  if (oldTaskTotal >= 10) {
    const deleted = await pool.query(`
      DELETE FROM articles
      WHERE slug LIKE 'platform-task-%' OR slug LIKE 'eng-task-%' OR slug LIKE 'engineering-task-%'
    `);
    console.log(`[startup] Deleted ${deleted.rowCount} old task articles`);
  } else {
    console.log(`[startup] Skipped old task article cleanup (only ${oldTaskTotal} found, threshold is 10)`);
  }

  // Task #280 — Re-categorize the 25 SEVCO Platform feature articles to the correct category
  const platformCatResult = await pool.query(`SELECT id FROM categories WHERE slug = 'sevco-platform' LIMIT 1`);
  if (platformCatResult.rows.length > 0) {
    const platformCatId = platformCatResult.rows[0].id;
    const featureSlugs = [
      'authentication-access-control',
      'platform-shell-navigation',
      'landing-page-home',
      'wiki-system',
      'store-ecommerce',
      'music-platform-sevco-records',
      'projects-ventures',
      'services-platform',
      'jobs-platform',
      'profile-user-accounts',
      'social-feed',
      'social-sparks-economy',
      'notes-tool',
      'command-center-cmd',
      'gallery-platform',
      'file-storage-media-uploads',
      'brand-visual-identity',
      'hosting-infrastructure',
      'domains-management',
      'platform-search',
      'chat-email-messaging',
      'ai-agents',
      'news-discovery',
      'finance-billing',
      'platform-updates-changelog',
    ];
    const placeholders = featureSlugs.map((_, i) => `$${i + 2}`).join(', ');
    const recatResult = await pool.query(
      `UPDATE articles SET category_id = $1 WHERE slug IN (${placeholders}) AND (category_id IS NULL OR category_id != $1)`,
      [platformCatId, ...featureSlugs]
    );
    console.log(`[startup] Re-categorized ${recatResult.rowCount} feature articles to sevco-platform (id=${platformCatId})`);

    // Also set authorId to seve's user id for these articles that have no author
    const seveResult = await pool.query(`SELECT id FROM users WHERE username = 'seve' LIMIT 1`);
    if (seveResult.rows.length > 0) {
      const seveId = seveResult.rows[0].id;
      const authorResult = await pool.query(
        `UPDATE articles SET author_id = $1 WHERE slug IN (${placeholders}) AND author_id IS NULL`,
        [seveId, ...featureSlugs]
      );
      console.log(`[startup] Set author to 'seve' on ${authorResult.rowCount} feature articles`);
    }
  } else {
    console.warn('[startup] sevco-platform category not found — skipped feature article re-categorization');
  }

  // Task #285 — Freeball voxel space game
  await pool.query(`CREATE TABLE IF NOT EXISTS galaxy_planets (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    seed integer NOT NULL,
    type text NOT NULL,
    size integer NOT NULL,
    owner_user_id varchar REFERENCES users(id) ON DELETE SET NULL
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS user_voxel_builds (
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    planet_id integer NOT NULL REFERENCES galaxy_planets(id) ON DELETE CASCADE,
    chunk_x integer NOT NULL,
    chunk_y integer NOT NULL,
    chunk_z integer NOT NULL,
    voxel_data jsonb NOT NULL,
    PRIMARY KEY (user_id, planet_id, chunk_x, chunk_y, chunk_z)
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS user_galaxy_progress (
    user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_planet_id integer REFERENCES galaxy_planets(id) ON DELETE SET NULL,
    sparks_spent integer NOT NULL DEFAULT 0,
    unlocked_sphere boolean NOT NULL DEFAULT false,
    inventory jsonb NOT NULL DEFAULT '{}'
  );`);
  // Task #422 — Sphere navigation HUD: persist discovered planets
  await pool.query(`ALTER TABLE user_galaxy_progress ADD COLUMN IF NOT EXISTS discovered_planet_ids text[] NOT NULL DEFAULT '{}'`);

  // Task #305 — SEVCO Canvas
  await pool.query(`CREATE TABLE IF NOT EXISTS canvas_projects (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Untitled Project',
    tldraw_json JSONB,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await pool.query(`CREATE INDEX IF NOT EXISTS canvas_projects_user_id_idx ON canvas_projects(user_id)`);

  // Task #298 — SEVCO Sites
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_websites (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      content_json JSONB NOT NULL DEFAULT '{}',
      theme_json JSONB NOT NULL DEFAULT '{}',
      custom_domain TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS user_websites_user_id_idx ON user_websites(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS user_websites_custom_domain_idx ON user_websites(custom_domain) WHERE custom_domain IS NOT NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS website_pages (
      id SERIAL PRIMARY KEY,
      website_id INTEGER NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      is_homepage BOOLEAN NOT NULL DEFAULT FALSE,
      content_json JSONB NOT NULL DEFAULT '{}',
      meta JSONB NOT NULL DEFAULT '{}'
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS website_pages_website_id_idx ON website_pages(website_id)`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS website_pages_website_id_slug_idx ON website_pages(website_id, slug)`);
  // Task #317 — Wiki Curated Source Ingestion
  await pool.query(`CREATE TABLE IF NOT EXISTS wiki_sources (
    id integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    type text NOT NULL,
    identifier text NOT NULL,
    title text NOT NULL DEFAULT '',
    ingested_at timestamp NOT NULL DEFAULT now(),
    article_count integer NOT NULL DEFAULT 0
  );`);
  // Task #320 — One-time sync of spark_packs to correct names/spark counts
  // These are idempotent UPDATEs; they apply the correct values from the
  // Command Center and produce no-ops once the data is already in sync.
  await pool.query(`
    UPDATE spark_packs SET name = 'Starter', sparks = 1000   WHERE id = 1 AND (name != 'Starter' OR sparks != 1000);
    UPDATE spark_packs SET name = 'Boost',   sparks = 5000   WHERE id = 2 AND (name != 'Boost'   OR sparks != 5000);
    UPDATE spark_packs SET name = 'Pro',     sparks = 10000  WHERE id = 3 AND (name != 'Pro'     OR sparks != 10000);
    UPDATE spark_packs SET name = 'Surge',   sparks = 100000 WHERE id = 4 AND (name != 'Surge'   OR sparks != 100000);
  `);
  // Shader Studio presets (idempotent — uses serial PK to match drizzle schema)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shader_presets (
      id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
      name TEXT NOT NULL,
      effect_type TEXT NOT NULL,
      params_json JSONB NOT NULL,
      created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Task #421 — Voice & announcements
  await pool.query(`CREATE TABLE IF NOT EXISTS voice_preferences (
    user_id VARCHAR PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ptt_key TEXT NOT NULL DEFAULT 'AltLeft',
    input_device_id TEXT,
    output_device_id TEXT,
    input_volume REAL NOT NULL DEFAULT 1,
    output_volume REAL NOT NULL DEFAULT 1,
    noise_suppression BOOLEAN NOT NULL DEFAULT TRUE,
    echo_cancellation BOOLEAN NOT NULL DEFAULT TRUE,
    mute_announcements BOOLEAN NOT NULL DEFAULT FALSE,
    auto_join_voice BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    author_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    audio_url TEXT,
    duration_sec INTEGER,
    kind TEXT NOT NULL DEFAULT 'recorded',
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS announcement_dismissals (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
    visitor_key TEXT,
    dismissed_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS voice_moderation_actions (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    room_key TEXT NOT NULL,
    target_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    moderator_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`);

  // Tasks #416/#417 — Internal first-party analytics (replaces GA4)
  await pool.query(`CREATE TABLE IF NOT EXISTS pageviews (
    id BIGSERIAL PRIMARY KEY,
    path VARCHAR(512) NOT NULL,
    referrer_host VARCHAR(255),
    visitor_hash VARCHAR(64) NOT NULL,
    session_hash VARCHAR(64) NOT NULL,
    country VARCHAR(2),
    device VARCHAR(16) NOT NULL,
    is_bot BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS pageviews_created_at_idx ON pageviews(created_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS pageviews_path_created_idx ON pageviews(path, created_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS pageviews_visitor_created_idx ON pageviews(visitor_hash, created_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS pageviews_referrer_created_idx ON pageviews(referrer_host, created_at);`);
  await pool.query(`CREATE TABLE IF NOT EXISTS analytics_salts (
    day DATE PRIMARY KEY,
    salt VARCHAR(64) NOT NULL
  );`);

  // Task #522 — Step A: Idempotent historical dedupe of the platform task
  // changelog. For any duplicate "Task #N — ..." rows that share the same
  // task number (or the same wiki_slug), keep the newest by created_at and
  // delete the rest. Then delete orphan platform-task-* articles whose
  // slug no longer matches any changelog row. This compensates for older
  // post-merge runs that inserted instead of upserted.
  try {
    // Dedupe by exact wiki_slug match (canonical key for platform tasks)
    const dupeBySlug = await pool.query(
      `DELETE FROM changelog WHERE id IN (
         SELECT id FROM (
           SELECT id, ROW_NUMBER() OVER (
             PARTITION BY wiki_slug ORDER BY created_at DESC, id DESC
           ) AS rn
           FROM changelog
           WHERE wiki_slug LIKE 'platform-task-%'
         ) t WHERE t.rn > 1
       )`,
    );
    // Dedupe by task number parsed from title (covers rows that pre-date wiki_slug)
    const allTaskRows = await pool.query<{ id: number; title: string; created_at: string; wiki_slug: string | null }>(
      `SELECT id, title, created_at, wiki_slug FROM changelog WHERE title ~ '^Task #[0-9]+'`,
    );
    const SINGLE_TASK_RE_DD = /^Task #(\d+)(?:[^\d-]|$)/;
    const byNum = new Map<number, Array<{ id: number; created_at: Date }>>();
    for (const r of allTaskRows.rows) {
      const m = r.title.match(SINGLE_TASK_RE_DD);
      if (!m) continue;
      const n = parseInt(m[1], 10);
      const arr = byNum.get(n) ?? [];
      arr.push({ id: r.id, created_at: new Date(r.created_at) });
      byNum.set(n, arr);
    }
    const dupeIds: number[] = [];
    for (const arr of byNum.values()) {
      if (arr.length <= 1) continue;
      arr.sort((a, b) => b.created_at.getTime() - a.created_at.getTime() || b.id - a.id);
      for (let i = 1; i < arr.length; i++) dupeIds.push(arr[i].id);
    }
    let dupeByNum = 0;
    if (dupeIds.length > 0) {
      const r = await pool.query(`DELETE FROM changelog WHERE id = ANY($1::int[])`, [dupeIds]);
      dupeByNum = r.rowCount ?? 0;
    }
    // Drop orphan platform-task-* articles (article exists but no matching changelog row)
    const orphanArticles = await pool.query(
      `DELETE FROM articles WHERE slug LIKE 'platform-task-%'
         AND slug NOT IN (SELECT wiki_slug FROM changelog WHERE wiki_slug LIKE 'platform-task-%')`,
    );
    const totalRemoved = (dupeBySlug.rowCount ?? 0) + dupeByNum + (orphanArticles.rowCount ?? 0);
    if (totalRemoved > 0) {
      console.log(
        `[startup] Dedupe — removed ${dupeBySlug.rowCount ?? 0} slug-dupe changelog row(s), ` +
        `${dupeByNum} number-dupe changelog row(s), ${orphanArticles.rowCount ?? 0} orphan article(s)`,
      );
    }
  } catch (err: any) {
    console.warn("[startup] Platform-task dedupe skipped:", err?.message ?? err);
  }

  // Task #522 — Step B: Insert range placeholders for skipped platform task
  // numbers. For every consecutive gap (e.g. tasks #88..#97 missing) we
  // insert a single muted "Task #N-M — (no logged content)" changelog row
  // with a matching platform-task-NNN-MMM slug. Idempotent: existing slugs
  // are skipped. Version is derived from the surrounding real entries so
  // /platform's version timeline stays continuous. Runs BEFORE the article
  // backfill below so the backfill picks up the new placeholder rows in
  // the same boot.
  try {
    const { rows: parsedRows } = await pool.query<{ title: string; created_at: string; version: string | null }>(
      `SELECT title, created_at, version FROM changelog WHERE title ~ '^Task #[0-9]+'`
    );
    const existingNums = new Map<number, Date>();
    const versionByNum = new Map<number, string | null>();
    const SINGLE_TASK_RE = /^Task #(\d+)(?:[^\d-]|$)/;
    for (const r of parsedRows) {
      const m = r.title.match(SINGLE_TASK_RE);
      if (!m) continue; // skip range placeholders like "Task #88-97 — ..."
      const n = parseInt(m[1], 10);
      existingNums.set(n, new Date(r.created_at));
      versionByNum.set(n, r.version);
    }
    const sortedNums = Array.from(existingNums.keys()).sort((a, b) => a - b);
    const maxTaskNum = sortedNums.length ? sortedNums[sortedNums.length - 1] : 0;
    if (maxTaskNum > 0) {
      const present = new Set(sortedNums);
      const gaps: Array<{ start: number; end: number }> = [];
      let gapStart: number | null = null;
      for (let n = 1; n <= maxTaskNum; n++) {
        if (present.has(n)) {
          if (gapStart !== null) {
            gaps.push({ start: gapStart, end: n - 1 });
            gapStart = null;
          }
        } else if (gapStart === null) {
          gapStart = n;
        }
      }
      if (gapStart !== null) gaps.push({ start: gapStart, end: maxTaskNum - 1 });

      let placeholdersCreated = 0;
      for (const gap of gaps) {
        const slug = `platform-task-${String(gap.start).padStart(3, "0")}-${String(gap.end).padStart(3, "0")}`;
        // Derive version from the surrounding real entries so the
        // /platform version timeline doesn't show a NULL gap.
        const beforeVersion = versionByNum.get(gap.start - 1) ?? null;
        const afterVersion = versionByNum.get(gap.end + 1) ?? null;
        const gapVersion = beforeVersion ?? afterVersion ?? null;
        const existsCheck = await pool.query(
          `SELECT 1 FROM changelog WHERE wiki_slug = $1 LIMIT 1`,
          [slug],
        );
        if ((existsCheck.rowCount ?? 0) > 0) {
          // Backfill version on existing placeholder rows that were
          // inserted before this version-derivation logic existed.
          if (gapVersion) {
            await pool.query(
              `UPDATE changelog SET version = $1
                 WHERE wiki_slug = $2 AND (version IS NULL OR version = '')`,
              [gapVersion, slug],
            );
          }
          continue;
        }
        // Pick a createdAt that slots between the surrounding real entries
        // so the timeline ordering stays sensible.
        const before = existingNums.get(gap.start - 1);
        const after = existingNums.get(gap.end + 1);
        let createdAt: Date;
        if (before && after) {
          createdAt = new Date((before.getTime() + after.getTime()) / 2);
        } else if (before) {
          createdAt = new Date(before.getTime() + 1000);
        } else if (after) {
          createdAt = new Date(after.getTime() - 1000);
        } else {
          createdAt = new Date();
        }
        const title = `Task #${gap.start}-${gap.end} — (no logged content)`;
        const description =
          `Tasks #${gap.start} through #${gap.end} merged before the platform changelog was wired up, ` +
          `or their plan files were never persisted. This placeholder keeps the task ordering intact.`;
        await pool.query(
          `INSERT INTO changelog (title, description, category, version, wiki_slug, created_at)
             VALUES ($1, $2, 'other', $3, $4, $5)`,
          [title, description, gapVersion, slug, createdAt.toISOString()],
        );
        placeholdersCreated++;
      }
      if (placeholdersCreated > 0) {
        console.log(`[startup] Inserted ${placeholdersCreated} range placeholder(s) for task gaps`);
      }
    }
  } catch (err: any) {
    console.warn("[startup] Range-placeholder insertion skipped:", err?.message ?? err);
  }

  // Task #519 (replaces #517) — Backfill missing platform wiki articles for
  // every changelog row whose wiki_slug points at platform-task-* but the
  // matching article was never persisted. Idempotent (LEFT JOIN guard) and
  // verified to actually run + log the result on every startup so we can
  // see it worked. This is what makes /wiki/engineering/sevco-platform line
  // up with /platform and /command/changelog after every merge.
  try {
    const platformCat = await storage.getCategoryBySlug("sevco-platform");
    if (!platformCat) {
      console.warn("[startup] Platform-wiki backfill skipped: 'sevco-platform' category does not exist yet");
    } else {
      const before = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM changelog WHERE wiki_slug LIKE 'platform-task-%') AS changelog_rows,
           (SELECT COUNT(*)::int FROM articles WHERE slug LIKE 'platform-task-%')      AS article_rows`
      );
      const beforeChangelog = before.rows[0]?.changelog_rows ?? 0;
      const beforeArticles  = before.rows[0]?.article_rows  ?? 0;

      const orphans = await pool.query(
        `SELECT c.id, c.title, c.description, c.version, c.wiki_slug
           FROM changelog c
           LEFT JOIN articles a ON a.slug = c.wiki_slug
          WHERE c.wiki_slug LIKE 'platform-task-%'
            AND a.id IS NULL
          ORDER BY c.id`
      );

      let created = 0;
      if (orphans.rows.length > 0) {
        const peter = await storage.getUserByUsername("Peter");
        for (const row of orphans.rows) {
          try {
            const versionLine = row.version ? `_Version: ${row.version}_\n\n` : "";
            const content =
              `# ${row.title}\n\n${versionLine}${row.description ?? ""}\n\n` +
              `---\n\n_This article was auto-backfilled from the changelog by the post-merge → /platform pipeline (Task #519). ` +
              `If a richer version of this task plan exists in the platform task corpus, it will replace this one on the next merge of that task._\n`;
            await storage.createArticle({
              title: row.title,
              slug: row.wiki_slug,
              content,
              summary: row.description ?? null,
              categoryId: platformCat.id,
              status: "published",
              tags: ["platform-history", "engineering", "backfilled"],
              authorId: peter?.id ?? null,
            });
            created++;
          } catch (rowErr: any) {
            // Race-safe: a parallel insert (or unique-constraint hit on slug)
            // shouldn't kill the whole backfill — log and keep going.
            console.warn(
              `[startup] Backfill could not create article for ${row.wiki_slug}: ${rowErr?.message ?? rowErr}`,
            );
          }
        }
      }

      const after = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM changelog WHERE wiki_slug LIKE 'platform-task-%') AS changelog_rows,
           (SELECT COUNT(*)::int FROM articles WHERE slug LIKE 'platform-task-%')      AS article_rows`
      );
      const afterChangelog = after.rows[0]?.changelog_rows ?? 0;
      const afterArticles  = after.rows[0]?.article_rows  ?? 0;
      const stillMissing = Math.max(0, afterChangelog - afterArticles);
      console.log(
        `[startup] Platform-wiki backfill complete — created ${created}, ` +
        `changelog rows: ${beforeChangelog}→${afterChangelog}, ` +
        `articles: ${beforeArticles}→${afterArticles}, still missing: ${stillMissing}`,
      );

    }
  } catch (err: any) {
    console.warn("[startup] Platform-wiki backfill skipped:", err?.message ?? err);
  }

  console.log("[startup] migrations applied");
}

// Task #526 — Last-line check that the changelog/wiki tables are in sync.
// Was a hard `throw` (Task #522) that crashed the Promote stage when prod
// DB happened to be stale before applyChangelogSnapshot got a chance to
// fix it. Now: warn-and-continue so boot completes; the same drift detail
// is surfaced via /api/platform-health for the admin to inspect. Run AFTER
// applyChangelogSnapshot from the boot orchestrator so by the time we
// check, the snapshot has had its chance to heal the DB.
let lastSyncAssertionResult: {
  ok: boolean;
  changelogRows: number;
  articleRows: number;
  drift: Array<{ slug: string; reason: string }>;
  checkedAt: string;
} = { ok: false, changelogRows: 0, articleRows: 0, drift: [], checkedAt: "" };

export function getLastSyncAssertionResult() {
  return lastSyncAssertionResult;
}

async function assertPlatformWikiSync() {
  try {
    const finalCounts = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM changelog WHERE wiki_slug LIKE 'platform-task-%') AS changelog_rows,
         (SELECT COUNT(*)::int FROM articles  WHERE slug      LIKE 'platform-task-%') AS article_rows`
    );
    const cl = finalCounts.rows[0]?.changelog_rows ?? 0;
    const ar = finalCounts.rows[0]?.article_rows  ?? 0;
    if (cl !== ar) {
      const detail = await pool.query(
        `SELECT c.wiki_slug AS slug, 'missing-article' AS reason FROM changelog c
           LEFT JOIN articles a ON a.slug = c.wiki_slug
          WHERE c.wiki_slug LIKE 'platform-task-%' AND a.id IS NULL
         UNION ALL
         SELECT a.slug, 'orphan-article' AS reason FROM articles a
           LEFT JOIN changelog c ON c.wiki_slug = a.slug
          WHERE a.slug LIKE 'platform-task-%' AND c.id IS NULL
          LIMIT 25`
      );
      const drift = detail.rows.map((r: any) => ({ slug: r.slug, reason: r.reason }));
      const sample = drift.slice(0, 10).map((r) => `${r.slug}(${r.reason})`).join(", ");
      console.warn(
        `[startup] Platform-wiki sync drift detected — changelog rows: ${cl}, article rows: ${ar}. ` +
        `Sample: ${sample}. Continuing boot; see /api/platform-health for full detail.`,
      );
      lastSyncAssertionResult = { ok: false, changelogRows: cl, articleRows: ar, drift, checkedAt: new Date().toISOString() };
      return;
    }
    console.log(`[startup] Platform-wiki sync assertion OK — ${cl} changelog rows ↔ ${ar} articles`);
    lastSyncAssertionResult = { ok: true, changelogRows: cl, articleRows: ar, drift: [], checkedAt: new Date().toISOString() };
  } catch (err: any) {
    console.warn(`[startup] Platform-wiki sync assertion errored (non-fatal): ${err?.message ?? err}`);
    lastSyncAssertionResult = { ok: false, changelogRows: 0, articleRows: 0, drift: [], checkedAt: new Date().toISOString() };
  }
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

// SEVCO Sites: handle *.sev.cx subdomains before anything else
app.use(sevcoSitesMiddleware);

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
  // Fail-fast on schema migration errors — running the app against a partial
  // schema is exactly the kind of silent breakage Task #449 set out to prevent.
  try {
    await runStartupMigrations();
  } catch (err) {
    console.error("Startup migration error — aborting boot:", err);
    process.exit(1);
  }
  await initStripe().catch((err) => console.error("Stripe init error:", err));
  await seedDatabase().catch((err) => console.error("Seed error:", err));
  // Task #525 — Apply the committed changelog snapshot after seedDatabase()
  // creates the 'sevco-platform' category. This is what makes prod self-sync
  // its changelog/wiki tables to match the preview on every deploy.
  await applyChangelogSnapshot().catch((err) => console.error("Changelog snapshot apply error:", err));
  // Task #526 — Run the sync assertion AFTER the snapshot has had its
  // chance to insert/update. Warn-and-continue (no throw) so a stale prod
  // DB cannot crash the Promote stage like it did under Task #525.
  await assertPlatformWikiSync().catch((err) => console.warn("Sync assertion error:", err?.message ?? err));
  await promoteFounderToAdmin().catch((err) => console.error("Promotion error:", err));
  await markExistingUsersVerified().catch((err) => console.error("Email verify migration error:", err));
  await seedProjects().catch((err) => console.error("Project seed error:", err));
  await seedServices().catch((err) => console.error("Service seed error:", err));
  await seedInfrastructureServices().catch((err) => console.error("Infrastructure services seed error:", err));
  await migrateServiceCategories().catch((err) => console.error("Service category migration error:", err));
  await seedPlaylists().catch((err) => console.error("Playlist seed error:", err));
  await seedStoreProducts().catch((err) => console.error("Store products seed error:", err));
  await seedFeatureArticles().catch((err) => console.error("Feature articles seed error:", err));
  await storage.seedSocialLinksIfEmpty().catch((err) => console.error("Social links seed error:", err));
  await storage.migrateSocialLinksShowOnListen().catch((err) => console.error("Social links listen migration error:", err));
  await checkEmailCredentials().catch((err) => console.warn("[email] Startup credential check failed:", err?.message ?? err));
  logEmptyBodyEmails().catch((err) => console.warn("[email] Backfill check error:", err?.message ?? err));
  // seedFeatureArticles() handles SEVCO Platform wiki articles (25 feature-area articles in category ID 12)
  // Seed official Spark Packs
  await seedSparkPacks().catch((err: any) => console.warn("[sparks] Pack seed warning:", err?.message ?? err));

  // Seed default Shader Studio presets (idempotent)
  await (async () => {
    try {
      const existing = await storage.getShaderPresets();
      if (existing.length === 0) {
        const defaults = [
          // The six legacy palettes — kept under the "classic-plasma" effect type
          // so the original landing visuals remain valid as named presets.
          { name: "Cosmic Plasma", effectType: "classic-plasma", paramsJson: { speed: 1.0, intensity: 1.0, palette: "cosmic" } },
          { name: "Ocean Plasma", effectType: "classic-plasma", paramsJson: { speed: 0.8, intensity: 0.9, palette: "ocean" } },
          { name: "Ember Plasma", effectType: "classic-plasma", paramsJson: { speed: 1.1, intensity: 1.1, palette: "ember" } },
          { name: "Midnight Plasma", effectType: "classic-plasma", paramsJson: { speed: 0.6, intensity: 0.8, palette: "midnight" } },
          { name: "Galactic Plasma", effectType: "classic-plasma", paramsJson: { speed: 1.3, intensity: 1.2, palette: "galactic" } },
          { name: "Nebula Plasma", effectType: "classic-plasma", paramsJson: { speed: 1.0, intensity: 1.0, palette: "nebula" } },
          { name: "Mesh Aurora", effectType: "mesh-gradient", paramsJson: { speed: 0.5, hueShift: 0.0, blendSoftness: 0.7 } },
          { name: "Liquid Chrome", effectType: "liquid-chrome", paramsJson: { speed: 0.8, contrast: 1.2, tint: 0.0 } },
          { name: "Paint Flow", effectType: "paint-flow", paramsJson: { speed: 0.7, viscosity: 0.5, palette: "ember" } },
          { name: "Swirl", effectType: "swirl", paramsJson: { speed: 0.9, twist: 1.5, palette: "cosmic" } },
          { name: "Blob Field", effectType: "blob", paramsJson: { speed: 0.6, blobs: 5, palette: "ocean" } },
          { name: "Wave Distortion", effectType: "wave-distortion", paramsJson: { speed: 1.0, amplitude: 0.4, frequency: 6.0 } },
          { name: "Chromatic Aberration", effectType: "chromatic-aberration", paramsJson: { speed: 0.5, separation: 0.02, palette: "galactic" } },
          { name: "Soft Glow", effectType: "glow", paramsJson: { speed: 0.4, intensity: 0.8, palette: "midnight" } },
          { name: "Film Grain", effectType: "film-grain", paramsJson: { speed: 1.0, grain: 0.25, tint: 0.0 } },
        ];
        for (const d of defaults) {
          await storage.createShaderPreset({ ...d, createdBy: null });
        }
        console.log(`[shader] Seeded ${defaults.length} default presets`);
      }

      // Seed default page assignments so first-load visuals are assignment-driven
      // (only for keys that are not already set — never overwrite user choices).
      const allPresets = await storage.getShaderPresets();
      const byName = new Map(allPresets.map((p) => [p.name, p.id]));
      const settingsNow = await storage.getPlatformSettings();
      const desiredAssignments: Record<string, string> = {
        "shader.page.landing": "Cosmic Plasma",
        "shader.page.brand":   "Mesh Aurora",
      };
      const toApply: Record<string, string> = {};
      for (const [key, presetName] of Object.entries(desiredAssignments)) {
        if (settingsNow[key]) continue;
        const id = byName.get(presetName);
        if (id != null) toApply[key] = String(id);
      }
      if (Object.keys(toApply).length > 0) {
        await storage.setPlatformSettings(toApply);
        console.log(`[shader] Seeded default page assignments:`, toApply);
      }
    } catch (err: unknown) {
      console.warn("[shader] Preset seed failed:", err instanceof Error ? err.message : err);
    }
  })();

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
  // Surface EADDRINUSE clearly so the workflow log shows an actionable
  // message instead of a raw stack trace + zombie process. Exit non-zero
  // so the workflow runner can restart cleanly.
  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err && err.code === "EADDRINUSE") {
      log(
        `port ${port} is already in use (EADDRINUSE). An orphan tsx/node process is likely still bound. Restart the workflow or kill the stale process.`,
        "startup",
      );
      process.exit(1);
    }
    log(`http server error: ${err?.message ?? String(err)}`, "startup");
    process.exit(1);
  });
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
