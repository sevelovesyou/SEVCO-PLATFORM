# SEVCO Platform

## Overview
The SEVCO Platform is a multi-application system designed for sevco.us, integrating a Wiki for knowledge, SEVCO RECORDS for music, a Store, SEVCO Ventures for projects, and a role-based Dashboard. Its primary goal is to provide a comprehensive, interconnected digital ecosystem for various SEVCO initiatives, featuring a persistent global navigation while allowing individual applications flexible layouts. The platform aims to centralize content, e-commerce, and community engagement for SEVCO's diverse operations.

## User Preferences
I want iterative development. I prefer detailed explanations. Ask before making major changes. Do not make changes to the folder `shared/`. Do not make changes to the file `server/db.ts`. Do not make changes to the file `client/src/pages/dashboard-page.tsx`. Do not make changes to the file `server/emailClient.ts`.

## System Architecture
The platform is built with a modern web stack:
- **Frontend**: React, Vite, TailwindCSS, Shadcn UI for componentry, Wouter for routing, and TanStack Query for data fetching.
- **Backend**: An Express.js REST API.
- **Database**: PostgreSQL, managed with Drizzle ORM.
- **UI/UX**: Features a clean, encyclopedic design supporting both dark and light modes.
- **Core Features**:
    - **Global Music Player**: A draggable, resizable `FloatingMusicPlayer` with persistence across routes, supporting standard audio playback and stream tracking.
    - **Content Management**: Articles with structured content, markdown-like formatting, and type-based Infoboxes.
    - **Validation & Linking**: Citation validation (URL and format) and semantic cross-linking through keyword analysis.
    - **Version Control**: A revision workflow for articles requiring admin approval.
    - **Search**: Server-side search with filtering capabilities.
    - **Role-Based Access Control (RBAC)**: Hierarchical roles (admin > executive > staff > partner > client > user) control access to features and content, managed by `requireAuth` and `requireRole` middleware.
    - **Authentication**: Session-based login/registration using bcrypt and Passport.js, with email verification and X (Twitter) OAuth 2.0 integration.
    - **E-commerce**: Stripe integration for product management, checkout, and order tracking, including product synchronization and webhook handling.
    - **Supabase Storage**: Utilized for file uploads (avatars, banners, music tracks, gallery, brand assets) with public and private buckets. All Supabase storage URLs are proxied through `GET /images/:bucket/*` on the Express server, which adds `Cache-Control: immutable` headers and blocks the private `tracks` bucket (403). The upload API returns `/images/:bucket/:path` proxy paths directly. All frontend image renders must use `resolveImageUrl()` from `client/src/lib/resolve-image-url.ts` to rewrite raw Supabase storage URLs to proxy paths.
    - **Analytics**: First-party pageview tracker (`server/internalAnalytics.ts`) that records anonymous, salted-hash pageviews to Postgres for the CMD admin dashboards (sessions, top pages, traffic sources, devices, countries). No external services, no cookies. Honors Do-Not-Track and a `sevco-analytics-opt-out` localStorage flag.
    - **Dynamic Content**: AI-powered news features (summarization, image generation), trending hashtags, and personalized news feeds with bookmarking and preference management.
    - **Email System**: Threaded email conversation view with inbox, starred, and send functionalities.
    - **Hostinger Integration**: Manages VPS hosting, domains, and WHOIS lookups through the Hostinger API.
    - **Social Features**: Public user profiles, a social feed, and dynamic social links management.
    - **Platform Modules**:
        - **Wiki**: Comprehensive knowledge base with article viewing, editing, search, category organization, and a review queue for pending revisions. Includes AI-powered lifecycle management: Gap Analysis (LLM identifies missing topics), Freshness Dashboard (tracks staleness by `lastAiReviewedAt`), Re-wikify (refreshes stale articles through the LLM), and confidence-gated auto-publish (`wiki.autoPublishStrongConfidence` platform setting).
        - **Music (SEVCO RECORDS)**: Hub for music content, including catalog browsing, music submissions, curated playlists, artist/album details, and a Beats page (`/music/beats`) for instrumental tracks.
        - **Service Category Landing Pages** (Task #343): Six SEO/GEO-optimized landing pages at `/services/{category}` — creative, technology, marketing, teams, infrastructure, security. Each page has a hero, social proof strip, dynamic services grid (filtered by DB category), 3 value-prop cards, use-case cards, FAQ accordion with FAQPage JSON-LD, and a CTA banner. All copy lives in `CATEGORY_CONFIG` in `client/src/pages/service-category-page.tsx`. The All Services page (`/services`) has a "Browse by Category" grid of 6 shortcut cards. The Services nav dropdown redesigned to show category link cards (not individual services). Mobile nav updated to link to category pages.
        - **Store**: E-commerce functionality for products with a shopping cart, checkout, and order management.
        - **Projects (SEVCO Ventures)**: Section dedicated to projects.
        - **Command Center**: An admin dashboard providing role-based management for users, store products, music submissions, playlists, jobs, social links, hosting, media, finance, and the music tracks library.
        - **News**: An AI-enhanced news feed with trending topics, breaking news, article bookmarking, and personalized preferences.
        - **Jobs**: A job board with application forms and administrative management.
        - **Notes**: Personal note-taking application with search, pinning, and color-coding.
        - **Freeball** (`/freeball`): A browser-based voxel space exploration game built with Three.js / @react-three/fiber. Features procedural chunked terrain (simplex-noise), first-person WASD + PointerLock controls, voxel break/place, day/night cycle (Sky/Stars), the SEVCO SPHERE vehicle (Sparks shop unlock or Crystal crafting), multiplayer presence polling, global in-game chat, auto-save to DB, and a dark HUD overlay. New DB tables: `galaxy_planets`, `user_voxel_builds`, `user_galaxy_progress`. New API: `/api/freeball/*` (planets, progress, builds, unlock-sphere, chat, presence).
    - **Sparks Economy**: Platform currency with content sparking (posts, wiki articles, gallery images, music tracks, store products, projects, services), spark notifications, and a public leaderboard at `/sparks/leaderboard`. Sparks are tracked in the per-type tables `post_sparks`, `article_sparks`, `gallery_sparks`, `track_sparks`, `product_sparks`, `project_sparks`, and `service_sparks` (the unified `content_sparks` table was retired in Task #466). The four newer spark tables plus the `projects.lead_user_id` and `services.lead_user_id` columns must be present in the database — the Projects, Services, Store, Music browse, and Sparks Leaderboard list endpoints join against them and will return empty if they are missing. If a future schema sync drops them, re-run `npm run db:push` (Task #475 recovery). The same DDL is also applied idempotently in `runStartupMigrations` in `server/index.ts` so production self-heals on the next boot (Task #476). **Schema drift is now self-healing (Task #477)**: `server/schemaSync.ts` reads every `pgTable`/`pgEnum` from `shared/schema.ts` and emits idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS` / `CREATE TYPE` statements at every startup, so adding a new column or table to `shared/schema.ts` is now the only step needed for the change to reach production on deploy — no more hand-mirroring DDL into `server/index.ts`. Type changes, renames, and drops still require an explicit SQL file in `/migrations`. Notifications of type `"spark"` get yellow ⚡ styling in the dropdown and a pulse animation on the bell icon.
    - **Wiki Source Library** (Task #317): Editors can ingest web pages, academic papers (DOI/PubMed/arXiv), and PDFs into a "Source Library" tab in Command Wiki (`/command/wiki`). Each ingest extracts readable text server-side and opens Wikify pre-filled with the content. Past sources are tracked in the `wiki_sources` DB table with type, identifier, title, ingestion date, and article count. Ingest endpoints: `POST /api/tools/wiki/ingest-url`, `POST /api/tools/wiki/ingest-academic`, `POST /api/tools/wiki/ingest-pdf`. Source library endpoints: `GET /api/tools/wiki/sources`, `PATCH /api/tools/wiki/sources/:id/increment`, `DELETE /api/tools/wiki/sources/:id`. Uses `@mozilla/readability`, `jsdom`, and `pdf-parse` packages.
    - **Wiki LLM Cost Dashboard** (Task #319): All wiki LLM operations (wikify, rewikify/generate-source, semantic_relink) log token usage to the `wiki_llm_usage` DB table. Costs are computed server-side using configurable rates stored in `platform_settings["wiki.llmRates"]` (defaults: Claude Haiku $0.0008/$0.004 per 1K in/out, Sonnet $0.003/$0.015). Command Wiki → "AI Cost" tab (executive+) shows current month total spend prominently, a per-operation breakdown table, month navigation for historical data, a configurable alert threshold (stored in `platform_settings["wiki.llmAlertThreshold"]`), and a rate card editor. Cost APIs: `GET /api/tools/wiki/llm-cost?year=&month=`, `GET /api/tools/wiki/llm-rates`, `PUT /api/tools/wiki/llm-rates`, `PUT /api/tools/wiki/llm-alert-threshold`. Cost helper module: `server/wiki-llm-cost.ts`.

## OG / Social Meta Injection

The server injects OG and Twitter meta tags at request time for every HTML response (both production via `server/static.ts` and dev via `server/vite.ts`). The admin sets values in Command Center which are stored as `platform.ogImageUrl` and `platform.description` in platform settings.

**What gets replaced per request:**
- `og:image` + `twitter:image` — CMD-set image URL (falls back to `<host>/favicon.jpg`)
- `og:description` + `meta[name=description]` + `twitter:description` — CMD-set description
- `<link rel="canonical">` + `og:url` — derived from the incoming request host/protocol so all SEVCO domains (`sevco.us`, `sev.cx`, `sevelovesyou.com`) return their own host in these tags

**X/Twitter card cache-bust runbook:**
After changing OG image or description in Command Center, X's cached card must be manually refreshed for each domain:
1. Go to https://cards-dev.twitter.com/validator
2. Paste `https://sevco.us/`, click Preview — this forces a re-fetch
3. Repeat for `https://sev.cx/` and `https://sevelovesyou.com/`

Alternatively, append a one-time query string (e.g. `?v=2`) to the URL you share in the tweet to bypass X's cache for that specific share.

## Platform Changelog / Wiki Sync (Task #522)

`/platform`, `/command/changelog`, and `/wiki/engineering/sevco-platform` all read from a single source: the `changelog` table joined with the `articles` table on `wiki_slug = slug`. Three guarantees are enforced at startup in `runStartupMigrations` (`server/index.ts`):

1. **Single database for prod and dev.** There must be no production-only `DATABASE_URL` override in deployment secrets — both environments share the same Postgres so the published site mirrors the Replit preview. Adding a prod-only `DATABASE_URL` will silently re-introduce drift.
2. **Range placeholders for skipped task numbers.** Any consecutive gap in `Task #N` numbering is auto-filled with one muted `Task #N-M — (no logged content)` row + matching `platform-task-NNN-MMM` article. Idempotent; re-runs do not duplicate.
3. **Hard sync assertion.** After backfilling missing articles, startup throws if any `platform-task-*` changelog row still lacks an article. This is intentional — a failing boot is preferred over silently shipping a broken `/platform`.

Re-merging the same task ref **updates** the existing changelog row + wiki article in place. The internal endpoints (`/api/internal/changelog-entry`, `/api/internal/wiki-article`) are upserts keyed by `wikiSlug` / `slug`. The post-merge pipeline (`scripts/post-merge.sh` → `scripts/append-to-update-log.js`) calls these endpoints for every merge.

## External Dependencies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js, bcryptjs, express-session, connect-pg-simple, passport-oauth2, X (Twitter) OAuth 2.0
- **Email Service**: Resend (via Replit connector)
- **Payment Gateway**: Stripe (via Replit integration)
- **Cloud Storage**: Supabase Storage
- **Analytics**: First-party pageview tracker (Postgres-backed, no external services)
- **AI Services**: Grok AI (for news summarization, image generation, etc.)
- **Hosting Management**: Hostinger API (for VPS, domains, catalog, WHOIS)
- **Frontend Libraries**: React, Vite, TailwindCSS, Shadcn UI, Wouter, TanStack Query
- **3D / Game Engine**: Three.js, @react-three/fiber, @react-three/drei, @react-three/rapier, simplex-noise, zustand (used by Freeball)
