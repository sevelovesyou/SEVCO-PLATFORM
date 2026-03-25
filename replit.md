# SEVCO Platform

## Overview
A multi-app platform for sevelovesyou.com (SEVE / SEVCO Records). Built as a platform shell wrapping multiple apps: Wiki (encyclopedic knowledge base), Music (SEVCO RECORDS), Store, Projects (SEVCO Ventures), and a role-based Dashboard. The platform features a persistent global header/nav, and each app can have its own sidebar or layout.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI + Wouter routing + TanStack Query
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Theme**: Clean encyclopedic design with dark/light mode support

## Key Features
1. **Authenticated Login** - session-based login/register with bcrypt password hashing and passport.js
2. **Articles** with structured content and markdown-like formatting
3. **Infoboxes** - type-based (artist, song, album, merchandise, event, general) with key-value fields
4. **Citation Validator** - validates URLs (HEAD request + fallback GET) and citation format (APA/MLA/Chicago)
5. **Semantic Crosslinks** - auto-generated using keyword extraction and frequency analysis
6. **Version Review Workflow** - edits create pending revisions; admin approves/rejects before publishing
7. **Search** with server-side filtering by query, category, and status
8. **Categories** for organizing articles

## Authentication
- passport.js LocalStrategy with bcryptjs password hashing
- express-session with connect-pg-simple (stored in PostgreSQL)
- Protected routes redirect unauthenticated users to /auth
- **Email verification required on signup**: Registration collects email, sends verification link via Resend, user must verify before logging in
- API routes: POST /api/register, POST /api/login, POST /api/logout, GET /api/user, GET /api/verify-email, POST /api/resend-verification
- Email client: server/emailClient.ts (Resend integration via Replit connector)
- Existing users auto-marked as email-verified on startup

## Platform Routes
| Route | Page | Sidebar |
|-------|------|---------|
| `/` | Landing (platform hub) | None |
| `/wiki` | Wiki Hub | Wiki sidebar |
| `/wiki/:slug` | Article View | Wiki sidebar |
| `/edit/:slug`, `/new` | Article Editor | Wiki sidebar |
| `/search`, `/review` | Wiki tools | Wiki sidebar |
| `/category/:slug` | Category View | Wiki sidebar |
| `/account` | Account Settings | Wiki sidebar |
| `/music` | SEVCO RECORDS hub | None |
| `/listen` | Music catalog / listen | None |
| `/music/submit` | Submit music to SEVCO Records | None |
| `/music/playlists` | Curated playlists | None |
| `/music/artists` | Artists listing | None |
| `/music/artists/:slug` | Artist detail | None |
| `/music/albums/:slug` | Album detail | None |
| `/jobs` | Jobs board | None |
| `/jobs/:slug` | Job detail + application form | None |
| `/contact` | Contact page | None |
| `/profile` | Own profile (auth required) | None |
| `/profile/:username` | Public user profile | None |
| `/services` | Services listing | None |
| `/services/:slug` | Service detail | None |
| `/store` | Store | None |
| `/projects` | SEVCO Ventures | None |
| `/dashboard` | Redirects to /command | None |
| `/command` | Command — Overview | Command sidebar |
| `/command/store` | Command — Store Management (admin/exec) | Command sidebar |
| `/command/users` | Command — User Management (admin) | Command sidebar |
| `/command/changelog` | Command — Changelog (admin/exec/staff) | Command sidebar |
| `/command/music` | Command — Music Submissions (admin/exec) | Command sidebar |
| `/command/playlists` | Command — Playlist Management (admin/exec) | Command sidebar |
| `/command/jobs` | Command — Jobs & Applications (admin/exec) | Command sidebar |
| `/command/social-links` | Command — Social Links admin (admin) | Command sidebar |
| `/notes` | Personal Notes (auth required) | None |
| `/auth` | Login/Register | None |
| `/verify-email` | Email Verification (unguarded) | None |

## Project Structure
```
shared/schema.ts              - Drizzle schema (users, articles, revisions, citations, crosslinks, categories)
server/db.ts                  - Database connection (exports pool and db)
server/auth.ts                - Passport setup, session config, auth routes
server/middleware/permissions.ts  - requireAuth, requireRole middleware + RBAC constants
server/storage.ts             - DatabaseStorage implementing IStorage interface
server/routes.ts              - REST API routes + crosslink generation + citation validation
client/src/App.tsx            - Platform shell with PlatformHeader, conditional wiki sidebar, routing
client/src/components/platform-header.tsx - Global header: logo, app-switcher, user badge/role, sign-out
client/src/components/app-sidebar.tsx - Wiki-specific sidebar (nav, categories, recent articles)
client/src/hooks/use-auth.tsx - Auth context provider and useAuth hook (AuthUser includes Role)
client/src/hooks/use-permission.ts - usePermission hook with typed capability flags
client/src/pages/landing.tsx  - Platform landing page (/)
client/src/pages/home.tsx     - Wiki hub (/wiki)
client/src/pages/music-page.tsx, store-page.tsx, projects-page.tsx - Section pages
client/src/pages/dashboard-page.tsx - Legacy (still exists, but route is /command now)
client/src/pages/command-page.tsx   - CommandPageLayout wrapper component
client/src/pages/command-overview.tsx - /command — role-based stats
client/src/pages/command-users.tsx    - /command/users — user role management (admin)
client/src/pages/command-changelog.tsx - /command/changelog — changelog feed (admin/exec/staff)
client/src/pages/command-store.tsx    - /command/store — product management table (admin/exec)
client/src/components/command-sidebar.tsx - Command sidebar (Overview, Store, Users, Changelog)
client/src/pages/            - ArticleView, ArticleEditor, Search, ReviewQueue, CategoryView, Account, Auth
```

## RBAC Roles (Hierarchy)
admin > executive > staff > partner > client > user
- CAN_CREATE_ARTICLE: admin, executive, staff, partner
- CAN_PUBLISH_ARTICLES / CAN_ACCESS_REVIEW_QUEUE: admin, executive
- CAN_DELETE_ARTICLE: admin, executive
- CAN_MANAGE_ROLES: admin only

## Stripe / E-Commerce
- Stripe connected via Replit integration (stripe-replit-sync for webhook sync)
- `server/stripeClient.ts` — fetches Stripe credentials from Replit connector API
- `server/webhookHandlers.ts` — minimal webhook handler (delegates to StripeSync)
- Webhook route `/api/stripe/webhook` registered BEFORE `express.json()` in `server/index.ts`
- Products table has `stripe_product_id` and `stripe_price_id` columns
- Creating a product (admin/staff) automatically creates a matching Stripe product + price
- Cart context: `client/src/hooks/use-cart.tsx` (React state, no persistence)
- Cart drawer: `client/src/components/cart-drawer.tsx`
- `POST /api/checkout` — creates Stripe Checkout session, returns redirect URL
- `GET /api/checkout/session/:sessionId` — confirms payment, creates order record
- Orders table tracks completed purchases (userId, sessionId, paymentIntentId, total, status, items)
- `/store/success` and `/store/cancel` — post-checkout pages
- Orders visible to admin/executive in Dashboard

## Recent Changes
- 2026-02-19: Initial MVP with full wiki functionality, seed data, and review workflow
- 2026-03-24: Added authenticated user login with passport.js, bcrypt, and pg-stored sessions
- 2026-03-24: RBAC system: role pgEnum, requireAuth/requireRole middleware, usePermission hook
- 2026-03-24: Platform shell: PlatformHeader global nav, routing restructure (/wiki hub, platform sections), stub pages
- 2026-03-24: Command Center: renamed Dashboard→Command (CMD in nav, Command in footer). /dashboard redirects to /command. Added persistent CommandSidebar with Overview/Store/Users/Changelog sections. Split into role-gated sub-pages. Added Store Management page with stock toggle + delete. Added PATCH/DELETE endpoints for products.
- 2026-03-24: Stripe Checkout & Cart — full e-commerce with cart drawer, Stripe Checkout, order tracking, admin order view
- 2026-03-25: Public access + Mega-menu navigation — all pages public, PlatformHeader upgraded with mega-menu dropdowns for Music/Wiki/Store/Projects/Services
- 2026-03-25: Home page redesign (platform hub) + Contact page with Resend email integration
- 2026-03-25: Profile page with MySpace-style customization (bio, avatar, links, accent color)
- 2026-03-25: Jobs board — listings, detail + application form, command management page
- 2026-03-25: Services page + mega-menu (3-column category-grouped, 15 service types with icons)
- 2026-03-25: Music expansion — SEVCO RECORDS label page, /listen bio-link page, /music/playlists (API-driven + submission form), /music/submit (auth-gated A&R submissions); playlists + musicSubmissions tables added; Command Music submissions management page
- 2026-03-25: Platform social links system — platformSocialLinks table, seed on startup, footer dynamic, contact page dynamic, command-social-links management page
- 2026-03-25: Profile & user admin — header user dropdown (My Profile/Account/Sign out), profile banner using profileBgImageUrl, inline username edit in command-users, PATCH /api/users/:id/username route
- 2026-03-25: Store CMD product creation — full Add Product dialog (name, slug, price, category, stock, image)
- 2026-03-25: Wiki article archive system — archive/unarchive routes, article-view Archive+Delete buttons, sidebar Archived section with unarchive for admin/exec
- 2026-03-25: Command Playlists page — full CRUD (add/edit/delete playlists) with PATCH+DELETE routes; Playlists link in command sidebar
- 2026-03-25: Notes tool — personal notes page at /notes; notes table (title, content, color, pinned); CRUD API; Notes link in header user dropdown; masonry card layout with search/pin/color
