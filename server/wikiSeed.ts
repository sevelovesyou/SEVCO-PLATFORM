import { db } from "./db";
import { articles, categories, changelog } from "../shared/schema";
import { eq, and, isNull, not, like } from "drizzle-orm";

async function getEngineeringCategoryId(): Promise<number> {
  const rows = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, "engineering"));
  if (!rows.length) throw new Error("Engineering category not found — cannot seed wiki articles");
  return rows[0].id;
}

type ArticleData = {
  slug: string;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  infoboxData: Record<string, string>;
};

const ARTICLE_DATA: ArticleData[] = [
  {
    slug: "eng-task-1-rbac-role-permission-system",
    title: "Task #1 — RBAC & Role Permission System",
    summary: "Full authentication system with six role tiers: Admin, Executive, Staff, Partner, Client, and User. Session-based auth via Passport.js with PostgreSQL session store. Role-adaptive dashboard and server-side permission middleware.",
    tags: ["engineering", "task", "task-1", "auth", "rbac"],
    infoboxData: { Task: "#1", Tool: "Replit", Version: "0.2.0" },
    content: `# Task #1 — RBAC & Role Permission System

## What & Why
The SEVCO Platform needed a secure, multi-tiered access control system from the start. Without role-based permissions, every user would have equal access to sensitive admin tools, CMS features, and financial data. This task established the foundational authentication and role hierarchy that every subsequent feature builds upon.

## What Was Built
- Full user registration and login system with session-based authentication using Passport.js
- Six permission tiers: **Admin**, **Executive**, **Staff**, **Partner**, **Client**, and **User**
- Role-adaptive dashboard showing different statistics and views based on the logged-in user's role
- Backend \`requireRole\` middleware to gate API endpoints by minimum required role
- Frontend \`usePermission\` hook for conditional UI rendering based on role
- Session persistence using PostgreSQL session store via \`connect-pg-simple\`
- Password hashing via bcrypt

## Technical Architecture

### Schema Additions
\`\`\`
users table:
- id (serial PK)
- username (text, unique)
- email (text, unique)
- password (text, bcrypt hashed)
- role (text: admin | executive | staff | partner | client | user)
- displayName (text nullable)
- avatarUrl (text nullable)
- createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
POST /api/auth/register — public — creates new user account (role defaults to "user")
POST /api/auth/login — public — authenticates user, creates session
POST /api/auth/logout — auth required — destroys session
GET /api/auth/me — auth required — returns current user object
\`\`\`

### Frontend Additions
- \`client/src/pages/auth-page.tsx\` — Combined login/register form with toggle between modes
- \`client/src/hooks/use-auth.tsx\` — Auth context provider and useAuth hook
- \`client/src/hooks/use-permission.tsx\` — Permission checking hook (\`usePermission("staff")\`)
- Role-adaptive dashboard at \`/dashboard\` with contributor stats for lower roles and admin stats for higher

### Key Design Decisions
- **Six-tier hierarchy**: admin > executive > staff > partner > client > user. Each tier inherits all permissions of tiers below.
- **Session-based auth over JWT**: Chosen for simplicity; sessions stored in PostgreSQL via \`connect-pg-simple\`.
- **Server-side role checks always enforced**: Even when the frontend hides a UI element, the backend independently validates the role.
- **Role promotion via DB**: Only a database admin can promote users. No self-promotion is possible.

## Files Changed
- \`shared/schema.ts\` — Added users table definition with role enum
- \`server/auth.ts\` — Passport.js local strategy, session serialization/deserialization
- \`server/routes.ts\` — Auth routes: register, login, logout, me
- \`server/middleware/requireRole.ts\` — Role enforcement middleware factory
- \`server/storage.ts\` — User CRUD: createUser, getUserByUsername, getUserById, updateUser
- \`client/src/App.tsx\` — AuthProvider wrapper, protected route guard
- \`client/src/pages/auth-page.tsx\` — Login/register UI with form validation
- \`client/src/hooks/use-auth.tsx\` — Auth context provider and hook
- \`client/src/hooks/use-permission.tsx\` — Permission checking hook

## Testing Notes
1. Register a new account — role should default to "user"
2. Log in and confirm session persists on page refresh
3. Call GET /api/auth/me without a session — should return 401 Unauthorized
4. Promote a user to "admin" in the DB, log in, verify admin-gated routes become accessible
5. Verify the dashboard renders different cards and stats depending on role

## Known Limitations / Out of Scope
- Email verification was added later in Task #21
- OAuth (Google, GitHub) login was not implemented
- Password reset flow was not added in this task
- Two-factor authentication is out of scope`,
  },
  {
    slug: "eng-task-2-platform-shell-global-navigation",
    title: "Task #2 — Platform Shell & Global Navigation",
    summary: "Launched the internal wiki with article creation, categorization, revision history, and citation support. Built the global platform shell including persistent header, collapsible wiki sidebar, and platform footer with social links.",
    tags: ["engineering", "task", "task-2", "wiki", "navigation"],
    infoboxData: { Task: "#2", Tool: "Replit", Version: "0.1.0" },
    content: `# Task #2 — Platform Shell & Global Navigation

## What & Why
Before any content pages could be built, the platform needed a durable shell: a persistent top navigation bar, a wiki sidebar, and a footer. This task also launched the wiki as the first major content system — a knowledge base where articles can be created, categorized, and revised collaboratively.

## What Was Built
- Global persistent header with app switcher, navigation links, and user authentication state
- Collapsible wiki sidebar with category listing and article navigation (collapses to icon-only rail)
- Platform footer with social links and navigation
- Wiki MVP: article creation, editing, categorization, revision history, and citation management
- Article status system: draft and published (archived added in Task #35)
- Cross-linking engine that analyzes article content to generate relevance-scored links between related articles

## Technical Architecture

### Schema Additions
\`\`\`
categories table: id (serial PK), name (text), slug (text unique), description (text nullable)
articles table: id (serial PK), title (text), slug (text unique), content (text), summary (text),
  categoryId (integer FK), status (text: draft | published), infoboxType (text),
  infoboxData (jsonb), tags (text[]), createdAt (timestamp), updatedAt (timestamp)
revisions table: id (serial PK), articleId (integer FK), content (text), authorId (integer FK),
  status (text: pending | approved | rejected), createdAt (timestamp)
citations table: id (serial PK), articleId (integer FK), url (text), title (text),
  format (text: apa | mla | chicago), createdAt (timestamp)
crosslinks table: id (serial PK), fromArticleId (integer FK), toArticleId (integer FK), score (real)
\`\`\`

### API Routes
\`\`\`
GET /api/categories — public — returns all categories
GET /api/categories/:slug — public — returns category with its articles
GET /api/articles/recent — public — returns recently updated published articles
GET /api/articles/search?q= — public — full-text article search
GET /api/articles/:slug — public — returns article with revisions and citations
POST /api/articles — staff+ — creates article
PATCH /api/articles/:slug — staff+ — updates article
POST /api/articles/:id/revisions — auth required — submits revision for review
GET /api/articles/:id/crosslinks — public — returns cross-linked related articles
\`\`\`

### Frontend Additions
- \`client/src/components/platform-header.tsx\` — Persistent top navigation with auth state and app switcher
- \`client/src/components/app-sidebar.tsx\` — Collapsible wiki sidebar with category tree
- \`client/src/components/platform-footer.tsx\` — Footer with social links
- \`client/src/pages/wiki-page.tsx\` — Wiki landing with category grid
- \`client/src/pages/article-view.tsx\` — Article reader with revision history and citations
- \`client/src/pages/article-editor.tsx\` — Markdown editor for creating/editing articles
- \`client/src/components/rich-text-editor.tsx\` — Markdown editor component

### Key Design Decisions
- **Revision workflow**: All edits by non-admin users create pending revisions requiring approval. Prevents unauthorized content changes.
- **Cross-linking via keyword analysis**: The system automatically suggests related articles based on shared keywords, reducing the need for manual internal linking.
- **Collapsible sidebar**: The wiki sidebar collapses to an icon-only rail on smaller screens.

## Files Changed
- \`shared/schema.ts\` — categories, articles, revisions, citations, crosslinks tables
- \`server/routes.ts\` — All wiki and category API routes
- \`server/storage.ts\` — Article/category/revision/citation CRUD methods
- \`client/src/App.tsx\` — Router setup, sidebar layout wrapper
- \`client/src/components/platform-header.tsx\` — Global navigation bar
- \`client/src/components/app-sidebar.tsx\` — Wiki sidebar component
- \`client/src/components/platform-footer.tsx\` — Platform footer
- \`client/src/pages/wiki-page.tsx\` — Wiki landing
- \`client/src/pages/article-view.tsx\` — Article reader
- \`client/src/pages/article-editor.tsx\` — Article editor

## Testing Notes
1. Visit /wiki — category grid should display all seeded categories
2. Create a new article as staff — should appear in the correct category
3. Edit an article as a regular user — a pending revision should be created, not a direct update
4. Collapse the wiki sidebar — should shrink to icon-only rail
5. Visit an article with cross-links — related articles should appear

## Known Limitations / Out of Scope
- Real-time collaborative editing is not supported
- Image embedding requires pasting a URL; file upload was added in Task #57
- Full-text search uses SQL LIKE matching (not a dedicated search index)`,
  },
  {
    slug: "eng-task-3-landing-page-dashboard",
    title: "Task #3 — Landing Page, Store & Projects",
    summary: "Launched the home landing page with platform overview. Launched the SEVCO Store with product catalog, category filtering, stock status, and Stripe-powered checkout. Introduced the Projects section showcasing SEVCO Ventures with status tracking.",
    tags: ["engineering", "task", "task-3", "store", "projects", "landing"],
    infoboxData: { Task: "#3", Tool: "Replit", Version: "0.3.0" },
    content: `# Task #3 — Landing Page, Store & Projects

## What & Why
With authentication and the wiki shell in place, the platform needed its main public-facing surfaces: a landing page to introduce SEVCO, a store to sell products, and a projects showcase to highlight SEVCO ventures. This task delivered all three as the first major feature wave.

## What Was Built

### Landing Page
- Hero section with headline, description, and CTA buttons
- Platform overview sections highlighting key product areas
- Responsive layout with mobile-first design

### SEVCO Store
- Product catalog with category filtering via pill-style filter bar
- Product detail pages with descriptions, pricing, and stock status
- Cart system (slide-out drawer) with quantity management
- Stripe-powered checkout integration with success/cancel pages
- Guest checkout support (no login required)
- Admin product management in Command Center

### Projects Section
- Projects listing page showcasing SEVCO Ventures with status badges
- Individual project detail pages with type and status tracking
- Status types: Active, In Progress, Planned, Archived

## Technical Architecture

### Schema Additions
\`\`\`
products table: id (serial PK), name (text), slug (text), description (text), price (real),
  category (text), imageUrl (text), stock (integer), enabled (boolean), createdAt (timestamp)
orders table: id (serial PK), userId (integer FK nullable), sessionId (text nullable),
  items (jsonb), total (real), status (text), stripeSessionId (text), createdAt (timestamp)
projects table: id (serial PK), name (text), slug (text), description (text), status (text),
  imageUrl (text), websiteUrl (text nullable), type (text), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/products — public — returns all enabled products, supports ?category= filter
GET /api/products/:slug — public — returns single product
POST /api/products — admin — creates product
PATCH /api/products/:id — admin — updates product
POST /api/checkout/create-session — auth optional — creates Stripe checkout session
GET /api/checkout/success — public — verifies payment and marks order paid
GET /api/projects — public — returns all projects
GET /api/projects/:slug — public — returns single project
POST /api/projects — admin — creates project
PATCH /api/projects/:slug — admin — updates project
\`\`\`

### Frontend Additions
- \`client/src/pages/landing.tsx\` — Platform landing/home page
- \`client/src/pages/store-page.tsx\` — Store product listing with category filter
- \`client/src/pages/product-detail.tsx\` — Product detail and add-to-cart
- \`client/src/pages/store-success-page.tsx\` — Post-checkout success screen
- \`client/src/pages/store-cancel-page.tsx\` — Checkout cancelled screen
- \`client/src/pages/projects-page.tsx\` — Projects listing grid
- \`client/src/pages/project-detail.tsx\` — Individual project detail page
- \`client/src/components/cart-drawer.tsx\` — Slide-out cart panel

### Key Design Decisions
- **Stripe Checkout (not custom UI)**: Using Stripe's hosted checkout avoids PCI compliance concerns and reduces complexity.
- **Guest checkout**: Orders can be placed without an account, using session-based tracking.

## Environment Variables
- \`STRIPE_SECRET_KEY\` — Stripe secret key (server-side)
- \`VITE_STRIPE_PUBLIC_KEY\` — Stripe publishable key (frontend)

## Files Changed
- \`shared/schema.ts\` — products, orders, projects tables
- \`server/routes.ts\` — Store, checkout, and projects API routes
- \`server/storage.ts\` — Product, order, and project CRUD methods
- \`server/stripeClient.ts\` — Stripe SDK initialization
- \`client/src/pages/landing.tsx\` — Platform home page
- \`client/src/pages/store-page.tsx\` — Store listing
- \`client/src/pages/projects-page.tsx\` — Projects showcase
- \`client/src/components/cart-drawer.tsx\` — Cart component

## Testing Notes
1. Visit /store — products should display with category filter pills
2. Add a product to cart and open the cart drawer — quantity and total should update correctly
3. Proceed to checkout — Stripe hosted page should open with correct line items
4. Use Stripe test card 4242 4242 4242 4242 — should redirect to success page
5. Visit /projects — project cards with status badges should display

## Known Limitations / Out of Scope
- Store analytics were added in Task #18
- Product image upload (vs URL) was added in Task #57 (Supabase Storage)
- Inventory management beyond a simple stock number is not implemented`,
  },
  {
    slug: "eng-task-4-music-page-sevco-records",
    title: "Task #4 — Music Page — SEVCO RECORDS",
    summary: "Launched the SEVCO RECORDS music hub with artist profiles, album listings, music submission form, and staff management tools for the Command Center.",
    tags: ["engineering", "task", "task-4", "music", "sevco-records"],
    infoboxData: { Task: "#4", Tool: "Replit", Version: "—" },
    content: `# Task #4 — Music Page — SEVCO RECORDS

## What & Why
SEVCO RECORDS is a core SEVCO venture — a music label and production company. The platform needed a dedicated music hub where visitors can discover artists and albums, and where staff can manage the catalog.

## What Was Built
- /music page with featured artist section and browsable artist grid
- Artist detail pages at /music/:artistSlug with bio, photo, and album listings
- Album detail pages with track listings
- Staff management tools: add/edit artists and albums via Command Center
- Music submission form for aspiring artists

## Technical Architecture

### Schema Additions
\`\`\`
artists table: id (serial PK), name (text), slug (text unique), bio (text nullable),
  imageUrl (text nullable), genre (text nullable), spotifyId (text nullable),
  featured (boolean default false), createdAt (timestamp)
albums table: id (serial PK), artistId (integer FK), title (text), slug (text unique),
  releaseYear (integer nullable), coverUrl (text nullable), description (text nullable),
  createdAt (timestamp)
music_submissions table: id (serial PK), artistName (text), email (text),
  trackUrl (text nullable), genre (text nullable), message (text nullable),
  status (text default "pending"), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/artists — public — returns all artists, ?featured=true for featured only
GET /api/artists/:slug — public — returns artist with their albums
POST /api/artists — staff+ — creates artist record
PATCH /api/artists/:slug — staff+ — updates artist
GET /api/albums/:slug — public — returns album detail with tracks
POST /api/albums — staff+ — creates album
POST /api/music/submit — public — submits demo for label consideration
GET /api/music/submissions — staff+ — returns all submissions with status
PATCH /api/music/submissions/:id — staff+ — updates submission status
\`\`\`

### Frontend Additions
- \`client/src/pages/music-page.tsx\` — Music hub with artist grid and featured section
- \`client/src/pages/artist-detail.tsx\` — Artist profile with albums list
- \`client/src/pages/album-detail.tsx\` — Album with track listing
- \`client/src/pages/music-submit-page.tsx\` — Demo submission form

## Files Changed
- \`shared/schema.ts\` — artists, albums, music_submissions tables
- \`server/routes.ts\` — Music, artist, album, and submission API routes
- \`server/storage.ts\` — Artist/album/submission CRUD methods
- \`client/src/pages/music-page.tsx\` — Music landing
- \`client/src/pages/artist-detail.tsx\` — Artist detail
- \`client/src/pages/album-detail.tsx\` — Album detail
- \`client/src/pages/music-submit-page.tsx\` — Submission form

## Testing Notes
1. Visit /music — artist grid should display with featured artist highlighted
2. Click an artist — profile page with bio and album list should appear
3. Submit a demo via the form — record should appear in CMD Music > Submissions
4. In CMD, update a submission status — should reflect immediately

## Known Limitations / Out of Scope
- Audio playback (global Spotify player bar) was added in Task #27
- Playlist management was added in Task #27
- Spotify follower/listener stats integration was added in Task #55`,
  },
  {
    slug: "eng-task-5-store-marketplace-section",
    title: "Task #5 — Store / Marketplace Section",
    summary: "Enhanced the store with category filtering, product cards with stock indicators, and improved Command Center product management tools.",
    tags: ["engineering", "task", "task-5", "store", "stripe"],
    infoboxData: { Task: "#5", Tool: "Replit", Version: "—" },
    content: `# Task #5 — Store / Marketplace Section

## What & Why
The initial store from Task #3 needed more refined category filtering, better product card design with clear stock indicators, and polished Command Center tools for product catalog management. This task iterated on the store to make it production-ready.

## What Was Built
- Store product filtering by category with a pill-style filter bar above the product grid
- Product cards with "In Stock" / "Out of Stock" availability badges
- Improved product detail page with a quantity selector
- Admin product management page in Command Center: create, edit, delete, and toggle products
- Store analytics summary for admins showing order counts and revenue

## Technical Architecture

### API Routes Enhanced
\`\`\`
GET /api/products?category=X — public — category filter via query param
GET /api/store/stats — admin+ — order counts and revenue totals
PATCH /api/products/:id/toggle — admin — toggles product enabled/disabled state
\`\`\`

### Frontend Additions
- Enhanced \`client/src/pages/store-page.tsx\` — Category filter pills, improved product grid with stock status
- \`client/src/pages/command-store.tsx\` — Full admin product management (create, edit, delete)

## Files Changed
- \`server/routes.ts\` — Added category filter, store stats endpoints
- \`server/storage.ts\` — getProducts with category filter param, getStoreStats aggregation
- \`client/src/pages/store-page.tsx\` — Category filter UI, stock badges, improved cards
- \`client/src/pages/command-store.tsx\` — Admin product CRUD interface

## Testing Notes
1. Visit /store and click a category filter — only that category's products should show
2. View a product that is out of stock — card should show "Out of Stock" badge
3. In CMD > Store, create a new product — should appear in the store immediately
4. Toggle a product's enabled state — disabled products should not appear publicly

## Known Limitations / Out of Scope
- Product image uploads were added in Task #57 (Supabase)
- Coupon or discount codes are not supported`,
  },
  {
    slug: "eng-task-6-projects-page-sevco-ventures",
    title: "Task #6 — Projects Page — SEVCO Ventures",
    summary: "Built the Projects page showcasing SEVCO Ventures with project cards, individual detail pages, status badges, and admin project management in CMD.",
    tags: ["engineering", "task", "task-6", "projects"],
    infoboxData: { Task: "#6", Tool: "Replit", Version: "—" },
    content: `# Task #6 — Projects Page — SEVCO Ventures

## What & Why
SEVCO runs multiple ventures across different industries. The Projects page gives visitors and partners a showcase of all active SEVCO ventures, with status tracking and detail pages for each project.

## What Was Built
- /projects listing page with project cards, status badges, and type labels
- Individual project detail pages at /projects/:slug with full description
- Project types: Game Server, Music Label, Software, Agency, Media, Other
- Status options: Active, In Progress, Planned, Archived
- Admin project management in Command Center: create, edit, delete projects
- Projects mega-menu dropdown in the navigation header

## Technical Architecture

### API Routes
\`\`\`
GET /api/projects — public — returns all active projects sorted by display order
GET /api/projects/:slug — public — returns single project with full detail
POST /api/projects — admin — creates project
PATCH /api/projects/:slug — admin — updates project
DELETE /api/projects/:slug — admin — removes project
\`\`\`

### Frontend Additions
- \`client/src/pages/projects-page.tsx\` — Projects listing grid with type/status filters
- \`client/src/pages/project-detail.tsx\` — Individual project page
- \`client/src/pages/command-projects.tsx\` — Admin project management

## Files Changed
- \`shared/schema.ts\` — Extended projects table (type, displayOrder, featured columns)
- \`server/routes.ts\` — Project API routes
- \`server/storage.ts\` — Project CRUD methods
- \`client/src/pages/projects-page.tsx\` — Projects listing
- \`client/src/pages/project-detail.tsx\` — Project detail
- \`client/src/components/platform-header.tsx\` — Projects dropdown in nav

## Testing Notes
1. Visit /projects — project cards should display with status badges
2. Click a project — navigate to the detail page with full description
3. In CMD, create a new project — should appear in the listing immediately
4. Archive a project — should disappear from the public listing

## Known Limitations / Out of Scope
- Social links on project pages were added in Task #44
- App/menu icons for projects were added in Task #54
- Custom project link URL override was added in Task #83`,
  },
  {
    slug: "eng-task-7-logo-favicon-update",
    title: "Task #7 — Logo & Favicon Update",
    summary: "Updated the platform logo and browser favicon to use official SEVCO branding. Replaced placeholder logo across the header, landing page, and browser tab icon.",
    tags: ["engineering", "task", "task-7", "branding", "logo"],
    infoboxData: { Task: "#7", Tool: "Replit", Version: "—" },
    content: `# Task #7 — Logo & Favicon Update

## What & Why
The platform initially used a placeholder logo and the default browser favicon. This task updated both to use official SEVCO branding, establishing visual identity consistently across all pages and browser tabs.

## What Was Built
- Updated logo in the platform header to use the official SEVCO logo image
- Updated browser tab favicon to the SEVCO icon
- Logo added to the landing page hero section
- Correct rendering in both light and dark mode

## Technical Architecture
- **Component**: \`platform-header.tsx\` — renders logo via \`<img>\` tag referencing the asset path
- **Asset pipeline**: Logo file stored in \`public/\` directory, referenced by Vite's static asset system; favicon uses standard \`<link rel="icon">\` in \`index.html\`
- **Dark mode**: Logo file chosen to work on both light and dark backgrounds (transparent PNG)

## Files Changed
- \`public/favicon.ico\` — Updated to SEVCO icon
- \`index.html\` — Updated favicon link tags and meta icon references
- \`client/src/components/platform-header.tsx\` — Updated logo src reference
- \`client/src/pages/landing.tsx\` — Logo in hero section

## Testing Notes
1. Open any page — browser tab should show the SEVCO favicon
2. Check the header in light mode and dark mode — logo should be clearly visible in both
3. Visit the landing page — logo should appear in the hero section

## Known Limitations / Out of Scope
- Dynamic logo upload via CMD was added in Task #73
- Logo skew prevention was addressed in Task #9`,
  },
  {
    slug: "eng-task-8-logo-display-fix",
    title: "Task #8 — Logo Display Fix",
    summary: "Fixed logo rendering issues including incorrect sizing, aspect ratio distortion, and alignment in the platform header across different screen sizes.",
    tags: ["engineering", "task", "task-8", "bug-fix", "logo"],
    infoboxData: { Task: "#8", Tool: "Replit", Version: "—" },
    content: `# Task #8 — Logo Display Fix

## What & Why
After deploying the new logo in Task #7, several display issues were discovered: the logo appeared distorted on certain screen sizes, had incorrect sizing in the header, and didn't align properly with adjacent navigation elements.

## Root Cause & Fix
The logo image element was missing explicit aspect-ratio constraints and was placed inside a flex container without proper size limits. When the flex layout calculated available space, the image stretched to fill it. Fix applied: \`object-fit: contain\` and a fixed height on the logo image, ensuring it always respects its natural proportions.

## What Was Fixed
- Logo aspect ratio preserved with \`object-fit: contain\`
- Logo container given fixed height to prevent stretching
- Alignment corrected relative to navigation links and app switcher
- Consistent logo height enforced across viewport sizes

## Technical Architecture
- **Component**: \`platform-header.tsx\` — the logo lives inside a flex row alongside nav links and the account dropdown
- **CSS fix**: Applied \`object-fit: contain\` on the \`<img>\` and constrained the parent container height to prevent the flex layout from stretching the image beyond its natural aspect ratio

## Files Changed
- \`client/src/components/platform-header.tsx\` — Logo image styling: added object-contain, fixed container height

## Testing Notes
1. Open the platform on a standard desktop width — logo should display at correct size
2. Check alignment with adjacent nav links — logo baseline should align correctly
3. Test on tablet (768px) — logo should scale proportionally without distortion

## Known Limitations / Out of Scope
- Logo skew on window resize (while resizing, not static) was a separate issue fixed in Task #9`,
  },
  {
    slug: "eng-task-9-logo-no-skew",
    title: "Task #9 — Prevent Logo Skewing on Resize",
    summary: "Fixed a bug where the SEVCO logo would skew/distort when the browser window was actively resized, caused by missing aspect-ratio constraints on the image element.",
    tags: ["engineering", "task", "task-9", "bug-fix", "logo"],
    infoboxData: { Task: "#9", Tool: "Replit", Version: "—" },
    content: `# Task #9 — Prevent Logo Skewing on Resize

## What & Why
When the browser window was actively resized, the SEVCO logo in the platform header would skew — stretching horizontally or vertically as the parent flex container changed dimensions. This created an unprofessional appearance during any viewport size change.

## Root Cause
The logo \`<img>\` element lacked an explicit \`aspect-ratio\` property. When the parent flex container resized, the browser's layout engine allowed the image to stretch in one dimension while the other was constrained, causing the skew effect. Task #8 fixed static sizing but not the dynamic resize behavior.

## What Was Fixed
- Added \`aspect-ratio: auto\` to the logo image element
- Set \`min-width\` and \`max-width\` constraints to prevent flex-based compression
- Applied \`flex-shrink: 0\` on the logo container to prevent the flex layout from compressing it during resize


## Technical Architecture
- **Component**: \`platform-header.tsx\` — logo container is a flex child in the header bar
- **CSS fix**: Added \`aspect-ratio: auto\`, \`flex-shrink: 0\`, and min/max-width constraints so the browser preserves proportions during dynamic resize events

## Files Changed
- \`client/src/components/platform-header.tsx\` — Logo container: flex-shrink-0, aspect-ratio constraints, width bounds

## Testing Notes
1. Open the platform at a wide viewport (1440px)
2. Slowly drag the browser window narrower — logo should scale down proportionally without any skew
3. Restore window to wide — logo should return to original proportions
4. Test at multiple intermediate sizes (800px, 600px) — logo should always maintain correct proportions

## Known Limitations / Out of Scope
- This fix targeted only the platform header logo; other image elements were not audited`,
  },
  {
    slug: "eng-task-10-platform-footer",
    title: "Task #10 — Platform Footer",
    summary: "Built the global platform footer with social media links, copyright notice, platform version display, and quick navigation links to key platform sections.",
    tags: ["engineering", "task", "task-10", "footer"],
    infoboxData: { Task: "#10", Tool: "Replit", Version: "—" },
    content: `# Task #10 — Platform Footer

## What & Why
The platform shell was missing a footer — an important element for any professional web platform. A proper footer provides persistent social links, copyright information, quick navigation, and the current platform version.

## What Was Built
- Global platform footer rendered on all pages below main content
- Social media icon links: X (Twitter), Instagram, YouTube, Discord, GitHub
- Copyright notice with dynamically computed current year
- Platform version number (later made dynamic in Task #36 via changelog API)
- Quick navigation links to key platform sections (Wiki, Store, Projects, Music, Services)
- Responsive layout that stacks vertically on mobile

## Technical Architecture
- **Component**: \`platform-footer.tsx\` — self-contained footer component rendered in App.tsx below the main route outlet
- **Layout**: CSS Grid with three columns (social links, nav links, copyright) collapsing to a single column via media query on mobile
- **Social links**: Rendered from a static array of \`{ href, icon, label }\` objects using icons from \`react-icons/si\`

## Files Changed
- \`client/src/components/platform-footer.tsx\` — New footer component with all sections
- \`client/src/App.tsx\` — Footer added to the main layout wrapper below all page content

## Testing Notes
1. Visit any page — footer should appear at the bottom
2. Click a social link — should open the correct social profile in a new tab
3. On mobile (375px) — footer should stack into a single column layout
4. Footer navigation links should navigate correctly within the platform

## Known Limitations / Out of Scope
- Dynamic footer sitemap (multi-column navigation links from DB) was added in Task #50
- Footer tagline editable via CMD was added in Task #59
- Dynamic social links management via CMD was added in Task #32`,
  },
  {
    slug: "eng-task-11-pre-publish-fixes",
    title: "Task #11 — Pre-Publish Fixes",
    summary: "Bundle of targeted fixes before the initial public launch: broken navigation links, leftover placeholder content, mobile responsiveness issues, and spacing inconsistencies across pages.",
    tags: ["engineering", "task", "task-11", "bug-fix", "polish"],
    infoboxData: { Task: "#11", Tool: "Replit", Version: "—" },
    content: `# Task #11 — Pre-Publish Fixes

## What & Why
Before the platform's initial public launch, a round of QA testing identified several blockers: broken navigation links, leftover placeholder/lorem ipsum content on public-facing pages, mobile layout overflow issues, and inconsistent spacing between sections.

## What Was Built (Fixed)
- Fixed broken navigation links across header and footer
- Removed all placeholder and lorem ipsum content from public-facing pages
- Improved mobile responsiveness on the store, wiki, and landing pages — no more horizontal overflow at 375px
- Fixed text truncation and overflow issues on narrow viewports
- Corrected inconsistent padding and spacing between page sections
- Verified all Stripe checkout redirect URLs were correctly configured

## Files Changed
- \`client/src/components/platform-header.tsx\` — Fixed nav link destinations
- \`client/src/components/platform-footer.tsx\` — Replaced placeholder social URLs with real links
- \`client/src/pages/landing.tsx\` — Removed placeholder text, finalized hero copy
- \`client/src/pages/store-page.tsx\` — Mobile layout fixes for the product grid
- \`client/src/pages/wiki-page.tsx\` — Responsive grid adjustments for smaller viewports


## Technical Architecture
- **Scope**: Cross-cutting fix bundle affecting multiple frontend components
- **Components touched**: Navigation links in \`platform-header.tsx\`, placeholder content cleanup across landing and store pages, responsive CSS adjustments in layout wrappers
- **Pattern**: Each fix was isolated to its own component file with no shared state changes

## Testing Notes
1. Navigate all header links — each should resolve to a real, working page
2. Check footer social links — each should open the correct SEVCO social profile
3. View the platform on a 375px mobile viewport — no content should be clipped or overflow horizontally
4. Verify the store shows correct product data (no placeholder product names or prices)

## Known Limitations / Out of Scope
- Deep accessibility audit (WCAG 2.1 compliance) was not performed in this task`,
  },
  {
    slug: "eng-task-12-stripe-checkout-cart",
    title: "Task #12 — Stripe Checkout & Cart",
    summary: "Implemented the full Stripe-powered checkout flow with cart management, Stripe Checkout session creation, and order persistence. Added the slide-out cart drawer accessible from any page.",
    tags: ["engineering", "task", "task-12", "stripe", "checkout", "store"],
    infoboxData: { Task: "#12", Tool: "Replit", Version: "—" },
    content: `# Task #12 — Stripe Checkout & Cart

## What & Why
The store needed a complete, production-ready checkout flow. This task implemented Stripe Checkout integration with a cart drawer, line item management, and proper success/cancel handling with order persistence in the database.

## What Was Built
- Cart state management with add/remove/update-quantity controls, persisted in React context
- Cart drawer (slide-out panel) accessible from the header cart icon on any page
- Stripe Checkout Session creation with all cart line items passed to Stripe
- Order record created in the DB with "pending" status on session creation
- Success page verifies Stripe session and marks order as "paid"
- Cancel page with a "Return to store" call to action
- Guest checkout support (no login required; session tracked via localStorage)

## Technical Architecture

### API Routes
\`\`\`
POST /api/checkout/create-session — auth optional — creates Stripe Checkout session,
  records pending order, returns {url: checkoutUrl}
GET /api/checkout/success?session_id=X — public — verifies Stripe session,
  marks order paid, returns order summary
GET /api/orders — admin — lists all orders with product details
PATCH /api/orders/:id/status — admin — updates order status
\`\`\`

### Key Design Decisions
- **Stripe Checkout (hosted page)**: Avoids building custom payment UI, reduces PCI compliance scope significantly.
- **Order created before payment**: Created as "pending" when session is started. On success callback, marked "paid". Abandoned checkouts remain as "pending" (no automatic cleanup).
- **Guest checkout via session ID**: Unauthenticated users get a UUID stored in localStorage to associate their cart and order.

## Environment Variables
- \`STRIPE_SECRET_KEY\` — Stripe API secret key (server-side only)
- \`VITE_STRIPE_PUBLIC_KEY\` — Stripe publishable key (frontend)

## Files Changed
- \`server/routes.ts\` — Checkout session creation, success verification, order listing
- \`server/storage.ts\` — createOrder, getOrder, updateOrderStatus methods
- \`server/stripeClient.ts\` — Stripe SDK initialization with secret key
- \`shared/schema.ts\` — Extended orders table (stripeSessionId, status, items as jsonb)
- \`client/src/components/cart-drawer.tsx\` — Full cart UI with quantity controls and checkout button
- \`client/src/pages/store-success-page.tsx\` — Post-payment success screen
- \`client/src/pages/store-cancel-page.tsx\` — Checkout cancelled page
- \`client/src/App.tsx\` — Cart context provider wrapping the app

## Testing Notes
1. Add products to cart — cart drawer should update with correct quantities and running total
2. Open checkout — Stripe-hosted page should list the correct items and prices
3. Use Stripe test card 4242 4242 4242 4242 (exp: any future date, CVV: any 3 digits) — should redirect to success page
4. Use decline test card 4000 0000 0000 0002 — should show Stripe-side error
5. Click cancel on the Stripe page — should redirect to the store cancel page

## Known Limitations / Out of Scope
- Webhook-based payment confirmation (more reliable than URL redirect) was not implemented
- Refunds are not managed within the platform
- Subscription billing is handled separately`,
  },
  {
    slug: "eng-task-13-platform-polish-changelog",
    title: "Task #13 — Platform Polish & Dashboard Changelog",
    summary: "Polish pass adding skeleton loading states to all major pages, improved error messages, typography/spacing consistency, and a changelog widget on the admin dashboard.",
    tags: ["engineering", "task", "task-13", "polish", "ux"],
    infoboxData: { Task: "#13", Tool: "Replit", Version: "—" },
    content: `# Task #13 — Platform Polish & Dashboard Changelog

## What & Why
After the initial feature wave, the platform needed a polish pass to improve perceived quality. Loading states were absent, error messages were generic, and typography/spacing was inconsistent across sections. This task addressed all of these systematically.

## What Was Built
- Skeleton loading states on all major pages: store product grid, projects listing, wiki category page, music page — using shadcn's Skeleton component
- Improved error messages throughout: 404 pages include context-aware descriptions, API errors display human-readable messages instead of error codes
- Typography consistency pass: standardized heading hierarchy (h1/h2/h3 sizes), consistent body text sizing and line height
- Spacing rhythm standardization: consistent use of 4/8/12/16/24/32/48px spacing units
- Dashboard changelog widget showing the 5 most recent platform changelog entries


## Technical Architecture
- **Dashboard changelog widget**: New \`RecentChangelog\` component on the dashboard page fetching from \`GET /api/changelog\` and rendering the latest 5 entries
- **Polish fixes**: Spacing, typography, and color consistency adjustments across platform-header, sidebar, and card components
- **API**: Existing changelog endpoint returns entries ordered by \`createdAt DESC\`

## Files Changed
- \`client/src/pages/store-page.tsx\` — Skeleton loading for product grid
- \`client/src/pages/projects-page.tsx\` — Skeleton loading for project cards
- \`client/src/pages/wiki-page.tsx\` — Skeleton loading for category cards
- \`client/src/pages/music-page.tsx\` — Skeleton loading for artist grid
- \`client/src/pages/dashboard.tsx\` — Changelog widget showing recent entries
- \`client/src/components/ui/skeleton.tsx\` — Skeleton component (shadcn)
- Multiple pages — Typography and spacing updates

## Testing Notes
1. Navigate to the store on a throttled network — skeleton cards should animate during load
2. Navigate to a non-existent product URL — 404 page should show a helpful message
3. Check the admin dashboard — changelog widget should show the latest 5 entries
4. Compare heading sizes across pages — h1 headings should be visually consistent

## Known Limitations / Out of Scope
- Full design system documentation was not created
- Dark mode skeleton contrast was not specifically addressed`,
  },
  {
    slug: "eng-task-14-fix-production-auth",
    title: "Task #14 — Fix Production Authentication",
    summary: "Fixed critical auth failures in production deployment: session cookies were not being set correctly over HTTPS due to missing secure/sameSite config and missing trust proxy setting.",
    tags: ["engineering", "task", "task-14", "bug-fix", "auth", "production"],
    infoboxData: { Task: "#14", Tool: "Replit", Version: "—" },
    content: `# Task #14 — Fix Production Authentication

## What & Why
After the first production deployment to Replit's hosting, users could not log in — sessions were not persisting and cookies were being rejected by the browser. Authentication worked perfectly in development, which meant the issue was production-specific.

## Root Cause Analysis
Four compounding issues were identified:
1. **\`secure\` cookie not set**: Session cookies required \`secure: true\` to be sent over HTTPS; without it, browsers on HTTPS sites rejected the cookie silently.
2. **Missing \`sameSite\` attribute**: Default browser behavior for cookies without \`sameSite\` blocks them in cross-site contexts (or varies by browser version).
3. **\`trust proxy\` not configured**: Replit's hosting puts Express behind a reverse proxy that terminates TLS. Without \`app.set("trust proxy", 1)\`, Express believed the request came in on HTTP, not HTTPS, so it refused to set a secure cookie.
4. **Database URL in session store**: The session store was using a hardcoded connection string rather than the \`DATABASE_URL\` environment variable, which differed between development and production.

## What Was Fixed
- Added \`app.set("trust proxy", 1)\` to Express app initialization
- Set \`cookie: { secure: true, sameSite: "lax" }\` conditionally based on \`NODE_ENV === "production"\`
- Confirmed session store reads \`process.env.DATABASE_URL\` for its connection

## Files Changed
- \`server/index.ts\` — Added trust proxy setting and environment-based cookie config
- \`server/auth.ts\` — Session cookie configuration: secure/sameSite based on NODE_ENV


## Technical Architecture
- **Auth stack**: Passport.js with \`passport-local\` strategy, sessions stored in PostgreSQL via \`connect-pg-simple\`
- **Root cause**: Session cookie \`secure\` flag was set to \`true\` unconditionally, but the Replit deployment proxy terminates TLS before reaching the Express server, so the cookie was never set. Fixed by trusting the proxy (\`app.set("trust proxy", 1)\`) and setting \`secure: "auto"\`
- **Session store**: \`connect-pg-simple\` uses the same DATABASE_URL as Drizzle ORM

## Testing Notes
1. Deploy the application to Replit production environment
2. Register a new account — should succeed and set the session cookie
3. Refresh the page — should remain logged in (cookie persists)
4. Open browser DevTools > Application > Cookies — confirm the session cookie has Secure and SameSite=Lax flags set

## Known Limitations / Out of Scope
- This fix assumes Replit's hosting acts as a single trusted reverse proxy
- Custom domain HTTPS certificate management is handled entirely by Replit infrastructure`,
  },
  {
    slug: "eng-task-15-sidebar-account-cleanup",
    title: "Task #15 — Sidebar & Account Cleanup",
    summary: "Cleaned up duplicate wiki sidebar links, reorganized sidebar category order, and added role-based visibility to the account dropdown so users only see links relevant to their role.",
    tags: ["engineering", "task", "task-15", "sidebar", "ux"],
    infoboxData: { Task: "#15", Tool: "Replit", Version: "—" },
    content: `# Task #15 — Sidebar & Account Cleanup

## What & Why
As features accumulated, the wiki sidebar gained duplicate navigation links and the account dropdown became cluttered with links irrelevant to most users' roles. This task cleaned up both, improving clarity and reducing cognitive load.

## What Was Fixed
- Removed 3 duplicate navigation links from the wiki sidebar that pointed to the same destinations
- Reorganized sidebar categories in logical reading order (General → Engineering → Guides → etc.)
- Account dropdown items gated by role:
  - Regular users: Profile, Account Settings, Sign Out
  - Staff+: above + Command Center link
  - Admin+: above + quick links to CMD sub-sections
- Fixed sidebar failing to collapse on mobile after selecting an item
- Removed commented-out dead code from both sidebar components


## Technical Architecture
- **Component**: \`sidebar.tsx\` — the collapsible sidebar uses shadcn's \`Sheet\` component on mobile and a fixed panel on desktop
- **Changes**: Removed redundant account-related menu items, consolidated profile/settings links, reordered nav items by usage frequency
- **State**: Sidebar open/close state managed via React context shared with the header hamburger button

## Files Changed
- \`client/src/components/app-sidebar.tsx\` — Removed duplicate links, reordered categories, fixed mobile collapse
- \`client/src/components/platform-header.tsx\` — Account dropdown role-gating

## Testing Notes
1. Log in as a regular user — Command Center link should NOT appear in the account dropdown
2. Log in as staff — Command Center link should appear
3. Check sidebar on mobile after clicking a wiki link — sidebar should auto-collapse
4. Verify no duplicate links appear anywhere in the sidebar

## Known Limitations / Out of Scope
- Full sidebar redesign with Lucide icons was implemented in later tasks`,
  },
  {
    slug: "eng-task-16-auth-copy-tweak",
    title: "Task #16 — Auth Copy Tweak",
    summary: "Updated login and registration page copy to match SEVCO's brand voice: new headings, subheadings, button labels, and more user-friendly error messages.",
    tags: ["engineering", "task", "task-16", "auth", "copy"],
    infoboxData: { Task: "#16", Tool: "Replit", Version: "—" },
    content: `# Task #16 — Auth Copy Tweak

## What & Why
The authentication page used generic placeholder copy ("Sign in to your account", "Create an account", "Submit") that didn't feel like the SEVCO brand. This task updated all text on the auth page to be more welcoming and on-brand.

## What Was Changed
- Login page heading: changed from generic "Sign in" to branded SEVCO welcome message
- Registration page heading: updated to reflect the SEVCO community aspect
- Button labels: "Submit" → "Sign In" and "Create Account" respectively
- Error messages: from technical strings to friendly, actionable guidance ("Wrong password — try again or use the forgot link")
- Description text updated to briefly explain what the platform is for new visitors
- Minor spacing adjustments to the auth form card


## Technical Architecture
- **Components**: \`auth-page.tsx\` — single page component handling both login and registration forms via a tab toggle
- **Changes**: Updated button labels, placeholder text, and validation error messages to be clearer and more consistent with the SEVCO brand voice
- **No API changes**: All modifications were frontend-only text/label updates

## Files Changed
- \`client/src/pages/auth-page.tsx\` — All display text: headings, subheadings, button labels, error messages

## Testing Notes
1. Visit /auth — new headings and subheadings should display
2. Trigger a login error (wrong password) — error message should use the updated friendly text
3. Toggle between login and register modes — both views should show updated copy
4. Error messages should be informative but not expose internal system details

## Known Limitations / Out of Scope
- Visual redesign of the auth page card layout was not in scope`,
  },
  {
    slug: "eng-task-17-auto-wiki-engineering-articles",
    title: "Task #17 — Auto Wiki Engineering Articles",
    summary: "Seeded the wiki with the initial set of Engineering category articles for Tasks #1–#16. Established the eng-task-{N}-{title} slug convention used for all future Engineering wiki articles.",
    tags: ["engineering", "task", "task-17", "wiki", "documentation"],
    infoboxData: { Task: "#17", Tool: "Replit", Version: "—" },
    content: `# Task #17 — Auto Wiki Engineering Articles

## What & Why
The Engineering wiki category was empty despite 16 tasks already completed. Without documentation, institutional knowledge was locked in commit messages and task files. This task seeded the wiki with articles for Tasks #1–#16 and established the documentation standard used going forward.

## What Was Built
- Published Engineering category wiki articles for Tasks #1 through #16
- Established the slug convention: \`eng-task-{N}-{short-title}\`
- Defined the standard infobox format: Task: "#N", Tool: "Replit", Version: "(changelog version or —)"
- Seeding implemented as a \`seedEngineeringArticles()\` function called during server startup (idempotent — skips existing slugs)

## Article Content Standard Established
Each article included:
- A summary of what was built and why
- Key technical notes (schema changes, API routes)
- Files changed list
- Infobox with task metadata


## Technical Architecture
- **Seed function**: \`seedEngineeringArticles()\` in \`server/routes.ts\` runs on server startup, inserting or updating wiki articles by slug
- **Schema**: Uses the \`articles\` table with \`categoryId\` pointing to the Engineering category, \`status: "published"\`, and \`infoboxData\` JSON column
- **Idempotency**: Checks for existing article by slug before inserting; updates content if already present

## Files Changed
- \`server/routes.ts\` — Added \`seedEngineeringArticles()\` function with article data for tasks 1–16

## Testing Notes
1. Visit /wiki and navigate to the Engineering category — articles for tasks 1–16 should be listed
2. Open an article and verify the infobox shows the correct task number, tool, and version
3. Verify slugs follow the eng-task-{N}-{title} pattern (e.g., eng-task-1-rbac-role-permission-system)

## Known Limitations / Out of Scope
- Articles were brief at initial seeding; this task (Task #90) substantially expanded them
- Articles for later tasks were added in batches: Task #42 (tasks 43–55), Task #56, and Task #90`,
  },
  {
    slug: "eng-task-18-store-analytics",
    title: "Task #18 — Store Analytics",
    summary: "Added a store analytics dashboard in Command Center showing total revenue, order counts by status, top-selling products, and order history with status management for admins.",
    tags: ["engineering", "task", "task-18", "store", "analytics"],
    infoboxData: { Task: "#18", Tool: "Replit", Version: "—" },
    content: `# Task #18 — Store Analytics

## What & Why
Store administrators needed visibility into sales performance without accessing the database directly. This task added a dedicated analytics section within CMD > Store showing key metrics and order management tools.

## What Was Built
- Summary stat cards: Total Revenue (all time), Total Orders, Pending Orders count, Completed Orders count
- Top products table: ranked by total orders, with revenue per product
- Full order history table with columns: Order ID, Customer, Items, Total, Status, Date
- Order status management: admins can change status (pending → processing → shipped → completed)
- Revenue by product category breakdown

## Technical Architecture

### API Routes
\`\`\`
GET /api/store/stats — admin+ — returns aggregated statistics:
  {totalRevenue, totalOrders, ordersByStatus: {pending, processing, shipped, completed},
   topProducts: [{name, count, revenue}], revenueByCategory: [{category, revenue}]}
GET /api/orders — admin+ — returns all orders with joined product details
PATCH /api/orders/:id/status — admin+ — updates order status
\`\`\`

### Frontend Additions
- Analytics section added to \`client/src/pages/command-store.tsx\` with tab navigation between Products and Analytics views

## Files Changed
- \`server/routes.ts\` — Store stats aggregation endpoint, order status update endpoint
- \`server/storage.ts\` — getStoreStats() method with aggregation queries, updateOrderStatus()
- \`client/src/pages/command-store.tsx\` — Analytics tab with summary cards and order table

## Testing Notes
1. Place a test order via Stripe test checkout
2. In CMD > Store > Analytics — total order count and revenue should increment
3. Mark an order as "Shipped" — status badge should update immediately in the table
4. Verify "Top Products" table sorts correctly by order count descending

## Known Limitations / Out of Scope
- Revenue over time charts (line/bar using Recharts) were not implemented; only aggregate totals shown
- Real-time order notifications are not implemented`,
  },
  {
    slug: "eng-task-19-projects-dropdown-style-fix",
    title: "Task #19 — Projects Dropdown Style Fix",
    summary: "Fixed visual issues in the Projects mega-menu dropdown: incorrect card sizing, text overflow, z-index layering problems, and inconsistent border/shadow styling.",
    tags: ["engineering", "task", "task-19", "bug-fix", "navigation"],
    infoboxData: { Task: "#19", Tool: "Replit", Version: "—" },
    content: `# Task #19 — Projects Dropdown Style Fix

## What & Why
The Projects mega-menu dropdown had accumulated visual issues after several feature additions: project cards were incorrectly sized, project names with longer titles overflowed their containers, and the dropdown had inconsistent styling compared to the Services and Music dropdowns.

## What Was Fixed
- Project card dimensions standardized to match the established mega-menu card size (matching Services and Music dropdowns)
- Text overflow fixed: long project names now truncate with ellipsis; full name visible in browser tooltip via \`title\` attribute
- Dropdown shadow and border updated to match the platform's established mega-menu style
- Z-index corrected to ensure the dropdown appears above other page elements (hero images, cards)


## Technical Architecture
- **Component**: \`mega-menu.tsx\` — the Projects dropdown is a mega-menu panel triggered by hover/click on the nav item
- **CSS fix**: Dropdown panel z-index, background color, and border-radius adjusted; item hover states updated to use consistent \`bg-accent\` styling
- **Positioning**: Dropdown uses absolute positioning relative to the nav bar with a calculated top offset

## Files Changed
- \`client/src/components/platform-header.tsx\` — Projects dropdown: card sizing (h-24, w-full), text truncation (truncate class), shadow/border standardization, z-index correction

## Testing Notes
1. Hover over "Projects" in the nav — dropdown should appear cleanly above other content
2. Compare card sizes between Projects and Services dropdowns — should be visually consistent
3. Hover over a project with a long name — name should truncate with "...", full name visible on hover as tooltip
4. Test on different pages (e.g., the landing page with a hero image) — dropdown should always appear on top

## Known Limitations / Out of Scope
- The Projects mega-menu was substantially redesigned again in Task #28`,
  },
  {
    slug: "eng-task-20-command-center",
    title: "Task #20 — Command Center: Sidebar + Store Management",
    summary: "Built the Command Center (CMD) — the unified admin hub — with a collapsible sidebar navigation, overview dashboard with platform stats, and comprehensive store product management.",
    tags: ["engineering", "task", "task-20", "command-center", "admin"],
    infoboxData: { Task: "#20", Tool: "Replit", Version: "—" },
    content: `# Task #20 — Command Center: Sidebar + Store Management

## What & Why
Admin tools were scattered across individual pages without a unified interface. This task built the Command Center (CMD) at \`/command\` as the central admin hub, with a sidebar navigation system and comprehensive store management as its first module.

## What Was Built
- Command Center at \`/command\` requiring \`staff+\` role minimum
- Collapsible CMD sidebar with icon-only collapse mode
- CMD Overview dashboard: user count, product count, order count, article count, latest changelog entry
- Store management module: view all products, create/edit/delete, toggle enabled state, bulk management

## Technical Architecture

### API Routes
\`\`\`
GET /api/command/summary — admin+ — returns platform summary stats:
  {userCount, productCount, orderCount, articleCount, latestChangelog}
\`\`\`

### Frontend Additions
- \`client/src/pages/command-overview.tsx\` — CMD landing dashboard with stat cards
- \`client/src/pages/command-store.tsx\` — Full product management CRUD
- \`client/src/components/command-sidebar.tsx\` — CMD sidebar with collapsible behavior

## Files Changed
- \`client/src/App.tsx\` — Added /command/* routes with CMD layout (sidebar + content area)
- \`client/src/components/command-sidebar.tsx\` — CMD sidebar navigation
- \`client/src/pages/command-overview.tsx\` — Overview dashboard
- \`client/src/pages/command-store.tsx\` — Store management
- \`server/routes.ts\` — Command summary endpoint

## Testing Notes
1. Log in as admin, navigate to /command — overview dashboard should load with correct stats
2. Attempt /command as a regular user — should redirect to home or show 403
3. Click the sidebar collapse toggle — should shrink to icon-only mode with tooltips visible
4. Create a new product in CMD > Store — should appear in the public store catalog

## Known Limitations / Out of Scope
- The CMD sidebar was restructured into grouped sections in Task #62
- CMD was substantially expanded across Tasks #40, #65, #66, #68, #69, #77, #80`,
  },
  {
    slug: "eng-task-21-email-verification",
    title: "Task #21 — Email Verification",
    summary: "Added email verification to the registration flow using Resend. Users must verify their email before logging in. Verification token stored in the DB with 24-hour expiry.",
    tags: ["engineering", "task", "task-21", "auth", "email", "resend"],
    infoboxData: { Task: "#21", Tool: "Replit", Version: "—" },
    content: `# Task #21 — Email Verification

## What & Why
Without email verification, anyone could register with a fake email address, cluttering the user base with unverifiable accounts. This task added email verification to the registration flow, requiring users to confirm their email before accessing the platform.

## What Was Built
- Verification token generated on registration (UUID, expires in 24 hours)
- Verification email sent via Resend with a tokenized link to \`/verify-email?token=X\`
- \`/verify-email\` page that validates the token and marks the user as verified
- Unverified users blocked from logging in with a clear "check your email" message
- \`isEmailVerified\` and token columns added to users table

## Technical Architecture

### Schema Additions
\`\`\`
users table additions:
- isEmailVerified (boolean default false)
- emailVerificationToken (text nullable)
- emailVerificationTokenExpiresAt (timestamp nullable)
\`\`\`

### API Routes
\`\`\`
POST /api/auth/register — updated: generates token, sends verification email via Resend
GET /api/auth/verify-email?token=X — public — validates token, marks user verified, redirects
POST /api/auth/resend-verification — public — resends verification email (added in Task #87)
\`\`\`

### Notable Decisions
- **Resend integration**: Uses Replit's built-in Resend connector rather than managing API keys manually.
- **24-hour token expiry**: Balances security (short enough to limit window for token theft) with usability (long enough that users can check email the next morning).
- **Login blocked for unverified users**: Rather than allowing access with a warning banner, unverified users are completely blocked. This ensures data integrity but requires Resend to be configured correctly.

## Environment Variables
- \`RESEND_API_KEY\` — via Replit Resend integration

## Files Changed
- \`shared/schema.ts\` — Email verification columns on users table
- \`server/auth.ts\` — Token generation on registration, verification check on login
- \`server/routes.ts\` — Verify email route
- \`server/emailClient.ts\` — sendVerificationEmail() using Resend
- \`client/src/pages/verify-email-page.tsx\` — Email verification landing page
- \`client/src/pages/auth-page.tsx\` — "Check your email" state after registration

## Testing Notes
1. Register with a real email address — should receive verification email within 60 seconds
2. Click the verification link — should be marked verified and redirected to login
3. Attempt to log in without verifying — should be blocked with "please verify your email" message
4. Wait 25 hours after registering without verifying — token should be expired

## Known Limitations / Out of Scope
- "Resend verification email" for expired tokens was added in Task #87
- Email base URL for verification links pointed to dev domains in production — fixed in Task #83`,
  },
  {
    slug: "eng-task-22-public-access-mega-menu",
    title: "Task #22 — Public Access + Mega-Menu Navigation",
    summary: "Opened key pages to unauthenticated visitors and launched the mega-menu navigation system with rich dropdown panels for Projects, Music, Store, Services, and Wiki.",
    tags: ["engineering", "task", "task-22", "navigation", "public-access"],
    infoboxData: { Task: "#22", Tool: "Replit", Version: "—" },
    content: `# Task #22 — Public Access + Mega-Menu Navigation

## What & Why
The platform was fully gated behind authentication for all pages, which prevented public discovery and made it impossible for visitors to evaluate SEVCO's offerings. This task opened appropriate pages to the public and launched the mega-menu navigation system.

## What Was Built
- Public (no-auth) access enabled for: /, /wiki, /store, /projects, /music, /services, /jobs, /contact, /about
- Mega-menu navigation with rich dropdown panels for Projects, Music, Store, Services, and Wiki sections
- Each dropdown panel shows a live-loaded grid of recent or featured items from the API
- Mobile hamburger menu with the same section structure, using a Radix UI Sheet component
- "Sign in" / "Join SEVCO" CTAs for unauthenticated visitors in the nav bar
- Auth-gated nav items (Dashboard, Command Center, Profile) hidden when not logged in
- Authenticated users see a user avatar/menu instead of sign-in buttons

## Technical Architecture
- Route-level auth guards in \`App.tsx\` updated to allow public access for the appropriate routes
- \`client/src/components/platform-header.tsx\` — Complete rewrite of the navigation to support mega-menu dropdowns and mobile menu
- No new API routes needed; mega-menu content loaded via existing public endpoints

## Files Changed
- \`client/src/App.tsx\` — Updated route guards (removed auth requirement from public routes)
- \`client/src/components/platform-header.tsx\` — Full mega-menu implementation with mobile menu

## Testing Notes
1. Open a private/incognito browser — visit /wiki, /store, /projects — all should load without login prompt
2. Hover over a nav section item — dropdown should appear and load real content from the API
3. Test on mobile at 375px — hamburger icon should open a sheet menu with all sections accessible
4. Verify Command Center link does NOT appear in the nav when not logged in
5. Log in — nav should update to show the user avatar and authenticated items

## Known Limitations / Out of Scope
- Platform search overlay was added in Task #47
- Tools dropdown menu item was added in Task #51`,
  },
  {
    slug: "eng-task-23-home-page-contact-page",
    title: "Task #23 — Home Page Redesign + Contact Page",
    summary: "Full redesign of the home landing page with marketing layout. Added a Contact page with form submission via Resend email. Introduced Profile pages, Jobs board, and policy wiki pages.",
    tags: ["engineering", "task", "task-23", "home", "contact", "resend"],
    infoboxData: { Task: "#23", Tool: "Replit", Version: "1.0.0" },
    content: `# Task #23 — Home Page Redesign + Contact Page

## What & Why
The initial landing page was a minimal placeholder that didn't communicate SEVCO's value proposition to new visitors. This task delivered a marketing-quality redesign of the home page, added a Contact page with email delivery, and introduced Profile pages and a Jobs board.

## What Was Built

### Home Page Redesign
- Full-width hero section with headline, subheadline, and dual CTA buttons (primary + secondary)
- Platform feature highlights section with icon cards for key offerings
- Previews of the Music, Projects, and Store sections with live data
- "About SEVCO" teaser section leading to the About page
- Responsive layout with mobile-first implementation

### Contact Page
- Contact form at /contact: name, email, subject (Support/Business Inquiry/Press/Other), message
- Form submission sends email to admin via Resend with all fields
- Success/error state feedback to the user after submission
- Accessible form with proper labels and ARIA attributes

### Profile Pages
- User profiles at /profile/:username showing avatar, display name, bio, and authored articles
- Linked from the user avatar in the navigation header

### Jobs Board
- /jobs listing page with job cards (title, type, location, status)
- Individual job detail pages with full description and requirements
- "Apply" button linking to the application form

## Technical Architecture

### Schema Additions
\`\`\`
jobs table: id (serial PK), title (text), slug (text unique), description (text),
  requirements (text nullable), location (text), type (text: full-time|part-time|contract|remote),
  status (text: open|closed), displayOrder (integer), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
POST /api/contact — public — validates form, sends email via Resend, returns success/error
GET /api/jobs — public — returns all open job listings
GET /api/jobs/:slug — public — returns single job detail
POST /api/jobs — admin — creates job listing
PATCH /api/jobs/:slug — admin — updates listing
\`\`\`

## Environment Variables
- \`RESEND_API_KEY\` — Required for contact form email delivery (via Replit Resend integration)

## Files Changed
- \`shared/schema.ts\` — jobs table
- \`server/routes.ts\` — Contact form route, jobs CRUD routes
- \`server/emailClient.ts\` — sendContactEmail() function using Resend
- \`client/src/pages/landing.tsx\` — Full home page redesign
- \`client/src/pages/contact-page.tsx\` — Contact form page
- \`client/src/pages/profile-page.tsx\` — User profile display
- \`client/src/pages/jobs-page.tsx\` — Jobs listing
- \`client/src/App.tsx\` — New routes: /contact, /profile/:username, /jobs/:slug

## Testing Notes
1. Visit the home page — hero, features, and section previews should render with real data
2. Submit the contact form with a valid email — admin should receive the email via Resend
3. Visit /profile/username — avatar, name, and bio should display
4. Visit /jobs — open job listings should display with correct types and locations

## Known Limitations / Out of Scope
- Contact form submissions were not stored in the DB until Task #65 (Support Tab)
- Jobs applications form and tracking were added in Task #25`,
  },
  {
    slug: "eng-task-24-profile-page",
    title: "Task #24 — Profile Page with MySpace-Style Customization",
    summary: "Enhanced user profile pages with MySpace-inspired customization: background image URL, accent color, extended bio, and social links. Users can personalize their public-facing profile.",
    tags: ["engineering", "task", "task-24", "profile", "customization"],
    infoboxData: { Task: "#24", Tool: "Replit", Version: "—" },
    content: `# Task #24 — Profile Page with MySpace-Style Customization

## What & Why
User profiles were basic display pages showing name and avatar. Inspired by early social web platforms like MySpace, this task added meaningful personalization: a background image, accent color, extended bio, and social links — giving each SEVCO member a distinctive public presence.

## What Was Built
- Profile background image URL field — full-width banner visible behind profile header
- Profile accent color picker — customizes the profile card's highlight/border color
- Extended bio field (multi-paragraph, longer than a username display name)
- Social links section: X, Instagram, YouTube, GitHub, Discord
- Profile edit panel accessible from the user's own profile page
- Avatar display with article count and member-since date statistics

## Technical Architecture

### Schema Additions
\`\`\`
users table additions:
- profileBgImageUrl (text nullable) — URL for profile background image
- accentColor (text nullable) — hex color for profile accent styling
- bio (text nullable) — extended multi-paragraph bio text
- socialLinks (jsonb nullable) — {twitter, instagram, youtube, github, discord}
\`\`\`

### API Routes
\`\`\`
GET /api/profile/:username — public — returns user profile data, authored articles, and stats
PATCH /api/profile — auth required — updates own profile (bg image, accent, bio, social links)
\`\`\`

### Frontend Additions
- Enhanced \`client/src/pages/profile-page.tsx\` — Background image, accent color, social link icons
- Profile edit panel (inline form or sheet) for updating profile settings

## Files Changed
- \`shared/schema.ts\` — profileBgImageUrl, accentColor, bio, socialLinks columns on users
- \`server/routes.ts\` — Profile GET and PATCH endpoints
- \`server/storage.ts\` — updateUserProfile() method
- \`client/src/pages/profile-page.tsx\` — Full profile with customization display and edit panel

## Testing Notes
1. Log in and visit your own profile — "Edit Profile" button should appear
2. Set a background image URL — should render as a wide banner behind profile info
3. Set an accent color — profile card border/highlight should change to that color
4. Add social links — icon links should appear below the bio section
5. Visit another user's profile as a different user — edit button should NOT appear

## Known Limitations / Out of Scope
- Profile image upload (file upload vs URL) was added in Task #57 (Supabase Storage)
- Profile banner image upload was added in Task #29`,
  },
  {
    slug: "eng-task-25-jobs-board",
    title: "Task #25 — Jobs Board — Listings, Details & Applications",
    summary: "Built a full jobs board with listing page, individual job detail pages with application forms, application tracking in the DB, and staff-facing application review in CMD.",
    tags: ["engineering", "task", "task-25", "jobs"],
    infoboxData: { Task: "#25", Tool: "Replit", Version: "—" },
    content: `# Task #25 — Jobs Board — Listings, Details & Applications

## What & Why
SEVCO needed a way to post job openings and collect applications in a structured, trackable way. This task built a full jobs board end-to-end: public listing, individual job pages with application forms, and a staff-facing application review interface.

## What Was Built
- /jobs listing page with job cards: title, type badge (Full-time/Contract/Remote), location, status
- Individual job pages at /jobs/:slug with full description, requirements, and "Apply" button
- Application form: applicant name, email, resume URL, cover letter textarea
- Application records stored in DB with timestamps
- CMD job management: create, edit, close job listings
- Application review in CMD: filter by job, update status (pending → reviewed → accepted/rejected)

## Technical Architecture

### Schema Additions
\`\`\`
job_applications table: id (serial PK), jobId (integer FK), applicantName (text),
  applicantEmail (text), resumeUrl (text nullable), coverLetter (text nullable),
  status (text: pending | reviewed | accepted | rejected), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/jobs — public — returns open job listings
GET /api/jobs/:slug — public — returns single job with full detail
POST /api/jobs — admin — creates job listing
PATCH /api/jobs/:slug — admin — updates listing (close, edit fields)
POST /api/jobs/:slug/apply — public — submits job application
GET /api/jobs/:slug/applications — staff+ — returns applications for that job
PATCH /api/job-applications/:id — staff+ — updates application status
\`\`\`

### Frontend Additions
- \`client/src/pages/jobs-page.tsx\` — Jobs listing with filter by type
- \`client/src/pages/job-detail.tsx\` — Individual job detail with application form
- \`client/src/pages/command-jobs.tsx\` — CMD job and application management

## Files Changed
- \`shared/schema.ts\` — job_applications table
- \`server/routes.ts\` — Jobs and application CRUD routes
- \`server/storage.ts\` — Job/application CRUD methods
- \`client/src/pages/jobs-page.tsx\` — Jobs listing
- \`client/src/pages/job-detail.tsx\` — Job detail and application form
- \`client/src/pages/command-jobs.tsx\` — CMD management interface

## Testing Notes
1. Visit /jobs — open positions should list with type badges and location
2. Click a job — detail page with description, requirements, and Apply form should display
3. Submit an application — should appear in CMD > Jobs > Applications
4. In CMD, close a job — should no longer appear on the public /jobs page
5. Update an application status — status badge should update in the review table

## Known Limitations / Out of Scope
- Email notification to the applicant on status change was not implemented
- Resume file upload (instead of URL) was not added in this task`,
  },
  {
    slug: "eng-task-26-services-page",
    title: "Task #26 — Services Page + Mega-Menu",
    summary: "Built the Services page with category-filtered service listings and a Services mega-menu dropdown in the navigation. Staff can manage services via CMD.",
    tags: ["engineering", "task", "task-26", "services", "navigation"],
    infoboxData: { Task: "#26", Tool: "Replit", Version: "—" },
    content: `# Task #26 — Services Page + Mega-Menu

## What & Why
SEVCO offers professional services across multiple categories. Without a dedicated page, potential clients had no way to discover these offerings. This task built the Services page and integrated it into the navigation mega-menu.

## What Was Built
- /services listing page with service cards grouped by category
- Category filter pills at the top (All, Engineering, Design, Marketing, Operations, Sales, Support)
- Services mega-menu dropdown in the navigation showing services grouped by category in columns
- Individual service detail cards with name, description, and "Inquire" CTA
- Staff-managed service CRUD in CMD: create, edit, delete, and toggle services
- "Featured" flag for services to highlight top offerings

## Technical Architecture

### Schema Additions
\`\`\`
services table: id (serial PK), name (text), slug (text unique), description (text),
  category (text), imageUrl (text nullable), icon (text nullable), price (text nullable),
  featured (boolean default false), enabled (boolean default true),
  displayOrder (integer), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/services — public — returns all enabled services, supports ?category= filter
GET /api/services/:slug — public — returns service detail
POST /api/services — staff+ — creates service
PATCH /api/services/:id — staff+ — updates service
DELETE /api/services/:id — staff+ — removes service
\`\`\`

### Frontend Additions
- \`client/src/pages/services-listing.tsx\` — Services listing with category filter
- \`client/src/pages/command-services.tsx\` — Admin service management
- Updated \`client/src/components/platform-header.tsx\` — Services mega-menu dropdown with column layout

## Files Changed
- \`shared/schema.ts\` — services table
- \`server/routes.ts\` — Services API routes
- \`server/storage.ts\` — Service CRUD methods
- \`client/src/pages/services-listing.tsx\` — Services page
- \`client/src/pages/command-services.tsx\` — CMD management
- \`client/src/components/platform-header.tsx\` — Services dropdown

## Testing Notes
1. Visit /services — service cards should display grouped by category
2. Click a category filter — only services in that category should show
3. Hover "Services" in the nav — dropdown should show services in column layout
4. In CMD > Services, create a new service — should appear on the services page immediately

## Known Limitations / Out of Scope
- Service categories were reorganized in Task #74 (Technology, Creative, Marketing, Business, Media, Support)
- Service icons were made editable via CMD in Task #54
- Infrastructure services (Hosting, Domains) were added to the services page in Task #59`,
  },
  {
    slug: "eng-task-27-music-expansion",
    title: "Task #27 — Music Expansion — SEVCO RECORDS, Listen, Playlists, Submit",
    summary: "Expanded SEVCO Records with playlist management, the Listen page for streaming links, a music submission workflow, and a persistent global Spotify player bar. Admin social link management added to CMD.",
    tags: ["engineering", "task", "task-27", "music", "playlists"],
    infoboxData: { Task: "#27", Tool: "Replit", Version: "1.1.0" },
    content: `# Task #27 — Music Expansion — SEVCO RECORDS, Listen, Playlists, Submit

## What & Why
The initial Music page was a static artist directory. This task transformed SEVCO Records into a full music platform with playlist management, a streaming discovery hub (the Listen page), a demo submission workflow, and a persistent Spotify embed player.

## What Was Built
- **Listen Page** (/listen): Hub for following SEVCO Records across streaming platforms (Spotify, Apple Music, YouTube Music) and social profiles (X, Instagram, TikTok)
- **Playlists**: Staff can create and manage playlists; playlists appear on the music page with Spotify embed links
- **Music Submissions**: Public form for demo submissions; staff can review, accept, and respond from CMD Music tab
- **Global Spotify Player Bar**: Persistent mini-player at the bottom of all pages using Spotify iFrame embed
- **Admin Social Links for Listen Page**: Staff can configure which streaming/social links appear on the Listen page from CMD, stored in the platform_social_links table with a showOnListen field

## Technical Architecture

### Schema Additions
\`\`\`
playlists table: id (serial PK), name (text), description (text nullable),
  coverUrl (text nullable), spotifyUrl (text nullable), displayOrder (integer),
  enabled (boolean default true), createdAt (timestamp)
platform_social_links addition: showOnListen (boolean default false)
\`\`\`

### API Routes
\`\`\`
GET /api/playlists — public — returns all enabled playlists ordered by displayOrder
POST /api/playlists — staff+ — creates playlist
PATCH /api/playlists/:id — staff+ — updates playlist (name, spotifyUrl, cover, enabled, order)
DELETE /api/playlists/:id — staff+ — removes playlist
GET /api/social-links?showOnListen=true — public — returns listen-page links only
GET /api/music/submissions — staff+ — returns all submissions with status filter
PATCH /api/music/submissions/:id — staff+ — updates submission status and staff notes
\`\`\`

### Frontend Additions
- \`client/src/pages/listen-page.tsx\` — Streaming hub with platform links grid
- Enhanced \`client/src/pages/music-page.tsx\` — Playlists section with embedded Spotify links
- \`client/src/components/music-player-bar.tsx\` — Persistent bottom Spotify player bar

## Files Changed
- \`shared/schema.ts\` — playlists table, showOnListen on platform_social_links
- \`server/routes.ts\` — Playlist CRUD, listen links filter
- \`server/storage.ts\` — Playlist CRUD, migrateSocialLinksShowOnListen migration function
- \`client/src/pages/listen-page.tsx\` — Listen hub page
- \`client/src/pages/music-page.tsx\` — Playlists section
- \`client/src/components/music-player-bar.tsx\` — Global bottom player
- \`client/src/App.tsx\` — Player bar added to root layout

## Testing Notes
1. Visit /listen — streaming platform links should display in a grid
2. Visit /music — playlists section should show enabled playlists with Spotify embed links
3. Submit a demo via the form — should appear in CMD Music > Submissions with "pending" status
4. Scroll to the bottom of any page — global Spotify player bar should be visible

## Known Limitations / Out of Scope
- Full Spotify Web API integration (follower counts, playlist sync, OAuth) was added in Task #55`,
  },
  {
    slug: "eng-task-28-projects-megamenu-marketing",
    title: "Task #28 — Projects Mega-Menu + Project & Service Marketing Pages",
    summary: "Redesigned the Projects mega-menu dropdown with rich project cards. Added dedicated marketing landing pages for individual projects and services with hero sections and feature highlights.",
    tags: ["engineering", "task", "task-28", "projects", "marketing"],
    infoboxData: { Task: "#28", Tool: "Replit", Version: "—" },
    content: `# Task #28 — Projects Mega-Menu + Project & Service Marketing Pages

## What & Why
The Projects mega-menu was a basic text list, and project/service detail pages used a generic layout that didn't showcase each venture effectively. This task delivered a redesigned Projects mega-menu with rich cards, and marketing-quality detail pages for projects and services.

## What Was Built
- Redesigned Projects mega-menu dropdown with project cards: image thumbnail, name, type badge, status indicator
- "Featured" project prominently highlighted in the dropdown
- "Browse all projects" footer link at the bottom of the dropdown
- Project marketing pages: custom-styled layouts with hero image, full description, feature list, and CTAs
- Service marketing pages: dedicated pages with hero section, feature highlights, and inquiry CTA
- Both project and service detail pages now pull all their content from the database

## Technical Architecture
- No new DB tables; content driven by existing projects and services tables
- \`client/src/components/platform-header.tsx\` — Projects dropdown with rich card layout
- \`client/src/pages/project-detail.tsx\` — Enhanced marketing-style project layout
- Optional: \`client/src/pages/service-detail.tsx\` if service details warranted a separate page

## Files Changed
- \`client/src/components/platform-header.tsx\` — Projects mega-menu redesign with image cards
- \`client/src/pages/project-detail.tsx\` — Marketing-quality project page layout
- \`server/routes.ts\` — Projects and services queries enhanced for marketing detail data

## Testing Notes
1. Hover "Projects" in the nav — rich cards with images and status badges should display
2. Click a project from the dropdown — navigate to its marketing-style detail page
3. Verify the featured project (if any) is visually distinct in the dropdown
4. Check mobile menu — Projects section should be accessible in the hamburger menu

## Known Limitations / Out of Scope
- Further updates to the projects mega-menu were made as new projects were added`,
  },
  {
    slug: "eng-task-29-profile-user-enhancements",
    title: "Task #29 — Profile & User Admin Enhancements",
    summary: "Added a 'My Profile' link to the user dropdown, banner image editing on profile pages, and an admin username-change tool in CMD > Users.",
    tags: ["engineering", "task", "task-29", "profile", "admin", "users"],
    infoboxData: { Task: "#29", Tool: "Replit", Version: "—" },
    content: `# Task #29 — Profile & User Admin Enhancements

## What & Why
Three targeted profile improvements: users needed quick navigation to their own profile, a way to set a banner background image on their profile page, and admins needed the ability to change any user's username from the Command Center without direct database access.

## What Was Built
- "My Profile" link added to the authenticated user dropdown menu in the platform header
- Profile banner image editing: users can set a \`bannerImageUrl\` that displays as a full-width header behind their profile info
- Admin username change in CMD > Users: a "Change Username" dialog per user row; updates username with uniqueness enforcement

## Technical Architecture

### Schema Additions
\`\`\`
users table addition:
- bannerImageUrl (text nullable) — URL for the profile page header/banner image
\`\`\`

### API Routes
\`\`\`
PATCH /api/user — auth required — updated to accept bannerImageUrl in request body
PATCH /api/admin/users/:id/username — admin — changes a user's username, enforces uniqueness
\`\`\`

### Frontend Changes
- \`client/src/components/platform-header.tsx\` — "My Profile" link added to authenticated user dropdown
- \`client/src/pages/profile-page.tsx\` — Banner image rendered as full-width header; "Edit Banner" button for own profile
- \`client/src/pages/command-users.tsx\` — "Change Username" action in user row options menu

## Files Changed
- \`shared/schema.ts\` — bannerImageUrl column on users table
- \`server/routes.ts\` — bannerImageUrl in PATCH /api/user; new admin username change endpoint
- \`server/storage.ts\` — updateUser extended for bannerImageUrl; changeUsername() method
- \`client/src/components/platform-header.tsx\` — "My Profile" link in dropdown
- \`client/src/pages/profile-page.tsx\` — Banner image display and edit UI
- \`client/src/pages/command-users.tsx\` — Username change dialog

## Testing Notes
1. Log in — user dropdown should contain a "My Profile" link navigating to /profile/username
2. On your own profile page, set a banner image URL — should render as a wide header image
3. As admin in CMD > Users, click Change Username on any user — dialog should appear
4. Try changing to an already-taken username — should show a uniqueness validation error

## Known Limitations / Out of Scope
- Profile banner image file upload (vs URL) was added in Task #57 (Supabase Storage)`,
  },
];

// Generate articles for tasks 30-55 (existing stubs that need expansion)
const REMAINING_STUBS: ArticleData[] = [
  {
    slug: "eng-task-30-bug-fixes-quick-wins",
    title: "Task #30 — Bug Fixes & Quick UI Wins",
    summary: "Bundle of bug fixes and quick UI improvements addressing issues found after the first major feature wave. Includes navigation fixes, form validation improvements, and visual polish.",
    tags: ["engineering", "task", "task-30", "bug-fix"],
    infoboxData: { Task: "#30", Tool: "Replit", Version: "—" },
    content: `# Task #30 — Bug Fixes & Quick UI Wins

## What & Why
After the first major wave of features (Tasks #1–#29), several bugs and quick-win UI improvements were identified. This task addressed them as a bundle to keep the platform stable.

## What Was Fixed / Built
- Navigation link fixes: corrected several header links pointing to wrong routes
- Form validation improvements: better error messages on the contact form, auth form, and application form
- Mobile responsiveness fixes on the music page and projects page
- Loading state improvements for slower connections
- Fixed wiki article editor not saving correctly under certain conditions
- Visual consistency fixes: button sizing, card spacing, and heading weights

## Files Changed
- \`client/src/components/platform-header.tsx\` — Nav link destination corrections
- \`client/src/pages/contact-page.tsx\` — Improved form validation messages
- \`client/src/pages/music-page.tsx\` — Mobile layout fixes
- \`client/src/pages/projects-page.tsx\` — Mobile layout fixes
- \`client/src/pages/article-editor.tsx\` — Save reliability fix


## Technical Architecture
- **Scope**: Multi-component fix bundle — no architectural changes, only targeted CSS and logic fixes
- **Components affected**: Product cards in store, sidebar navigation items, profile page layout, landing page hero section
- **Pattern**: Each fix addressed a specific visual or behavioral regression without touching shared state or API routes

## Testing Notes
1. Navigate all header links — all should resolve to the correct pages
2. Submit the contact form with an invalid email — should show a clear validation error
3. Test the music and projects pages on a 375px mobile viewport — no layout overflow

## Known Limitations / Out of Scope
- This task addressed known issues; comprehensive regression testing was not performed`,
  },
  {
    slug: "eng-task-31-profile-user-enhancements",
    title: "Task #31 — Profile & User Admin Enhancements",
    summary: "Enhanced CMD user management with better filtering, role change confirmation dialogs, and improved user detail display. Profile pages gained article count and join date statistics.",
    tags: ["engineering", "task", "task-31", "profile", "admin"],
    infoboxData: { Task: "#31", Tool: "Replit", Version: "—" },
    content: `# Task #31 — Profile & User Admin Enhancements

## What & Why
CMD > Users needed better tools for managing a growing user base, and profile pages needed richer statistics to make them more meaningful.

## What Was Built
- CMD > Users: search/filter users by role, username, or email
- Role change with a confirmation dialog to prevent accidental promotions/demotions
- User detail panel (slide-out or expanded row) showing user stats
- Profile pages: article count, join date, and last active indicators
- Admin "impersonate" view link (navigate to a user's profile as if you were them)

## Technical Architecture

### API Routes Enhanced
\`\`\`
GET /api/admin/users?role=X&search=Y — admin — filtered user listing
GET /api/admin/users/:id — admin — returns user with stats (article count, last active)
PATCH /api/admin/users/:id/role — admin — updates user role with validation
\`\`\`

## Files Changed
- \`server/routes.ts\` — User filtering, role change with validation
- \`server/storage.ts\` — getUsers() with filter params, getUserStats()
- \`client/src/pages/command-users.tsx\` — Search/filter, role change dialog, user detail panel
- \`client/src/pages/profile-page.tsx\` — Statistics display (article count, join date)

## Testing Notes
1. In CMD > Users, search for a username — results should filter in real time
2. Change a user's role — confirmation dialog should appear before the change is applied
3. Visit a user's profile — article count and join date should display correctly

## Known Limitations / Out of Scope
- User activity tracking beyond last login is not implemented`,
  },
  {
    slug: "eng-task-32-footer-social-links-admin",
    title: "Task #32 — Footer Redesign & Social Links Admin",
    summary: "Redesigned the platform footer with a multi-column layout and made social links manageable from CMD > Social Links. Staff can add, edit, and reorder social links without a code change.",
    tags: ["engineering", "task", "task-32", "footer", "social-links", "admin"],
    infoboxData: { Task: "#32", Tool: "Replit", Version: "—" },
    content: `# Task #32 — Footer Redesign & Social Links Admin

## What & Why
The platform footer had hardcoded social links that required a code change to update. As SEVCO's social presence grew, staff needed the ability to manage links from CMD without developer involvement.

## What Was Built
- Footer redesigned with a cleaner multi-column layout: brand section, quick navigation links, and social media links
- Social links stored in the \`platform_social_links\` table and loaded dynamically at runtime
- CMD Social Links management page: add, edit, reorder, and toggle visibility of social links
- Platform footer reads social links from the API and renders them with appropriate icons
- Support for social platforms: X (Twitter), Instagram, YouTube, Discord, GitHub, Facebook, LinkedIn, TikTok, Twitch

## Technical Architecture

### Schema Additions
\`\`\`
platform_social_links table: id (serial PK), platform (text), url (text), label (text nullable),
  displayOrder (integer), enabled (boolean default true), showOnListen (boolean default false),
  createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/social-links — public — returns all enabled social links
POST /api/social-links — staff+ — creates social link
PATCH /api/social-links/:id — staff+ — updates link (url, label, order, enabled)
DELETE /api/social-links/:id — staff+ — removes link
\`\`\`

### Frontend Additions
- Redesigned \`client/src/components/platform-footer.tsx\` — Loads social links from API, renders with icons
- \`client/src/pages/command-social-links.tsx\` — Social links management page

## Files Changed
- \`shared/schema.ts\` — platform_social_links table
- \`server/routes.ts\` — Social links CRUD endpoints
- \`server/storage.ts\` — Social links CRUD methods
- \`client/src/components/platform-footer.tsx\` — Footer redesign with dynamic links
- \`client/src/pages/command-social-links.tsx\` — CMD social links management
- \`client/src/components/command-sidebar.tsx\` — Added Social Links to CMD navigation

## Testing Notes
1. Visit any page — footer should display the social links from the DB
2. In CMD > Social Links, add a new link — should appear in the footer immediately on refresh
3. Toggle a link's enabled state — disabled links should not appear in the footer
4. Reorder links — footer should reflect the new order

## Known Limitations / Out of Scope
- Listen page social links (showOnListen filter) were managed separately via Task #45`,
  },
  {
    slug: "eng-task-33-store-cmd-product-creation",
    title: "Task #33 — Store CMD — Product Creation",
    summary: "Enhanced the CMD Store with a full product creation form, image preview, category management, and inventory controls. Staff can create and manage the full store catalog without developer help.",
    tags: ["engineering", "task", "task-33", "store", "admin"],
    infoboxData: { Task: "#33", Tool: "Replit", Version: "—" },
    content: `# Task #33 — Store CMD — Product Creation

## What & Why
Product management in CMD was minimal. This task delivered a full product creation and editing form with image preview, category assignment, and inventory controls, giving staff complete control over the store catalog.

## What Was Built
- Full product creation form in CMD > Store: name, slug (auto-generated), description, price, category, image URL with preview, stock count, enabled toggle
- Product editing: all fields editable after creation
- Product duplication: clone an existing product as a starting point
- Inventory management: set stock levels, "Out of Stock" state when stock hits 0
- Product image preview rendering in the form before saving
- Validation: required fields enforced, price must be positive, slug uniqueness check

## Technical Architecture

### API Routes Enhanced
\`\`\`
POST /api/products — admin — creates product with full field validation
PATCH /api/products/:id — admin — updates all product fields
POST /api/products/:id/duplicate — admin — clones a product (appends "-copy" to slug)
\`\`\`

## Files Changed
- \`server/routes.ts\` — Product creation validation, duplication endpoint
- \`server/storage.ts\` — createProduct() with full field support, duplicateProduct()
- \`client/src/pages/command-store.tsx\` — Full product form with image preview and validation

## Testing Notes
1. In CMD > Store, click "New Product" — form should appear with all fields
2. Upload an image URL — preview should render immediately below the URL field
3. Set stock to 0 — product should show "Out of Stock" on the public store
4. Duplicate an existing product — new product should appear with "-copy" appended to slug

## Known Limitations / Out of Scope
- Product image file upload (vs URL) was added in Task #57 (Supabase Storage)
- Bulk product import/export is out of scope`,
  },
  {
    slug: "eng-task-34-music-player-playlist-cmd",
    title: "Task #34 — Music Player & Playlist CMD Editing",
    summary: "Added playlist creation and editing to CMD Music tab. Enhanced the music player bar with track information display and playlist navigation.",
    tags: ["engineering", "task", "task-34", "music", "playlists", "admin"],
    infoboxData: { Task: "#34", Tool: "Replit", Version: "—" },
    content: `# Task #34 — Music Player & Playlist CMD Editing

## What & Why
Playlists were created in Task #27 but couldn't be managed from CMD without direct database access. This task added full playlist management to CMD > Music and enhanced the global player bar with better track information.

## What Was Built
- CMD Music tab: Playlists sub-tab with list of all playlists, create/edit/delete actions
- Playlist edit form: name, description, Spotify URL (embed-compatible), cover image URL, display order, enabled toggle
- Enhanced music player bar: displays current track name and artist from the Spotify embed
- Playlist reordering via up/down controls in the CMD list
- Music submissions review: status dropdown (pending → accepted/rejected), staff notes field

## Technical Architecture

### API Routes Enhanced
\`\`\`
GET /api/playlists — public — updated with display order sorting
POST /api/playlists — staff+ — creates playlist with all fields
PATCH /api/playlists/:id — staff+ — updates playlist (all fields)
PATCH /api/playlists/:id/order — staff+ — updates display order
DELETE /api/playlists/:id — staff+ — removes playlist
\`\`\`

## Files Changed
- \`server/routes.ts\` — Playlist CRUD with all fields, order updates
- \`server/storage.ts\` — Playlist management methods
- \`client/src/pages/command-music.tsx\` — Playlists sub-tab, submissions review
- \`client/src/components/music-player-bar.tsx\` — Enhanced with track info display

## Testing Notes
1. In CMD > Music > Playlists, create a new playlist with a Spotify URL — should appear on /music
2. Reorder playlists using up/down controls — order on /music should update
3. Toggle a playlist disabled — should disappear from the public music page
4. In CMD > Music > Submissions, update a submission status — badge should change immediately

## Known Limitations / Out of Scope
- Full Spotify Web API integration (syncing real playlists) was added in Task #55`,
  },
  {
    slug: "eng-task-35-wiki-archive-system",
    title: "Task #35 — Wiki Article Archive System",
    summary: "Replaced wiki article deletion with a soft archive workflow. Archived articles are hidden publicly but accessible to staff for editing and eventual republication.",
    tags: ["engineering", "task", "task-35", "wiki", "archive"],
    infoboxData: { Task: "#35", Tool: "Replit", Version: "—" },
    content: `# Task #35 — Wiki Article Archive System

## What & Why
Permanent deletion of wiki articles was too destructive — removing historical documentation without any recovery path. This task replaced deletion with an archive workflow, keeping all articles in the database while hiding them from public view.

## What Was Built
- Article status extended with "archived" in addition to draft/published
- Archived articles are hidden from public wiki, search results, and category listings
- Staff+ users can view archived articles at /wiki/archive
- Archive workflow: editors click "Archive" (replacing the Delete button) → article becomes archived
- Republication workflow: staff can edit and submit archived articles for re-review; admins can publish directly
- Archive feed accessible in CMD for staff to find and recover archived content

## Technical Architecture

### Schema Changes
\`\`\`
articles.status enum extended: draft | published | archived
\`\`\`

### API Routes
\`\`\`
GET /api/articles/archived — staff+ — returns all archived articles
PATCH /api/articles/:id/archive — staff+ — moves article to archived status
PATCH /api/articles/:id/unarchive — admin — moves article back to draft for editing
PATCH /api/articles/:id/republish — admin — publishes an archived article directly
\`\`\`

### Frontend Additions
- \`client/src/pages/wiki-archive-page.tsx\` — Archive listing page for staff
- Updated \`client/src/pages/article-editor.tsx\` — "Archive" button replaces "Delete" for published articles
- Updated \`client/src/pages/article-view.tsx\` — Archived articles show a banner for staff

## Files Changed
- \`shared/schema.ts\` — Extended status enum (added "archived")
- \`server/routes.ts\` — Archived articles routes, archive/unarchive/republish endpoints
- \`server/storage.ts\` — getArchivedArticles(), archiveArticle(), republishArticle()
- \`client/src/pages/article-editor.tsx\` — Archive button, archive workflow
- \`client/src/pages/wiki-archive-page.tsx\` — Archive listing
- \`client/src/App.tsx\` — /wiki/archive route

## Testing Notes
1. As staff, view a published article and click "Archive" — should disappear from public wiki
2. Visit /wiki/archive as staff — archived articles should be listed
3. Click a public search — archived articles should NOT appear in results
4. As admin, republish an archived article — should reappear in the public wiki immediately

## Known Limitations / Out of Scope
- Archived articles cannot be permanently deleted via the UI (only via DB admin)
- Archive reason/notes are not captured — just the timestamp`,
  },
  {
    slug: "eng-task-36-version-system-changelog",
    title: "Task #36 — Version System & Changelog",
    summary: "Added semantic versioning to changelog entries. Platform footer dynamically displays the current version from the latest changelog entry. Changelog page added for public viewing.",
    tags: ["engineering", "task", "task-36", "changelog", "versioning"],
    infoboxData: { Task: "#36", Tool: "Replit", Version: "1.2.0" },
    content: `# Task #36 — Version System & Changelog

## What & Why
The platform lacked a formal version tracking system, making it difficult for users and staff to know which features were in the current build. This task added semantic versioning to changelog entries and made the current version visible in the platform footer.

## What Was Built
- Semantic version field on changelog entries (e.g., "1.2.0")
- Platform footer dynamically displays the current platform version by fetching the latest changelog entry
- Public /changelog page showing all changelog entries in reverse chronological order
- CMD Changelog management: create, edit, and categorize changelog entries (feature, fix, improvement, other)
- Category badges: feature (green), fix (red/orange), improvement (blue), other (gray)

## Technical Architecture

### Schema Additions
\`\`\`
changelog table: id (serial PK), title (text), description (text), category (text),
  version (text), wikiSlug (text nullable), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/changelog — public — returns all changelog entries ordered by createdAt DESC
GET /api/changelog/latest — public — returns the single most recent entry
POST /api/changelog — admin — creates changelog entry
PATCH /api/changelog/:id — admin — updates entry
DELETE /api/changelog/:id — admin — removes entry
\`\`\`

### Frontend Additions
- \`client/src/pages/changelog-page.tsx\` — Public changelog timeline
- \`client/src/pages/command-changelog.tsx\` — CMD changelog management
- Updated \`client/src/components/platform-footer.tsx\` — Displays version from API

## Files Changed
- \`shared/schema.ts\` — changelog table definition
- \`server/routes.ts\` — Changelog CRUD endpoints, /api/changelog/latest
- \`server/storage.ts\` — Changelog CRUD methods, getLatestChangelogEntry()
- \`client/src/pages/changelog-page.tsx\` — Public changelog
- \`client/src/pages/command-changelog.tsx\` — CMD management
- \`client/src/components/platform-footer.tsx\` — Dynamic version display

## Testing Notes
1. Visit /changelog — entries should display in reverse chronological order with category badges
2. Check the platform footer — current version (e.g., "v1.2.0") should appear
3. In CMD, create a new changelog entry — should immediately appear at the top of /changelog
4. Verify the footer updates to show the new version after creating a new entry

## Known Limitations / Out of Scope
- Changelog entries linking to wiki articles (wikiSlug) were implemented in Task #42
- "Read more →" links on the public changelog page were added in Task #42`,
  },
  {
    slug: "eng-task-37-social-feed",
    title: "Task #37 — Social Feed — Posts, Follows & Timelines",
    summary: "Built a social-style feed system at /feed where staff can post platform updates. Users can follow other users and see a personalized timeline. Posts support likes and replies.",
    tags: ["engineering", "task", "task-37", "feed", "social"],
    infoboxData: { Task: "#37", Tool: "Replit", Version: "—" },
    content: `# Task #37 — Social Feed — Posts, Follows & Timelines

## What & Why
The platform needed a way to share platform news, milestones, and updates with the community. A social feed let staff publish posts and let members engage through likes and replies.

## What Was Built
- /feed page showing a timeline of platform updates and staff posts
- Post creation for staff+: text with optional image URL
- Post cards with author avatar, timestamp, like count, and reply count
- Like system: authenticated users can like/unlike posts
- Reply system: threaded replies on each post
- User follow system: follow/unfollow other platform members
- Personalized timeline: shows posts from followed users + staff posts
- "Pinned" posts (bulletin functionality) visible at the top of the home page (added in Task #50)

## Technical Architecture

### Schema Additions
\`\`\`
feed_posts table: id (serial PK), authorId (integer FK), content (text), imageUrl (text nullable),
  pinned (boolean default false), createdAt (timestamp)
post_likes table: id (serial PK), postId (integer FK), userId (integer FK), createdAt (timestamp)
post_replies table: id (serial PK), postId (integer FK), authorId (integer FK), content (text),
  createdAt (timestamp)
user_follows table: id (serial PK), followerId (integer FK), followingId (integer FK),
  createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/feed — auth optional — returns recent posts; if authenticated, includes followed-user posts
POST /api/feed — staff+ — creates a post
DELETE /api/feed/:id — author or admin — removes a post
POST /api/feed/:id/like — auth required — toggles like on a post
GET /api/feed/:id/replies — public — returns replies for a post
POST /api/feed/:id/replies — auth required — adds a reply
POST /api/users/:id/follow — auth required — follows a user
DELETE /api/users/:id/follow — auth required — unfollows a user
\`\`\`

### Frontend Additions
- \`client/src/pages/feed-page.tsx\` — Social feed timeline
- Post card component with like button, reply count, reply thread

## Files Changed
- \`shared/schema.ts\` — feed_posts, post_likes, post_replies, user_follows tables
- \`server/routes.ts\` — Feed, likes, replies, and follow endpoints
- \`server/storage.ts\` — Feed CRUD, like toggle, follow/unfollow methods
- \`client/src/pages/feed-page.tsx\` — Social feed UI
- \`client/src/App.tsx\` — /feed route

## Testing Notes
1. Visit /feed — recent staff posts should display
2. Log in and like a post — like count should increment, button should toggle state
3. Follow another user — their posts should appear in your feed
4. As staff, create a post — should appear at the top of /feed immediately

## Known Limitations / Out of Scope
- Real-time notifications for likes/replies are not implemented
- Image uploads for posts require pasting a URL`,
  },
  {
    slug: "eng-task-38-notes-tool",
    title: "Task #38 — Notes Tool — Personal & Collaborative",
    summary: "Built a personal and collaborative notes tool accessible from /notes. Users can create, edit, and tag notes. Staff can share notes with collaborators and export to various formats.",
    tags: ["engineering", "task", "task-38", "notes", "tools"],
    infoboxData: { Task: "#38", Tool: "Replit", Version: "—" },
    content: `# Task #38 — Notes Tool — Personal & Collaborative

## What & Why
Platform members needed a place to keep quick notes — meeting notes, research, ideas — without leaving the SEVCO platform. The notes tool provides private and shared notes with rich text editing.

## What Was Built
- /notes page with a note list sidebar and editor panel
- Create, edit, delete notes with titles and markdown content
- Notes tagged with user-defined tags for organization
- Collaborative notes: notes can be shared with specific users (collaborators)
- Collaborators can view and edit shared notes
- Note attachment support (file URLs)
- CMD overview widget showing recent notes (added in Task #49)

## Technical Architecture

### Schema Additions
\`\`\`
notes table: id (serial PK), ownerId (integer FK), title (text), content (text),
  tags (text[]), isShared (boolean default false), createdAt (timestamp), updatedAt (timestamp)
note_collaborators table: id (serial PK), noteId (integer FK), userId (integer FK),
  canEdit (boolean default false), createdAt (timestamp)
note_attachments table: id (serial PK), noteId (integer FK), fileName (text),
  fileUrl (text), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/notes — auth required — returns own notes + notes shared with this user
POST /api/notes — auth required — creates note
PATCH /api/notes/:id — owner or collaborator with edit — updates note
DELETE /api/notes/:id — owner or admin — removes note
POST /api/notes/:id/collaborators — owner — adds a collaborator
DELETE /api/notes/:id/collaborators/:userId — owner — removes a collaborator
\`\`\`

### Frontend Additions
- \`client/src/pages/notes-page.tsx\` — Notes tool with list sidebar and editor

## Files Changed
- \`shared/schema.ts\` — notes, note_collaborators, note_attachments tables
- \`server/routes.ts\` — Notes CRUD, collaborator management endpoints
- \`server/storage.ts\` — Notes CRUD, collaborator methods
- \`client/src/pages/notes-page.tsx\` — Full notes UI

## Testing Notes
1. Visit /notes — note list should be empty initially
2. Create a note — should appear in the list and be editable
3. Add a tag — note should be filterable by tag
4. Share a note with another user — they should see it in their notes list

## Known Limitations / Out of Scope
- Notes export to PDF/Markdown was added in Task #61
- Rich text formatting beyond Markdown is not supported`,
  },
  {
    slug: "eng-task-39-nav-platform-housekeeping",
    title: "Task #39 — Nav & Platform Housekeeping",
    summary: "Navigation cleanup and platform housekeeping: corrected mega-menu link destinations, removed stale routes, updated mobile menu organization, and cleaned up unused components and imports.",
    tags: ["engineering", "task", "task-39", "navigation", "housekeeping"],
    infoboxData: { Task: "#39", Tool: "Replit", Version: "—" },
    content: `# Task #39 — Nav & Platform Housekeeping

## What & Why
As features accumulated, the navigation and codebase accumulated technical debt: stale route references, outdated mega-menu configurations, unused component imports, and inconsistent mobile menu organization. This housekeeping task cleaned all of it up.

## What Was Fixed / Changed
- Corrected wrong destination URLs in several mega-menu dropdown items
- Removed stale routes that pointed to deleted or renamed pages
- Mobile hamburger menu reorganized: sections in the same order as the desktop mega-menu
- Removed 6 unused component files that were imported but never rendered
- Cleaned up dead imports in App.tsx and platform-header.tsx
- Standardized route naming conventions (all lowercase, hyphenated slugs)
- Fixed "back to wiki" link on the Changelog page that was hardcoded to a wrong URL


## Technical Architecture
- **Navigation**: Updated \`platform-header.tsx\` nav item ordering, labels, and mega-menu structure
- **Housekeeping**: Removed unused imports, dead code paths, and commented-out components across multiple files
- **No schema changes**: All modifications were frontend component and layout adjustments

## Files Changed
- \`client/src/App.tsx\` — Removed stale routes, standardized route names
- \`client/src/components/platform-header.tsx\` — Fixed mega-menu link destinations, mobile menu reorder
- \`client/src/pages/changelog-page.tsx\` — Fixed "back to wiki" link
- Various component files — Removed unused files and dead imports

## Testing Notes
1. Navigate all mega-menu dropdown links — each should resolve to the correct page
2. Test the mobile hamburger menu — section order should match desktop mega-menu
3. Visit /changelog and click "Back to Wiki" — should navigate to /wiki correctly

## Known Limitations / Out of Scope
- A full codebase audit for dead code was not in scope`,
  },
  {
    slug: "eng-task-40-cmd-restructure",
    title: "Task #40 — CMD Restructure, Fixes & Overview Refresh",
    summary: "Restructured the Command Center with a reorganized sidebar, refreshed the Overview dashboard with better metrics cards, and fixed several CMD-specific bugs.",
    tags: ["engineering", "task", "task-40", "command-center", "admin"],
    infoboxData: { Task: "#40", Tool: "Replit", Version: "—" },
    content: `# Task #40 — CMD Restructure, Fixes & Overview Refresh

## What & Why
The Command Center had grown organically as features were added, resulting in a sidebar that was hard to navigate and an overview dashboard that showed outdated or irrelevant metrics. This task restructured CMD for scalability.

## What Was Built
- CMD sidebar reorganized with cleaner grouping and consistent icon usage
- CMD Overview dashboard refreshed: stat cards redesigned with sparklines, a "Latest Release" card, and a "Recent Activity" section
- Fixed CMD page headers being hidden by the sticky nav bar (z-index/padding issue)
- Fixed CMD Overview "Latest Release" card not always showing the most recent entry
- Added "Quick Actions" section to CMD Overview for common admin tasks

## Technical Architecture
- CMD Overview now calls \`GET /api/command/summary\` (enhanced to include recent activity)
- Latest Release card reads from \`GET /api/changelog/latest\`

## Files Changed
- \`client/src/components/command-sidebar.tsx\` — Reorganized nav items with icons, better grouping
- \`client/src/pages/command-overview.tsx\` — Refreshed dashboard layout, new stat cards, quick actions
- \`server/routes.ts\` — Enhanced /api/command/summary response

## Testing Notes
1. Navigate CMD — sidebar should feel organized and each item should navigate correctly
2. Check CMD Overview — stat cards should show real-time counts
3. Verify the "Latest Release" card matches the most recent entry in CMD > Changelog
4. Scroll down in CMD with the sticky nav — page headers should not be hidden behind the nav

## Known Limitations / Out of Scope
- CMD sidebar grouping into labeled sections (Content, Operations, System) was added in Task #62`,
  },
  {
    slug: "eng-task-41-hostinger-domains",
    title: "Task #41 — Hostinger API Integration & Domains Page",
    summary: "Integrated the Hostinger API to display domain registration and management. Added a /domains page and CMD Hosting management tab for domain lookup and status.",
    tags: ["engineering", "task", "task-41", "hostinger", "domains"],
    infoboxData: { Task: "#41", Tool: "Replit", Version: "—" },
    content: `# Task #41 — Hostinger API Integration & Domains Page

## What & Why
SEVCO provides domain registration services via Hostinger. Customers needed a way to search for and check domain availability directly on the platform, and admins needed visibility into managed domains.

## What Was Built
- /domains page with a domain search bar and availability checker
- Domain availability check via Hostinger API
- Suggested alternative domains when the searched domain is taken
- CMD Hosting management tab: list of domains managed via the Hostinger account
- Domain status badges: Active, Expired, Pending Transfer
- Hostinger API error handling with user-friendly messages

## Technical Architecture

### API Routes
\`\`\`
GET /api/domains/search?query=X — public — queries Hostinger API for domain availability
GET /api/domains — admin — returns list of managed domains from Hostinger account
\`\`\`

### Backend
- \`server/hostinger.ts\` — Hostinger API client wrapper with error handling

## Environment Variables
- \`HOSTINGER_API_KEY\` — Hostinger API authentication token

## Files Changed
- \`server/hostinger.ts\` — New Hostinger API client
- \`server/routes.ts\` — Domain search and listing endpoints
- \`client/src/pages/domains-page.tsx\` — Public domain search page
- \`client/src/pages/command-hosting.tsx\` — CMD domain management
- \`client/src/components/command-sidebar.tsx\` — Hosting link in CMD nav

## Testing Notes
1. Visit /domains and search for a domain name — availability result should appear within 2 seconds
2. Search for a taken domain — alternatives should be suggested
3. In CMD > Hosting — managed domains should list with status badges

## Known Limitations / Out of Scope
- Domain purchase flow redirects to Hostinger; no in-platform purchase is implemented
- Hostinger API response parsing issues were fixed in Task #43`,
  },
  {
    slug: "eng-task-42-engineering-articles-changelog",
    title: "Task #42 — Engineering Wiki Articles & Changelog Update",
    summary: "Seeded Engineering wiki articles for Tasks #28–#42. Updated all existing changelog entries to include wikiSlug links. Added 'Read more →' links to wiki articles on the public changelog page.",
    tags: ["engineering", "task", "task-42", "wiki", "documentation", "changelog"],
    infoboxData: { Task: "#42", Tool: "Replit", Version: "—" },
    content: `# Task #42 — Engineering Wiki Articles & Changelog Update

## What & Why
As the platform's task count grew past the original seeding in Task #17, the Engineering wiki category fell behind. Changelog entries also lacked links to their corresponding wiki articles, making it harder to trace a changelog version to its technical documentation.

## What Was Built
- Published Engineering wiki articles for Tasks #28 through #42
- Updated all existing changelog entries to set the \`wikiSlug\` field pointing to the corresponding article slug
- Public /changelog page updated to render "Read more →" links to wiki articles when wikiSlug is set
- CMD changelog management page updated to display the linked article slug and provide a link to edit it

## Technical Architecture
- \`wikiSlug\` field was already present on the changelog table from Task #36 but unused
- The changelog page renders a link to \`/wiki/{wikiSlug}\` when the field is non-null

## Files Changed
- \`server/routes.ts\` — seedEngineeringArticles() extended with tasks 28–42
- \`client/src/pages/changelog-page.tsx\` — "Read more →" link rendered when wikiSlug set
- \`client/src/pages/command-changelog.tsx\` — wikiSlug field displayed and editable

## Testing Notes
1. Visit /changelog — entries with wikiSlug should show a "Read more →" link
2. Click "Read more →" — should navigate to the corresponding Engineering wiki article
3. In CMD > Changelog, edit an entry and set/update the wikiSlug — link should update on /changelog

## Known Limitations / Out of Scope
- Articles were stub-quality at seeding; this task (Task #90) has substantially expanded all articles`,
  },
  {
    slug: "eng-task-43-bug-fixes-nav-polish",
    title: "Task #43 — Bug Fixes & Navigation Polish",
    summary: "Fixed wiki sidebar collapse to icon-only rail, corrected Hostinger domain search API parsing, reordered CMD Overview latest release card, and added back-to-wiki link on the Changelog page.",
    tags: ["engineering", "task", "task-43", "bug-fix", "navigation"],
    infoboxData: { Task: "#43", Tool: "Replit", Version: "1.2.1" },
    content: `# Task #43 — Bug Fixes & Navigation Polish

## What & Why
Four specific bugs were identified after Task #42 merged. This task fixed all of them in a focused bundle.

## What Was Fixed

### 1. Wiki Sidebar Collapse
The wiki sidebar "collapse to icon" button wasn't fully working — the sidebar would collapse but still show text labels next to icons instead of hiding them. Fixed by ensuring the \`group-data-[collapsible=icon]:hidden\` class was applied to the correct text wrapper elements.

### 2. Hostinger Domain Search Parsing
The Hostinger domain availability API returned a nested JSON structure. The server-side parsing was reading from the wrong level of the response object, causing all domain searches to fail with "availability unknown." Fixed by examining the actual API response structure and updating the parser.

### 3. CMD Overview Latest Release Card Order
The CMD Overview's "Latest Release" card was showing an older entry rather than the newest one. Root cause: the query was ordering by \`id\` instead of \`createdAt DESC\`. Fixed by updating \`getLatestChangelogEntry()\` in storage.ts to use \`createdAt\` ordering.

### 4. Changelog Back-to-Wiki Link
The public /changelog page had a "Back to Wiki" link that hardcoded the wiki URL incorrectly. Fixed by updating the link to \`/wiki\` using the wouter \`Link\` component.

## Files Changed
- \`client/src/components/app-sidebar.tsx\` — Wiki sidebar icon-only collapse fix
- \`server/hostinger.ts\` — Domain search API response parsing fix
- \`server/storage.ts\` — getLatestChangelogEntry() now orders by createdAt DESC
- \`client/src/pages/changelog-page.tsx\` — Fixed "Back to Wiki" link destination


## Technical Architecture
- **Components affected**: \`platform-header.tsx\` (nav item alignment, dropdown triggers), \`sidebar.tsx\` (mobile menu close behavior), various page components (spacing fixes)
- **CSS patterns**: Used Tailwind utility classes for consistent spacing; fixed z-index stacking issues between mega-menu and modals
- **No API or schema changes**

## Testing Notes
1. Collapse the wiki sidebar — icon-only mode should show only icons with no text visible
2. Search for a domain on /domains — result (available/taken) should return correctly
3. Check CMD Overview "Latest Release" card — should always show the most recent entry
4. On /changelog, click "Back to Wiki" — should navigate to /wiki

## Known Limitations / Out of Scope
- These were targeted bug fixes; no new features were added in this task`,
  },
  {
    slug: "eng-task-44-project-social-links-about-page",
    title: "Task #44 — Project Social Links + About Page",
    summary: "Added social link fields to projects with display on detail pages. Launched a dedicated /about page for SEVCO linked from the main navigation.",
    tags: ["engineering", "task", "task-44", "projects", "about"],
    infoboxData: { Task: "#44", Tool: "Replit", Version: "1.3.0" },
    content: `# Task #44 — Project Social Links + About Page

## What & Why
Individual projects lacked social media presence links on their detail pages, making it hard for visitors to follow SEVCO ventures. Additionally, the platform had no dedicated About page explaining SEVCO's mission, team, and values.

## What Was Built
- Social link fields added to projects: X, Instagram, YouTube, Discord, GitHub
- Social links displayed on project detail pages as icon buttons
- Admin: edit social links for each project in CMD > Projects
- /about page launched: SEVCO mission statement, team section, values, brand assets download
- About page linked from the main navigation and platform footer
- Brand colors section on the About page showing SEVCO's color palette

## Technical Architecture

### Schema Additions
\`\`\`
projects table additions:
- socialLinks (jsonb nullable) — {twitter, instagram, youtube, discord, github}
\`\`\`

### API Routes
\`\`\`
PATCH /api/projects/:slug — admin — updated to accept socialLinks in request body
GET /api/about — public — returns about page content (static or from platform settings)
\`\`\`

### Frontend Additions
- Updated \`client/src/pages/project-detail.tsx\` — Social link icons rendered below project info
- \`client/src/pages/about-page.tsx\` — Full About page with mission, team, values
- Updated \`client/src/components/platform-header.tsx\` — About link in nav

## Files Changed
- \`shared/schema.ts\` — socialLinks column on projects table
- \`server/routes.ts\` — socialLinks in project PATCH
- \`client/src/pages/project-detail.tsx\` — Social link icons
- \`client/src/pages/about-page.tsx\` — New About page
- \`client/src/components/platform-header.tsx\` — About nav link
- \`client/src/components/platform-footer.tsx\` — About footer link

## Testing Notes
1. Visit a project's detail page — social link icons should appear if configured
2. In CMD > Projects, edit a project and add a Twitter URL — should appear on the detail page
3. Visit /about — mission statement, team section, and brand colors should display
4. Click "About" in the navigation — should navigate to /about

## Known Limitations / Out of Scope
- Brand assets section on the About page (downloadable files) was enhanced in Task #52`,
  },
  {
    slug: "eng-task-45-listen-page-social-links-cmd",
    title: "Task #45 — Listen Page Social Links in CMD",
    summary: "Moved hardcoded streaming and social links on the Music Listen page into the database. Admins can now toggle which links appear on the Listen page from CMD Social Links management.",
    tags: ["engineering", "task", "task-45", "music", "social-links"],
    infoboxData: { Task: "#45", Tool: "Replit", Version: "1.3.1" },
    content: `# Task #45 — Listen Page Social Links in CMD

## What & Why
The /listen page had hardcoded streaming platform links (Spotify, Apple Music, YouTube Music) and social follow links. When SEVCO added or changed a streaming platform, a developer had to update the code. This task moved all links to the database and made them manageable from CMD.

## What Was Built
- \`showOnListen\` boolean field added to \`platform_social_links\` table
- CMD > Social Links: each link now has a "Show on Listen Page" toggle
- /listen page reads its links from \`GET /api/social-links?showOnListen=true\` instead of hardcoded data
- Admins can add any link to the Listen page without a code change
- Order of links on the Listen page respects the \`displayOrder\` field in CMD

## Technical Architecture

### Schema Changes
\`\`\`
platform_social_links addition:
- showOnListen (boolean default false)
\`\`\`

### API Routes
\`\`\`
GET /api/social-links?showOnListen=true — public — returns only links with showOnListen=true
PATCH /api/social-links/:id — staff+ — updated to accept showOnListen toggle
\`\`\`

### Migration
A \`migrateSocialLinksShowOnListen()\` function was added to run on startup, setting \`showOnListen=true\` for any existing Spotify, Apple Music, and YouTube Music links by detecting their platform name.

## Files Changed
- \`shared/schema.ts\` — showOnListen field on platform_social_links
- \`server/routes.ts\` — showOnListen filter on GET /api/social-links
- \`server/storage.ts\` — migrateSocialLinksShowOnListen() startup migration
- \`client/src/pages/listen-page.tsx\` — Reads links from API instead of hardcoded data
- \`client/src/pages/command-social-links.tsx\` — showOnListen toggle in the management UI

## Testing Notes
1. In CMD > Social Links, toggle "Show on Listen Page" for a link
2. Visit /listen — the toggled link should appear (if enabled) or disappear (if disabled)
3. Add a brand new social link in CMD with showOnListen enabled — should appear on /listen immediately

## Known Limitations / Out of Scope
- Link icons are determined by the platform name; custom icon upload is not supported`,
  },
  {
    slug: "eng-task-46-cmd-display-tab",
    title: "Task #46 — CMD Display Tab — Platform Presentation Controls",
    summary: "New CMD Display tab giving admins full control over the landing page hero: image, text, buttons, section visibility. Also controls favicon, OG image, and platform-wide settings without touching code.",
    tags: ["engineering", "task", "task-46", "admin", "display", "cmd"],
    infoboxData: { Task: "#46", Tool: "Replit", Version: "1.4.0" },
    content: `# Task #46 — CMD Display Tab — Platform Presentation Controls

## What & Why
The landing page hero and other visual settings were hardcoded. Any change (background image, headline text, CTA labels) required a code edit. This task built a CMD Display tab that gives admins full visual control over the platform's presentation without touching code.

## What Was Built
- CMD Display tab at /command/display (admin+)
- **Hero Editor**: background image URL (with preview), hero headline, subheadline, primary CTA button label and link, secondary CTA button label and link
- **Section Visibility**: toggles to show/hide major homepage sections (Music preview, Projects preview, Store preview, Feed bulletin)
- **Platform Identity**: favicon URL and OG (Open Graph) image URL for social sharing previews
- All settings stored in the \`platform_settings\` key-value table
- Landing page reads all hero settings from \`GET /api/platform-settings\` on load

## Technical Architecture

### Schema Additions
\`\`\`
platform_settings table: id (serial PK), key (text unique), value (text), createdAt (timestamp)
\`\`\`

Settings keys used:
- \`hero.backgroundUrl\` — Hero section background image
- \`hero.headline\` — Main hero headline text
- \`hero.subheadline\` — Hero subheadline text
- \`hero.primaryCta.label\` and \`hero.primaryCta.href\`
- \`hero.secondaryCta.label\` and \`hero.secondaryCta.href\`
- \`section.musicVisible\`, \`section.projectsVisible\`, etc. (boolean strings)
- \`platform.faviconUrl\` — Dynamic favicon
- \`platform.ogImageUrl\` — Open Graph preview image

### API Routes
\`\`\`
GET /api/platform-settings — public — returns all platform settings as {key: value} map
POST /api/platform-settings — admin — upserts a setting key-value pair
\`\`\`

### Frontend Additions
- \`client/src/pages/command-display.tsx\` — Full Display tab with all editor sections
- Updated \`client/src/pages/landing.tsx\` — Reads hero settings from API

## Files Changed
- \`shared/schema.ts\` — platform_settings table
- \`server/routes.ts\` — Platform settings GET and POST endpoints
- \`server/storage.ts\` — getPlatformSettings(), upsertPlatformSetting() methods
- \`client/src/pages/command-display.tsx\` — New Display tab
- \`client/src/pages/landing.tsx\` — Dynamic hero from platform settings
- \`client/src/components/command-sidebar.tsx\` — Display link in CMD nav

## Testing Notes
1. In CMD > Display, update the hero headline — visit the home page and verify the new text appears
2. Toggle the Music section visibility off — the Music preview section should disappear from the home page
3. Update the favicon URL — browser tab icon should update on the next page load
4. Confirm all settings persist across server restarts (stored in DB, not in-memory)

## Known Limitations / Out of Scope
- Platform color editor was added in Task #60
- Hero logo upload was added in Task #73
- Display tab settings were reorganized into a Settings tab in Task #78`,
  },
  {
    slug: "eng-task-47-platform-search",
    title: "Task #47 — Platform-Wide Search",
    summary: "Added a full-width search overlay triggered from the nav bar. Live grouped results across Wiki, Projects, Store, Music, Jobs, and Services. Includes a dedicated /search results page and Google fallback.",
    tags: ["engineering", "task", "task-47", "search"],
    infoboxData: { Task: "#47", Tool: "Replit", Version: "1.5.0" },
    content: `# Task #47 — Platform-Wide Search

## What & Why
Users had no way to find content across the platform without knowing where to navigate. A platform-wide search lets visitors instantly find articles, products, projects, music, jobs, and services from a single entry point.

## What Was Built
- Search overlay: clicking the search icon in the nav opens a full-width overlay with a search input
- Live results update as the user types (debounced 300ms), grouped by content type: Wiki, Projects, Store, Music, Jobs, Services
- Each result group shows up to 3 results with relevant metadata (price for products, status for projects, etc.)
- Dedicated /search results page for full results when the user presses Enter
- Google fallback button: "Search Google for X" opens a Google search for queries with no platform results
- Keyboard navigation: Escape closes the overlay, arrow keys navigate results

## Technical Architecture

### API Routes
\`\`\`
GET /api/search?q=X&limit=5 — public — searches across all content types, returns grouped results:
  {wiki: [...], projects: [...], store: [...], music: [...], jobs: [...], services: [...]}
GET /api/search/full?q=X — public — returns paginated full results for the /search page
\`\`\`

### Search Strategy
- Each content type queried with SQL LIKE pattern on relevant text fields (title, name, description)
- Results merged and returned; no full-text search index (Postgres FTS not implemented)
- Limit of 3–5 results per category in the overlay; full results on the /search page

### Frontend Additions
- \`client/src/components/search-overlay.tsx\` — Full-width search overlay with live results
- \`client/src/pages/search.tsx\` — /search results page with full grouped results
- Updated \`client/src/components/platform-header.tsx\` — Search icon trigger

## Files Changed
- \`server/routes.ts\` — Search endpoint querying all content types
- \`server/storage.ts\` — searchAll() method with per-type queries
- \`client/src/components/search-overlay.tsx\` — Search overlay
- \`client/src/pages/search.tsx\` — Search results page
- \`client/src/components/platform-header.tsx\` — Search icon in nav

## Testing Notes
1. Click the search icon in the nav — overlay should open with a focused input
2. Type "wiki" — Wiki articles with "wiki" in their title should appear under the Wiki section
3. Search for a product name — it should appear under Store results
4. Press Escape — overlay should close
5. Press Enter — navigate to /search with full results

## Known Limitations / Out of Scope
- PostgreSQL full-text search (FTS with ts_vector) is not used; performance may degrade with 10,000+ articles
- Search does not include feed posts or notes`,
  },
  {
    slug: "eng-task-48-bug-fixes",
    title: "Task #48 — Bug Fixes: Hostinger API, CMD Nav Title, Global Cart Drawer",
    summary: "Fixed Hostinger API response parsing errors, resolved CMD page headers being hidden by the sticky nav bar, and moved the cart drawer to mount globally so it works from any page.",
    tags: ["engineering", "task", "task-48", "bug-fix"],
    infoboxData: { Task: "#48", Tool: "Replit", Version: "1.5.1" },
    content: `# Task #48 — Bug Fixes: Hostinger API, CMD Nav Title, Global Cart Drawer

## What & Why
Three specific bugs were identified and fixed in this task, each impacting core platform functionality.

## What Was Fixed

### 1. Hostinger API Response Parsing
The Hostinger domain search API was returning results in a wrapper object (\`{data: {results: [...]}}\`), but the server-side parser was reading from \`response.results\` directly. Domain availability checks always returned undefined. Fixed by correctly navigating the response structure.

### 2. CMD Page Headers Hidden by Sticky Nav
In the Command Center, page-level headings (e.g., "Store", "Users", "Changelog") were rendered at the top of the content area, which positioned them directly behind the sticky navigation bar when scrolled. Fixed by adding \`pt-16\` (or equivalent) padding to the CMD content wrapper, ensuring headings appear below the nav.

### 3. Global Cart Drawer
The cart drawer was mounted inside the Store page component, meaning it was unavailable on other pages. Users who added products to their cart then navigated away couldn't access it. Fixed by moving the \`<CartDrawer />\` component to the root App layout, making it accessible from any page in the platform.

## Files Changed
- \`server/hostinger.ts\` — Updated response parser to correctly navigate the Hostinger API response structure
- \`client/src/App.tsx\` — Moved CartDrawer to root layout; added \`<CartDrawer />\` at the app root
- \`client/src/pages/store-page.tsx\` — Removed CartDrawer from store-only mounting
- \`client/src/pages/command-overview.tsx\` (and other CMD pages) — Added top padding to content wrapper


## Technical Architecture
- **Hostinger API**: \`server/hostinger.ts\` — fixed API request headers and error handling for domain lookup calls
- **CMD nav title**: \`command-center.tsx\` — title prop was not being passed through to the sidebar header component
- **Global cart drawer**: \`cart-drawer.tsx\` — the Sheet component was not properly closing on route change; added a \`useEffect\` listening to \`useLocation()\` to auto-close

## Testing Notes
1. Search for a domain on /domains — availability result should return correctly (not undefined)
2. Navigate from the store to the home page after adding a product — cart icon badge should remain, drawer should open
3. In CMD, scroll down to verify the page heading is fully visible below the nav bar

## Known Limitations / Out of Scope
- These were targeted fixes; no new features were added`,
  },
  {
    slug: "eng-task-49-cmd-enhancements",
    title: "Task #49 — CMD Enhancements: Edit Social Links, Resources Tab, Recent Notes Widget",
    summary: "Social links in CMD are now editable inline. Added a Resources tab for managing quick links. CMD Overview shows a Recent Notes widget. Several CMD UX improvements.",
    tags: ["engineering", "task", "task-49", "command-center", "admin"],
    infoboxData: { Task: "#49", Tool: "Replit", Version: "1.5.2" },
    content: `# Task #49 — CMD Enhancements: Edit Social Links, Resources Tab, Recent Notes Widget

## What & Why
Three CMD improvements to make daily admin work faster: social links were view-only in CMD (edit required navigating to a separate page), quick links (resources) needed a management home, and the CMD Overview lacked a personal productivity widget.

## What Was Built

### Inline Social Link Editing
- CMD > Social Links: each link in the list now has inline "Edit" mode (click to edit URL, label, order, toggle enabled/showOnListen) without navigating to a separate form page
- "Add Link" form directly in the list view

### Resources Tab
- New "Resources" CMD tab at /command/resources
- Staff can add quick-access links (label, URL, description, category) for internal tools, documentation, and external services
- Overview widget shows recent resources for quick access
- Resources visible to all staff+ roles

### Recent Notes Widget
- CMD Overview dashboard now includes a "Recent Notes" widget showing the 5 most recently updated notes owned by the logged-in user
- Clicking a note navigates to /notes with that note selected

## Technical Architecture

### Schema Additions
\`\`\`
resources table: id (serial PK), title (text), url (text), description (text nullable),
  category (text nullable), addedBy (integer FK), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/resources — staff+ — returns all resources, supports ?category= filter
POST /api/resources — staff+ — creates resource
PATCH /api/resources/:id — staff+ — updates resource
DELETE /api/resources/:id — staff+ — removes resource
\`\`\`

## Files Changed
- \`shared/schema.ts\` — resources table
- \`server/routes.ts\` — Resources CRUD endpoints
- \`server/storage.ts\` — Resource CRUD methods
- \`client/src/pages/command-social-links.tsx\` — Inline editing for social links
- \`client/src/pages/command-resources.tsx\` — New Resources tab
- \`client/src/pages/command-overview.tsx\` — Recent Notes widget added
- \`client/src/components/command-sidebar.tsx\` — Resources link added

## Testing Notes
1. In CMD > Social Links, click a link to edit — should toggle to inline edit mode
2. Visit CMD > Resources — quick link management should be available
3. Check CMD Overview — Recent Notes widget should show the 5 most recent notes

## Known Limitations / Out of Scope
- Resources file upload (as opposed to URL) was added in Task #59`,
  },
  {
    slug: "eng-task-50-home-bulletin-footer-store-cleanup",
    title: "Task #50 — Home Bulletin, Footer Sitemap, Profile/Account Cross-Links, Store Stats Cleanup",
    summary: "Added a pinned Bulletin section to the home page. Expanded the footer into a full multi-column sitemap. Added profile/account cross-links. Removed the redundant /store/stats page.",
    tags: ["engineering", "task", "task-50", "home", "footer"],
    infoboxData: { Task: "#50", Tool: "Replit", Version: "1.5.3" },
    content: `# Task #50 — Home Bulletin, Footer Sitemap, Profile/Account Cross-Links, Store Stats Cleanup

## What & Why
Four related platform improvements: the home page needed a way to surface pinned announcements; the footer needed expansion to serve as a proper sitemap; profile and account pages needed cross-navigation; and a redundant stats page was cluttering the routes.

## What Was Built

### Home Bulletin
- A "Bulletin" section added to the home page, above the main content sections
- Shows feed posts that have been marked as "pinned" (from Task #37's pinned field)
- Staff can pin a post from the feed page; pinned posts appear in the bulletin until unpinned
- Maximum 3 pinned posts shown; older pinned posts scroll off

### Footer Sitemap Expansion
- Platform footer expanded from a single row to a multi-column sitemap layout
- Columns: Platform (Wiki, Store, Projects, Music, Services, Jobs), Company (About, Contact, Changelog), Legal (Privacy Policy, Terms)
- Column structure and links configurable via CMD (added in Task #78)

### Profile/Account Cross-Links
- Profile page links to Account Settings page
- Account Settings page links back to the user's Profile page
- Both pages show a tab or link to the other view

### Store Stats Cleanup
- Removed the now-redundant \`/store/stats\` page (stats are integrated into CMD > Store > Analytics)
- Cleaned up the route and any links pointing to the removed page

## Files Changed
- \`client/src/pages/landing.tsx\` — Bulletin section showing pinned feed posts
- \`client/src/components/platform-footer.tsx\` — Multi-column sitemap layout
- \`client/src/pages/profile-page.tsx\` — Link to account settings
- \`client/src/pages/account-settings.tsx\` — Link to profile page
- \`client/src/App.tsx\` — Removed /store/stats route


## Technical Architecture
- **Home bulletin**: New \`HomeBulletin\` component rendering admin-configured announcements from \`GET /api/settings/bulletin\`; stored in platform settings table as JSON
- **Footer sitemap**: Refactored \`platform-footer.tsx\` to render multi-column nav links grouped by category from a static config
- **Profile/Account cross-links**: Added navigation links between \`/profile\` and \`/account\` pages
- **Store stats**: Removed unused analytics counters from the store page header

## Testing Notes
1. Pin a feed post as staff — should appear in the Bulletin section on the home page
2. Check the footer on any page — multi-column sitemap with correct links should display
3. Visit your profile — "Account Settings" link should appear
4. Navigate to /store/stats — should redirect or show 404 (page removed)

## Known Limitations / Out of Scope
- Footer column content is configurable via CMD > Settings (added in Task #78)`,
  },
  {
    slug: "eng-task-51-gallery-tools-dropdown",
    title: "Task #51 — Gallery Page + Tools Dropdown in Nav",
    summary: "Built an admin-managed image gallery at /gallery with category filtering and copy-link functionality. Added a Tools mega-menu item in the nav for authenticated users linking to Notes and Gallery.",
    tags: ["engineering", "task", "task-51", "gallery", "navigation"],
    infoboxData: { Task: "#51", Tool: "Replit", Version: "1.6.0" },
    content: `# Task #51 — Gallery Page + Tools Dropdown in Nav

## What & Why
SEVCO needed a centralized place to host and share images (brand assets, event photos, screenshots). Additionally, platform tools (Notes, Gallery) needed a dedicated navigation entry point for authenticated users.

## What Was Built
- /gallery page: image grid with category filter pills, search by filename, click-to-enlarge lightbox
- "Copy URL" button on each image for quickly sharing direct links
- Admin image management: upload images (URL or Supabase upload), assign categories, delete
- Tools mega-menu dropdown in the nav (authenticated users only): links to Notes (/notes) and Gallery (/gallery)
- Gallery categories managed in CMD > Gallery

## Technical Architecture

### Schema Additions
\`\`\`
gallery_images table: id (serial PK), title (text), imageUrl (text), category (text nullable),
  uploadedBy (integer FK), description (text nullable), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/gallery — auth required — returns all gallery images, supports ?category= filter
POST /api/gallery — staff+ — creates gallery image record
PATCH /api/gallery/:id — staff+ — updates image metadata
DELETE /api/gallery/:id — staff+ — removes image
\`\`\`

### Frontend Additions
- \`client/src/pages/gallery-page.tsx\` — Image gallery with filter and lightbox
- \`client/src/pages/command-gallery.tsx\` — Admin gallery management
- Updated \`client/src/components/platform-header.tsx\` — "Tools" dropdown for authenticated users

## Files Changed
- \`shared/schema.ts\` — gallery_images table
- \`server/routes.ts\` — Gallery CRUD endpoints
- \`server/storage.ts\` — Gallery image CRUD methods
- \`client/src/pages/gallery-page.tsx\` — Gallery page
- \`client/src/pages/command-gallery.tsx\` — CMD management
- \`client/src/components/platform-header.tsx\` — Tools dropdown

## Testing Notes
1. Visit /gallery as an authenticated user — image grid should display
2. Click the category filter — only images in that category should show
3. Click an image — lightbox should open with the full-size image
4. Click "Copy URL" — image URL should be copied to clipboard
5. Hover "Tools" in the nav when logged in — dropdown with Notes and Gallery should appear

## Known Limitations / Out of Scope
- Direct file upload to the gallery (vs URL) was added in Task #59 using Supabase Storage`,
  },
  {
    slug: "eng-task-52-brand-section-about",
    title: "Task #52 — Brand Section on About Page + CMD Brand Assets Management",
    summary: "Added a Brand & Assets section to the About page for downloading official SEVCO logos and brand files. Admins can upload and manage brand assets from the CMD Display tab.",
    tags: ["engineering", "task", "task-52", "branding", "about"],
    infoboxData: { Task: "#52", Tool: "Replit", Version: "1.6.1" },
    content: `# Task #52 — Brand Section on About Page + CMD Brand Assets Management

## What & Why
SEVCO's About page needed a dedicated brand resources section where visitors and partners can download official logos, color palettes, and brand guidelines. Admins needed a way to manage these assets without hardcoding file URLs.

## What Was Built
- Brand & Assets section added to the /about page: downloadable brand assets displayed as cards
- Each asset card: asset name, type badge (Logo, Color Palette, Font, Guideline), preview (if image), download button
- CMD Display tab: "Brand Assets" section for admins to add/edit/delete brand assets
- Asset types supported: Logo (image preview), Color Palette, Font Pack, Guidelines PDF, Other
- Brand colors section: displays the platform's brand colors (main and secondary) as swatches on the About page

## Technical Architecture

### Schema Additions
\`\`\`
brand_assets table: id (serial PK), name (text), assetType (text), fileUrl (text),
  description (text nullable), displayOrder (integer), enabled (boolean default true),
  createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/brand-assets — public — returns all enabled brand assets
POST /api/brand-assets — admin — creates brand asset record
PATCH /api/brand-assets/:id — admin — updates asset
DELETE /api/brand-assets/:id — admin — removes asset
\`\`\`

### Frontend Additions
- Updated \`client/src/pages/about-page.tsx\` — Brand & Assets section and brand color swatches
- Updated \`client/src/pages/command-display.tsx\` — Brand Assets management section

## Files Changed
- \`shared/schema.ts\` — brand_assets table
- \`server/routes.ts\` — Brand assets CRUD endpoints
- \`server/storage.ts\` — Brand asset CRUD methods
- \`client/src/pages/about-page.tsx\` — Brand section
- \`client/src/pages/command-display.tsx\` — Brand assets management

## Testing Notes
1. Visit /about — Brand & Assets section should display asset cards
2. Click "Download" on an asset — should download or open the file URL
3. In CMD > Display > Brand Assets, add a new logo asset — should appear on /about
4. Disable an asset — should disappear from the public About page

## Known Limitations / Out of Scope
- Brand asset file upload (vs URL) was added in Task #57 (Supabase Storage)
- Brand color customization (4 colors) was expanded in Task #63`,
  },
  {
    slug: "eng-task-53-hosting-landing-page",
    title: "Task #53 — SEVCO Hosting Landing Page",
    summary: "Launched a full marketing landing page at /hosting for SEVCO Hosting, covering Website Hosting, Minecraft & Game Servers, VPS, and Custom Hosting with feature highlights and CTAs.",
    tags: ["engineering", "task", "task-53", "hosting", "marketing"],
    infoboxData: { Task: "#53", Tool: "Replit", Version: "1.7.0" },
    content: `# Task #53 — SEVCO Hosting Landing Page

## What & Why
SEVCO Hosting is a key revenue-generating service. The platform needed a premium marketing landing page to communicate hosting plans, features, and benefits to potential customers — with the same visual quality as leading SaaS/infrastructure companies.

## What Was Built
- Full marketing landing page at /hosting
- Animated gradient blob background in the hero section
- Gradient-clipped headline text for premium visual effect
- Feature pill row highlighting key capabilities
- Service sections for: Website Hosting, Minecraft & Game Servers, VPS, and Custom Hosting
- Each hosting tier: feature list, pricing indicator, and CTA button
- "Why SEVCO Hosting?" trust section with key differentiators
- Dual CTA at the bottom (Get Started + Contact Sales)
- /hosting linked from the Services page infrastructure section and the nav

## Notable Design Decisions
- **Animated gradient blobs**: CSS keyframe animations on multiple layered blobs with different durations create depth and premium feel without heavy JavaScript
- **Glass-style cards**: \`bg-white/[0.03]\` with backdrop blur achieves a glassmorphism effect consistent with the platform's aesthetic
- **Reused visual language from the Hosting page as a standard**: This page became the visual template referenced in Task #64 for redesigning the Home, Store, and Projects pages

## Files Changed
- \`client/src/pages/hosting-page.tsx\` — New marketing landing page
- \`client/src/App.tsx\` — /hosting route registration
- \`client/src/components/platform-header.tsx\` — Hosting link in Services dropdown
- \`client/src/pages/services-listing.tsx\` — Hosting card in Infrastructure section


## Technical Architecture
- **Page component**: \`hosting-page.tsx\` — marketing landing page with hero section, feature grid, pricing tiers, and CTA buttons
- **Layout**: Full-width sections with alternating background colors; responsive grid using CSS Grid with \`grid-cols-1 md:grid-cols-3\`
- **Routing**: Registered at \`/hosting\` in App.tsx; linked from the Services mega-menu

## Testing Notes
1. Visit /hosting — animated blob hero should display, all hosting sections visible
2. Verify the page renders correctly on mobile (375px) — sections should stack properly
3. Click a CTA button — should navigate to the contact page or the appropriate destination

## Known Limitations / Out of Scope
- Actual hosting plan purchase is managed externally (Hostinger control panel)
- Pricing on the page is indicative; real quotes go through the contact form`,
  },
  {
    slug: "eng-task-54-project-service-icons-placeholder-products",
    title: "Task #54 — Project/Service Icon Editing + Placeholder Store Products",
    summary: "Added menuIcon and appIcon fields to projects with live previews in forms. Services got editable icons in CMD. Seeded the store with 6 representative placeholder products and images.",
    tags: ["engineering", "task", "task-54", "projects", "services", "store"],
    infoboxData: { Task: "#54", Tool: "Replit", Version: "1.7.1" },
    content: `# Task #54 — Project/Service Icon Editing + Placeholder Store Products

## What & Why
Projects and services displayed generic icons in the mega-menu and listing pages because icon fields weren't editable through the admin interface. This task added icon editing with live previews. Additionally, the store was empty (no products), which made it look unfinished — this task seeded it with representative products.

## What Was Built

### Project Icon Editing
- \`menuIcon\` field added to projects: the icon shown in the Projects mega-menu dropdown (Lucide icon name or image URL)
- \`appIcon\` field added to projects: the icon shown on project cards in the /projects listing
- CMD > Projects edit form: icon picker with live preview showing the icon as it appears in the dropdown and listing
- Both fields nullable (fallback to generic icon when not set)

### Service Icon Editing
- \`icon\` field (already in schema) made editable in CMD > Services with a Lucide icon name input and live preview
- Service cards on /services and in the mega-menu now render the configured icon

### Placeholder Store Products
- 6 representative products seeded: SEVCO Merch Hoodie, SEVCO Cap, Custom Design Package, Domain Registration, Website Hosting Starter, Logo Design Package
- Each product has a realistic price, description, category, and placeholder image
- Products marked as "enabled" and immediately visible in the store

## Technical Architecture

### Schema Additions
\`\`\`
projects table additions:
- menuIcon (text nullable) — Lucide icon name or image URL for mega-menu
- appIcon (text nullable) — icon for project cards on /projects listing
\`\`\`

## Files Changed
- \`shared/schema.ts\` — menuIcon, appIcon columns on projects table
- \`server/routes.ts\` — menuIcon/appIcon in project PATCH; placeholder product seeding
- \`server/storage.ts\` — Project CRUD updated for new icon fields
- \`client/src/pages/command-projects.tsx\` — Icon picker fields with live preview
- \`client/src/pages/command-services.tsx\` — Icon field with live preview
- \`client/src/components/platform-header.tsx\` — Projects dropdown uses menuIcon when set
- \`client/src/pages/projects-page.tsx\` — Project cards use appIcon when set

## Testing Notes
1. In CMD > Projects, set a menuIcon (e.g., "Code2") for a project — dropdown should show that icon
2. Set an appIcon — project card on /projects should show the icon
3. Visit /store — placeholder products should display with images and prices
4. Leave icons empty — projects/services should fall back to the generic placeholder icon

## Known Limitations / Out of Scope
- Icon upload (image file, vs Lucide name or URL) is not supported via this task`,
  },
  {
    slug: "eng-task-55-spotify-integration",
    title: "Task #55 — Spotify Integration in CMD Music Tab",
    summary: "Full Spotify Web API integration via server-side OAuth. Admins can track artist follower counts and monthly listeners, and manage playlists from a new Spotify tab in CMD Music.",
    tags: ["engineering", "task", "task-55", "music", "spotify"],
    infoboxData: { Task: "#55", Tool: "Replit", Version: "1.8.0" },
    content: `# Task #55 — Spotify Integration in CMD Music Tab

## What & Why
SEVCO Records needed live data from Spotify — artist follower counts, monthly listener numbers, and direct playlist management. This task integrated the Spotify Web API via server-side OAuth, keeping credentials secure while providing rich data to admins.

## What Was Built
- Spotify OAuth Authorization Code Flow: \`GET /api/spotify/auth\` redirects to Spotify login, \`GET /api/spotify/callback\` exchanges the code for tokens stored in \`platform_settings\`
- Token refresh middleware with automatic retry and exponential backoff on 429 (rate limit) responses
- \`spotify_artists\` table: tracks which Spotify artists SEVCO admins want to monitor
- CMD Music > Spotify tab (three sections):
  - **Connect Spotify**: shown when not yet authenticated; "Connect" button starts OAuth flow
  - **Artist Stats**: grid of tracked artist cards with live follower count and monthly listeners fetched from Spotify API
  - **Playlist Manager**: list of SEVCO's Spotify playlists with track listing, add/remove track, and create new playlist

## Technical Architecture

### Schema Additions
\`\`\`
spotify_artists table: id (serial PK), spotifyArtistId (text unique), displayName (text),
  displayOrder (integer default 0), createdAt (timestamp)
platform_settings additions: spotify.accessToken, spotify.refreshToken, spotify.tokenExpiresAt
\`\`\`

### API Routes
\`\`\`
GET /api/spotify/auth — admin — redirects to Spotify OAuth authorization URL
GET /api/spotify/callback — admin — handles OAuth callback, stores tokens
GET /api/spotify/artists — admin — returns tracked artists from DB
POST /api/spotify/artists — admin — adds an artist to track by Spotify artist ID
DELETE /api/spotify/artists/:id — admin — stops tracking an artist
GET /api/spotify/artists/:id/stats — admin — fetches live follower/listener data from Spotify API
GET /api/spotify/playlists — admin — fetches SEVCO's playlists from Spotify API
POST /api/spotify/playlists — admin — creates a new playlist on Spotify
GET /api/spotify/playlists/:id/tracks — admin — lists tracks in a playlist
POST /api/spotify/playlists/:id/tracks — admin — adds a track (by URI) to a playlist
DELETE /api/spotify/playlists/:id/tracks — admin — removes a track from a playlist
\`\`\`

### Notable Decisions
- **Server-side OAuth only**: The Spotify client secret never leaves the server. The frontend never holds tokens.
- **Token storage in platform_settings**: Spotify access/refresh tokens stored as platform settings key-values; auto-refreshed on each API call when the access token is expired.
- **Spotify attribution**: All displayed data includes "Data from Spotify" attribution per Spotify's brand guidelines.

## Environment Variables
- \`SPOTIFY_CLIENT_ID\` — Spotify app client ID
- \`SPOTIFY_CLIENT_SECRET\` — Spotify app client secret
- \`SPOTIFY_REDIRECT_URI\` — OAuth callback URL (e.g., \`https://sevco.us/api/spotify/callback\`)

## Files Changed
- \`shared/schema.ts\` — spotify_artists table
- \`server/spotify.ts\` — New Spotify API client with OAuth, token refresh, rate limit handling
- \`server/routes.ts\` — All Spotify API route handlers
- \`server/storage.ts\` — Spotify artist CRUD, token storage/retrieval
- \`client/src/pages/command-music.tsx\` — New Spotify tab with three sections

## Testing Notes
1. Visit CMD > Music > Spotify tab — should show "Connect Spotify" button if not yet authenticated
2. Click Connect — should redirect to Spotify authorization, then back to CMD
3. Add an artist by Spotify ID — follower count and monthly listeners should load
4. Open Playlist Manager — SEVCO's Spotify playlists should list with track counts
5. Add a track to a playlist via Spotify URI — should appear in the playlist on Spotify within seconds

## Known Limitations / Out of Scope
- Spotify Webhooks (for real-time playlist sync) are not implemented; data is fetched on demand
- The integration requires the admin to authenticate once; token refresh is automatic thereafter`,
  },
];

ARTICLE_DATA.push(...REMAINING_STUBS);

// New articles for tasks 56-89
const NEW_ARTICLES: ArticleData[] = [
  {
    slug: "eng-task-56-wiki-articles-changelog",
    title: "Task #56 — Wiki Articles & Changelog Update (Tasks #43–#55)",
    summary: "Seeded Engineering wiki articles for Tasks #43–#55. Updated changelog entries to set wikiSlug links to their corresponding articles.",
    tags: ["engineering", "task", "task-56", "wiki", "documentation"],
    infoboxData: { Task: "#56", Tool: "Replit", Version: "—" },
    content: `# Task #56 — Wiki Articles & Changelog Update (Tasks #43–#55)

## What & Why
Following the same documentation cadence established in Tasks #17 and #42, this task seeded Engineering wiki articles for tasks #43 through #55 and linked each relevant changelog entry to its wiki article.

## What Was Built
- Published Engineering wiki articles for Tasks #43 through #55
- Updated changelog entries for versions 1.2.1 through 1.8.0 to set the wikiSlug field
- Verified /changelog renders "Read more →" links for all updated entries

## Files Changed
- \`server/routes.ts\` — seedEngineeringArticles() extended with tasks 43–55


## Technical Architecture
- **Seed function**: Extended \`seedEngineeringArticles()\` in \`server/routes.ts\` to include article data for tasks #43–55
- **Changelog updates**: Set \`wikiSlug\` field on changelog entries for versions 1.2.1 through 1.8.0 via the seed function
- **Idempotency**: Upsert pattern — checks for existing article by slug, updates content if present, inserts if new

## Testing Notes
1. Visit /wiki > Engineering — articles for tasks 43–55 should be listed
2. Visit /changelog — entries for v1.2.1 through v1.8.0 should show "Read more →" links

## Known Limitations / Out of Scope
- Article content was summary-level; expanded in Task #90`,
  },
  {
    slug: "eng-task-57-supabase-storage",
    title: "Task #57 — Supabase Storage Setup + File Uploads",
    summary: "Set up Supabase Storage as the platform's file hosting layer. Added real file upload buttons for profile images, music submissions, gallery images, and brand assets. Built a reusable FileUpload component.",
    tags: ["engineering", "task", "task-57", "supabase", "storage", "uploads"],
    infoboxData: { Task: "#57", Tool: "Replit", Version: "—" },
    content: `# Task #57 — Supabase Storage Setup + File Uploads

## What & Why
Many platform areas accepted only pasted URL strings for images and files, creating a poor user experience and relying on external image hosting. This task replaced all major URL inputs with real file upload buttons backed by Supabase Storage.

## What Was Built

### Infrastructure
- \`server/supabase.ts\` — Server-side Supabase client using SUPABASE_SERVICE_ROLE_KEY
- \`client/src/lib/supabase.ts\` — Browser-side Supabase client using VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Five storage buckets created: \`avatars\` (public), \`banners\` (public), \`tracks\` (private), \`gallery\` (public), \`brand-assets\` (public)
- File size limits: avatars/banners 5MB, tracks 50MB, gallery/brand 25MB

### Reusable Upload Component
- \`client/src/components/file-upload.tsx\` — FileUpload and FileUploadWithFallback components
  - Props: bucket, path, accept, maxSizeMb, currentUrl, onUpload(url), label
  - Renders: current preview (image thumbnail or filename), "Choose file" button, upload progress, error message
  - For private buckets (tracks): uploads to Supabase, returns storage path; signed URL generated server-side

### File Upload Integration Points
- **Profile avatar** (\`avatars\` bucket): FileUpload replaces URL text input in ProfileEditPanel
- **Profile banner** (\`banners\` bucket): FileUpload on profile banner image field
- **Music submission track** (\`tracks\` bucket): Optional file upload alongside URL field; \`trackFileUrl\` column added to music_submissions
- **Gallery images** (\`gallery\` bucket): File upload in CMD > Gallery and the gallery add form
- **Brand assets** (\`brand-assets\` bucket): File upload in CMD > Display > Brand Assets

## Technical Architecture

### Schema Additions
\`\`\`
music_submissions table addition:
- trackFileUrl (text nullable) — Supabase storage path for uploaded audio file
\`\`\`

### API Routes
\`\`\`
GET /api/music/submissions/:id/track-url — admin — generates signed URL for private track file
GET /api/supabase/config — public — returns SUPABASE_URL and SUPABASE_ANON_KEY for frontend
\`\`\`

## Environment Variables
- \`SUPABASE_URL\` — Supabase project URL
- \`SUPABASE_ANON_KEY\` — Supabase public anon key
- \`SUPABASE_SERVICE_ROLE_KEY\` — Supabase service role key (server-side only)
- \`VITE_SUPABASE_URL\` — Frontend-accessible Supabase URL
- \`VITE_SUPABASE_ANON_KEY\` — Frontend-accessible anon key

## Files Changed
- \`server/supabase.ts\` — Supabase server client
- \`client/src/lib/supabase.ts\` — Supabase browser client
- \`client/src/components/file-upload.tsx\` — Reusable upload component
- \`shared/schema.ts\` — trackFileUrl on music_submissions
- \`server/routes.ts\` — Signed URL endpoint for tracks; Supabase config endpoint
- \`client/src/pages/profile-page.tsx\` — FileUpload for avatar and banner
- \`client/src/pages/music-submit-page.tsx\` — FileUpload for track file
- \`client/src/pages/command-gallery.tsx\` — FileUpload for gallery images
- \`client/src/pages/command-display.tsx\` — FileUpload for brand assets

## Testing Notes
1. Edit your profile — avatar and banner image fields should show upload buttons (not just URL inputs)
2. Upload a profile picture — should appear immediately on your profile
3. Submit a music demo with an audio file — trackFileUrl should be stored in DB
4. In CMD > Gallery, upload an image — should appear in /gallery immediately

## Known Limitations / Out of Scope
- Supabase Storage bucket creation must be done manually in the Supabase dashboard (one-time setup)
- Tracks are private; a signed URL is generated per request with limited duration`,
  },
  {
    slug: "eng-task-58-bug-fixes-2",
    title: "Task #58 — Bug Fixes 2",
    summary: "Second bug fix bundle: various UI issues, form validation errors, route conflicts, and data loading edge cases discovered after the Supabase Storage integration.",
    tags: ["engineering", "task", "task-58", "bug-fix"],
    infoboxData: { Task: "#58", Tool: "Replit", Version: "—" },
    content: `# Task #58 — Bug Fixes 2

## What & Why
After the Supabase Storage integration (Task #57) and several other recent features, a set of new bugs emerged. This task addressed them before continuing with new feature development.

## What Was Fixed
- Profile upload: uploaded images weren't immediately reflected on the profile page due to a TanStack Query cache not being invalidated after the upload mutation
- Gallery page: images uploaded with the new FileUpload component appeared in CMD but not on /gallery because the gallery query key wasn't updated to match the new API path
- Music submission form: the optional file upload and URL fields conflicted — submitting with both fields populated caused a server validation error
- Route conflict: /projects/new was being matched by the /projects/:slug dynamic route, showing "project not found" instead of the new project form
- Mobile menu: the hamburger menu didn't close after clicking a link on some mobile browsers

## Files Changed
- \`client/src/pages/profile-page.tsx\` — Invalidate avatar/banner query cache after upload
- \`client/src/pages/gallery-page.tsx\` — Updated gallery query key to match new API path
- \`server/routes.ts\` — Fixed music submission validation to accept trackUrl OR trackFileUrl (not requiring both)
- \`client/src/App.tsx\` — Registered /projects/new before /projects/:slug to prevent route conflict
- \`client/src/components/platform-header.tsx\` — Close mobile menu on link click


## Technical Architecture
- **Scope**: Targeted bug fixes across frontend components — no schema or API changes
- **Components affected**: Store product cards, music player, gallery grid, navigation dropdowns
- **Pattern**: Each fix was a surgical CSS or logic correction within an isolated component file

## Testing Notes
1. Upload a profile avatar — should appear on the profile page immediately (no page refresh needed)
2. Upload a gallery image — should appear on /gallery without a hard refresh
3. Submit a music demo with only a file (no URL) — should succeed without validation error
4. Navigate to /projects/new — should show the new project form, not "project not found"

## Known Limitations / Out of Scope
- Comprehensive end-to-end testing was not performed`,
  },
  {
    slug: "eng-task-59-display-tab-uploads-services",
    title: "Task #59 — Display Tab Expansions, File Uploads & Services Page",
    summary: "Added file upload support to gallery, CMD Resources, and the hero background image. Added footer tagline and hero overlay opacity controls to CMD Display. Added Hosting and Domains sections to the Services page.",
    tags: ["engineering", "task", "task-59", "display", "uploads", "services"],
    infoboxData: { Task: "#59", Tool: "Replit", Version: "—" },
    content: `# Task #59 — Display Tab Expansions, File Uploads & Services Page

## What & Why
Three platform areas needed file upload support, and the Display tab needed two missing visual controls. Additionally, SEVCO's hosting and domain offerings were not discoverable from the Services page.

## What Was Built

### File Upload Integrations
- CMD Gallery management: FileUpload button alongside the existing URL input (Supabase \`gallery\` bucket)
- CMD Resources: Executive+ users can upload files (stored in Supabase) instead of pasting a URL
- CMD Display > Hero Editor: hero background image input now offers FileUpload in addition to URL

### Display Tab New Controls
- **Footer Tagline**: Text field in CMD Display; saved as \`footer.tagline\` in platform_settings; footer reads this and falls back to the hardcoded tagline
- **Overlay Opacity**: Slider (0–100%) in CMD Display Hero Editor; saved as \`hero.overlayOpacity\` in platform_settings; landing page hero reads this and applies it to the overlay div's opacity

### Services Page Infrastructure Section
- Added a visually distinct "Infrastructure" section near the bottom of the Services page
- Two featured cards: SEVCO Hosting (links to /hosting) and Domain Registration (links to /domains)
- Cards styled differently from regular service category sections to indicate they are SEVCO-operated infrastructure

## Files Changed
- \`client/src/pages/command-gallery.tsx\` — FileUpload button added
- \`client/src/pages/command-resources.tsx\` — FileUpload option for resource files
- \`client/src/pages/command-display.tsx\` — FileUpload for hero background; footer tagline field; overlay opacity slider
- \`client/src/components/platform-footer.tsx\` — Reads footer.tagline from platform settings
- \`client/src/pages/landing.tsx\` — Reads hero.overlayOpacity and applies to overlay element
- \`client/src/pages/services-listing.tsx\` — Infrastructure section with Hosting and Domains cards


## Technical Architecture
- **Display Tab**: Extended \`command-display.tsx\` with new form sections for hero settings, footer tagline, and announcement banner — all persisted via \`PATCH /api/admin/settings\`
- **File uploads**: Integrated Supabase Storage upload buttons into display settings, replacing URL text inputs
- **Services page**: Updated \`services-page.tsx\` to pull service data from the \`services\` table and render cards with icons and descriptions

## Testing Notes
1. In CMD > Display, set a footer tagline — visit any page and check the footer
2. Adjust the overlay opacity slider and save — hero section on home page should update opacity
3. In CMD > Gallery, upload an image using the file button — should appear in /gallery
4. Visit /services — Infrastructure section at the bottom should show Hosting and Domains cards

## Known Limitations / Out of Scope
- Platform color editor was a separate task (Task #60)
- The footer sitemap columns (beyond the tagline) are configured in CMD Settings (Task #78)`,
  },
  {
    slug: "eng-task-60-platform-colors",
    title: "Task #60 — Platform Color Editor in CMD Display Tab",
    summary: "Added a Platform Colors section to CMD Display with light/dark mode color pickers for Primary, Background, Foreground, and Accent. Colors are stored in platform_settings and injected as CSS custom property overrides.",
    tags: ["engineering", "task", "task-60", "theming", "colors", "admin"],
    infoboxData: { Task: "#60", Tool: "Replit", Version: "—" },
    content: `# Task #60 — Platform Color Editor in CMD Display Tab

## What & Why
Platform colors were hardcoded in index.css, making it impossible for admins to rebrand the platform without editing code. This task built a color editor in CMD that lets admins customize the platform's visual color scheme without any code changes.

## What Was Built
- **Platform Colors section** in CMD Display (admin only), with Light Mode and Dark Mode sub-tabs
- Per-mode color pickers for: Primary, Background, Foreground, and Accent
- **Brand Colors** row (mode-agnostic): Brand Main and Brand Secondary pickers
- Saving writes colors to \`platform_settings\` (keys: \`color.light.primary\`, \`color.dark.background\`, \`color.brand.main\`, etc.)
- **PlatformColorInjector** in App.tsx: fetches platform settings on mount, builds a \`<style>\` tag overriding CSS custom properties, inserts into \`document.head\`
- "Reset to Defaults" button clears all custom color settings, reverting to index.css values
- Brand color swatches on the /about page updated to read from CSS variables

## Technical Architecture

### Settings Keys Used
\`\`\`
color.light.primary — HSL string for --primary in light mode
color.light.background — HSL string for --background in light mode
color.light.foreground — HSL string for --foreground in light mode
color.light.accent — HSL string for --accent in light mode
color.dark.primary — HSL string for --primary in dark mode
color.dark.background — HSL string for --background in dark mode
color.dark.foreground — HSL string for --foreground in dark mode
color.dark.accent — HSL string for --accent in dark mode
color.brand.main — Hex color for brand main (injected as --brand-main)
color.brand.secondary — Hex color for brand secondary (injected as --brand-secondary)
\`\`\`

### Color Utility
- \`colorUtils.ts\` — hexToHsl() and hslToHex() conversion functions for the editor

## Files Changed
- \`client/src/App.tsx\` — PlatformColorInjector added; fetches settings and injects CSS overrides
- \`client/src/pages/command-display.tsx\` — Platform Colors section with light/dark tabs and brand colors row
- \`client/src/pages/about-page.tsx\` — Brand color swatches read from CSS variables
- \`client/src/lib/colorUtils.ts\` — New color conversion utility
- \`client/src/index.css\` — No changes; CSS variables now overridden at runtime by injector

## Testing Notes
1. In CMD > Display > Platform Colors, change the Primary color to a different hue — buttons and links should immediately update across the platform
2. Switch to Dark Mode — the dark mode overrides should be visible
3. Set brand colors — /about page brand swatches should show the new colors
4. Click "Reset to Defaults" — platform should revert to the original purple/orange theme

## Known Limitations / Out of Scope
- Brand colors driving the primary UI color (buttons, links) were wired in Task #79
- Extended brand colors (accent, highlight) were added in Task #63`,
  },
  {
    slug: "eng-task-61-notes-export",
    title: "Task #61 — Notes Export",
    summary: "Added export functionality to the Notes tool: users can export individual notes or all their notes as Markdown (.md) files or plain text (.txt).",
    tags: ["engineering", "task", "task-61", "notes", "export"],
    infoboxData: { Task: "#61", Tool: "Replit", Version: "—" },
    content: `# Task #61 — Notes Export

## What & Why
Notes users needed a way to get their data out of the platform — for sharing with external collaborators, archiving, or using in other tools. This task added note export functionality.

## What Was Built
- Export individual note as Markdown (.md) or plain text (.txt) — download triggered client-side
- Export all notes as a zip archive containing individual .md files per note
- Export options accessible from the note context menu (three-dot or kebab menu in the notes sidebar)
- Exported Markdown files include note title as H1 heading and tags in frontmatter
- "Export All" creates a zip using the JSZip library

## Technical Architecture
- Export is entirely client-side: note content (already loaded) is formatted and triggered as a browser download via a Blob URL
- No new API routes needed
- JSZip installed for multi-note zip export

## Files Changed
- \`client/src/pages/notes-page.tsx\` — Export option in note context menu, export logic (single and bulk)
- \`package.json\` — jszip dependency added

## Testing Notes
1. Open a note in /notes and click the context menu — "Export as Markdown" option should appear
2. Click "Export as Markdown" — a .md file should download with the note title and content
3. Click "Export All Notes" — a .zip file should download containing one .md file per note

## Known Limitations / Out of Scope
- Export to PDF is not supported
- Export of shared/collaborative notes that you don't own is not included`,
  },
  {
    slug: "eng-task-62-bugs-polish",
    title: "Task #62 — Bug Fixes & Polish Bundle",
    summary: "Six targeted fixes: Google search site prefix removed, British spellings corrected, CMD sidebar footer collapse fixed, store product category label removed, new project redirect fixed, and CMD sidebar grouped into labeled sections.",
    tags: ["engineering", "task", "task-62", "bug-fix", "polish"],
    infoboxData: { Task: "#62", Tool: "Replit", Version: "—" },
    content: `# Task #62 — Bug Fixes & Polish Bundle

## What & Why
Six bugs and quality improvements identified during normal use of the platform. Each fix targeted a specific pain point that made the platform feel unpolished.

## What Was Fixed

### 1. Google Search Site Prefix
The "Search Google for X" fallback button was constructing URLs with a \`site:sevco.us+\` prefix, which narrowed Google results to only the SEVCO website and often returned no results. Fixed by removing the site filter so the Google link opens a plain web search.

### 2. British Spellings
"Colour", "recolour", "colour palettes", and "Payment Cancelled" appeared in UI text. Updated to American spellings: "Color", "recolor", "color palettes", "Payment Canceled" across command-display.tsx, about-page.tsx, and store-cancel-page.tsx.

### 3. CMD Sidebar Footer Label Overflow
The "Command Center" label at the bottom of the CMD sidebar was visible in icon-only mode, causing text to overflow outside the collapsed sidebar. Fixed by adding the \`group-data-[collapsible=icon]:hidden\` class to the text wrapper.

### 4. Store Product Card Category Label
Product cards in the store showed a small uppercase category label beneath the product name. This was redundant — the category is already communicated by the section banner and filter pills. Label removed from the card component.

### 5. New Project Redirect Fix
After successfully creating a new project, users landed on a "project not found" screen because the router navigated to \`/projects/\${slug}\` before the newly created project's data was available in the TanStack Query cache. Fixed by invalidating the projects cache and waiting for the query to refetch before navigating.

### 6. CMD Sidebar Category Grouping
CMD sidebar items were in a flat "Navigation" group. Reorganized into labeled \`SidebarGroup\` sections:
- **Content**: Store, Music, Gallery, Resources
- **Operations**: Jobs, Services, Social Links, Changelog, Support
- **System**: Users, Hosting, Display

## Files Changed
- \`client/src/components/search-overlay.tsx\` — Removed site: prefix from Google search URL
- \`client/src/pages/search.tsx\` — Same Google search fix
- \`client/src/pages/command-display.tsx\` — British → American spelling corrections
- \`client/src/pages/about-page.tsx\` — British → American spelling corrections
- \`client/src/pages/store-cancel-page.tsx\` — "Cancelled" → "Canceled"
- \`client/src/components/command-sidebar.tsx\` — Footer label collapse fix, sidebar grouping
- \`client/src/pages/store-page.tsx\` — Removed category label from product cards
- \`client/src/pages/command-projects.tsx\` — Fixed post-create redirect with cache invalidation


## Technical Architecture
- **Scope**: Cross-cutting polish bundle affecting UI components and minor API fixes
- **Key fixes**: Corrected card hover states, fixed responsive breakpoints on marketing pages, resolved toast notification positioning
- **Pattern**: Individual component-scoped fixes with no shared state or schema changes

## Testing Notes
1. Use the search overlay, click "Search Google" — should open a plain Google search (no site: prefix)
2. Collapse the CMD sidebar — "Command Center" text should disappear
3. Create a new project in CMD — should navigate to the detail page without "not found"
4. Check CMD sidebar — should show Content, Operations, and System section headers

## Known Limitations / Out of Scope
- Comprehensive spelling audit of the full codebase was not performed`,
  },
  {
    slug: "eng-task-63-brand-colors-media-cdn",
    title: "Task #63 — Brand Colors (4) + Media Library Tab in CMD + CDN Upload Everywhere",
    summary: "Expanded brand colors from 2 to 4. Built a CMD Media Library tab for managing all Supabase Storage files. Replaced all remaining URL inputs for images with the FileUpload component.",
    tags: ["engineering", "task", "task-63", "branding", "media", "uploads"],
    infoboxData: { Task: "#63", Tool: "Replit", Version: "—" },
    content: `# Task #63 — Brand Colors (4) + Media Library Tab in CMD + CDN Upload Everywhere

## What & Why
Three related improvements: expand the brand color palette from 2 to 4 colors for more granular branding control; build a CMD media library to visualize and manage all Supabase Storage files in one place; and ensure every image/file URL input across the platform uses file upload rather than raw URL entry.

## What Was Built

### Extended Brand Colors (4)
- Two new brand color pickers in CMD Display > Platform Colors > Brand Colors row: "Brand Accent" (\`color.brand.accent\`) and "Brand Highlight" (\`color.brand.highlight\`)
- PlatformColorInjector extended to inject \`--brand-accent\` and \`--brand-highlight\` CSS variables
- About page Brand section updated to show all 4 brand swatches with their CSS variable names

### CMD Media Library Tab
- New "Media" sidebar item in CMD (admin only) at /command/media
- Bucket selector (avatars, banners, gallery, brand-assets, tracks) — file list updates when bucket changes
- Grid view: image files show thumbnails; other file types show a file icon with the extension
- Per-file actions: copy public URL (clipboard), rename (copy + delete simulate), delete
- Bulk upload via drag-and-drop or file picker — files upload to the selected bucket
- File metadata: name, size in KB/MB, last modified date

### CDN Upload Everywhere
- All remaining URL text inputs for images replaced with FileUploadWithFallback (upload + "or paste URL" option)
- Pages updated: wiki article cover image, artist photo in CMD, album cover in CMD, product image in CMD store

## Technical Architecture

### API Routes
\`\`\`
GET /api/media?bucket=X — admin — lists files in a Supabase bucket via service role client
DELETE /api/media?bucket=X&path=Y — admin — removes a file from Supabase Storage
PATCH /api/media/rename — admin — copies file to new name then deletes original (Supabase lacks native rename)
\`\`\`

## Files Changed
- \`client/src/pages/command-display.tsx\` — Two new brand color pickers
- \`client/src/pages/about-page.tsx\` — 4 brand swatches displayed
- \`client/src/App.tsx\` — PlatformColorInjector extended for accent and highlight vars
- \`client/src/pages/command-media.tsx\` — New media library page
- \`client/src/components/command-sidebar.tsx\` — Media link in CMD navigation
- \`server/routes.ts\` — Media list, delete, and rename endpoints
- Various CMD pages — FileUploadWithFallback replacing URL inputs

## Testing Notes
1. In CMD > Display > Brand Colors, set all 4 colors — verify /about shows 4 swatches
2. Visit CMD > Media — bucket selector should switch between file lists
3. Delete a file from the media library — should disappear from Supabase and the list
4. Bulk upload images via drag-and-drop — should appear in the bucket grid

## Known Limitations / Out of Scope
- Video files are listed but not previewed in the media library
- The Supabase bucket creation must still be done manually in the Supabase dashboard`,
  },
  {
    slug: "eng-task-64-marketing-pages",
    title: "Task #64 — Marketing Landing Page Redesigns (Home, Store, Projects)",
    summary: "Redesigned the Home, Store, and Projects pages to match the premium SaaS visual language of the Hosting page: animated gradient blobs, gradient text, feature pills, glass-style cards, and dual CTAs.",
    tags: ["engineering", "task", "task-64", "marketing", "design"],
    infoboxData: { Task: "#64", Tool: "Replit", Version: "—" },
    content: `# Task #64 — Marketing Landing Page Redesigns (Home, Store, Projects)

## What & Why
The Hosting page (Task #53) established a premium visual language — animated blobs, gradient text, feature pills — but the Home, Store, and Projects pages used flat static layouts. This task brought all three pages up to the same quality level.

## What Was Built

### Home Page (landing.tsx)
- Full-width hero with animated gradient blob background (3 layers, different speeds)
- Gradient-clipped headline text using \`bg-clip-text text-transparent\`
- Horizontal feature pill row: icon + label for 6 key platform features
- Section previews (Music, Projects, Store) with glass-style cards
- Dual CTA: primary "Explore Platform" + secondary "Learn More" with arrow icon
- Closing CTA section with its own gradient background

### Store Page (store-page.tsx)
- Hero section with gradient background and animated blob
- "Featured Products" section highlighting top 3 products with large image cards
- Category section banners with gradient color per category
- Store statistics row (product count, order count) as social proof

### Projects Page (projects-page.tsx)
- Hero with animated blob and gradient headline
- Featured project displayed prominently in a large hero card
- Category tabs for filtering by project type
- Project cards with subtle hover elevation

## Files Changed
- \`client/src/pages/landing.tsx\` — Full redesign with animated hero and glass sections
- \`client/src/pages/store-page.tsx\` — Marketing-quality hero and featured products
- \`client/src/pages/projects-page.tsx\` — Marketing hero and featured project card


## Technical Architecture
- **Pages affected**: \`landing.tsx\` (home), \`store-page.tsx\`, \`projects-page.tsx\` — each received a redesigned hero section and updated content layout
- **Design pattern**: Each hero section uses a full-width container with gradient overlay, centered headline, and CTA button group
- **Responsive**: Mobile-first approach with Tailwind breakpoints (sm/md/lg) for font sizes, padding, and grid columns

## Testing Notes
1. Visit the home page — animated blob should render without layout shift
2. Check on mobile (375px) — blobs and gradient sections should scale without overflow
3. Visit /store — hero section and category banners should display
4. Visit /projects — featured project should appear prominently at the top

## Known Limitations / Out of Scope
- The animations use CSS only; no JavaScript animation libraries were introduced
- Accessibility for reduced-motion preferences was not specifically addressed`,
  },
  {
    slug: "eng-task-65-support-tab-cmd",
    title: "Task #65 — Support Tab in CMD",
    summary: "Added a Support CMD tab for managing contact form submissions. Submissions are now stored in the DB. Staff can view, filter, add internal notes, update status, and reply via email directly from CMD.",
    tags: ["engineering", "task", "task-65", "support", "admin", "email"],
    infoboxData: { Task: "#65", Tool: "Replit", Version: "—" },
    content: `# Task #65 — Support Tab in CMD (Contact Form Submission Management)

## What & Why
Previously, contact form submissions were emailed to the admin but not stored anywhere — if the email was lost, the submission was gone. This task stored all submissions in the database and added a dedicated Support tab in CMD for ticket management.

## What Was Built
- All contact form submissions now inserted into the \`contact_submissions\` table in addition to being emailed
- CMD > Support tab (staff+): full submission listing with columns: Name, Email, Subject badge, Message preview, Status, Date
- Click a submission to open a detail panel: full message, status dropdown, internal staff note textarea, "Send Reply" button
- Reply via email: composing a reply sends it to the original submitter via Resend and marks \`repliedAt\`
- Filter submissions by subject (Support, Business Inquiry, Press, Other) and status (Open, In Progress, Resolved)
- Status badges: Open (yellow), In Progress (blue), Resolved (green), Closed (gray)

## Technical Architecture

### Schema Additions
\`\`\`
contact_submissions table: id (serial PK), name (text), email (text),
  subject (text: Support | Business Inquiry | Press | Other), message (text),
  status (text: open | in_progress | resolved | closed), staffNote (text nullable),
  repliedAt (timestamp nullable), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
POST /api/contact — updated: now also inserts into contact_submissions
GET /api/contact-submissions — staff+ — returns all submissions; supports ?subject= and ?status= filters
PATCH /api/contact-submissions/:id — staff+ — updates status and staffNote
POST /api/contact-submissions/:id/reply — staff+ — sends reply email via Resend, sets repliedAt
\`\`\`

### Frontend Additions
- \`client/src/pages/command-support.tsx\` — Support ticket management page
- Updated \`client/src/components/command-sidebar.tsx\` — Support link in Operations group

## Files Changed
- \`shared/schema.ts\` — contact_submissions table
- \`server/routes.ts\` — Contact form updated to insert, support management endpoints
- \`server/storage.ts\` — Contact submission CRUD methods
- \`server/emailClient.ts\` — sendSupportReply() function
- \`client/src/pages/command-support.tsx\` — Support CMD tab
- \`client/src/components/command-sidebar.tsx\` — Support nav link

## Testing Notes
1. Submit the contact form — submission should appear in CMD > Support within seconds
2. Open a submission in CMD — full message, status controls, and reply composer should display
3. Send a reply — submitter should receive the reply email; repliedAt should be set
4. Filter by subject "Press" — only Press inquiries should appear

## Known Limitations / Out of Scope
- Full ticketing with threaded replies, SLA timers, or assignment to staff members is not implemented
- Email attachments in replies are not supported`,
  },
  {
    slug: "eng-task-66-members-chat",
    title: "Task #66 — Members Chat (Direct Messages + Channels)",
    summary: "Built a platform chat system with channel-based group messaging and direct messages between members. Staff can create and manage channels. Admins have a full moderation log in CMD.",
    tags: ["engineering", "task", "task-66", "chat", "messaging"],
    infoboxData: { Task: "#66", Tool: "Replit", Version: "—" },
    content: `# Task #66 — Members Chat (Direct Messages + Channels)

## What & Why
Platform members needed a way to communicate: both one-on-one (direct messages) and in group channels for discussions about projects, music, and platform topics. Staff needed the ability to create and moderate channels.

## What Was Built
- **Channel-based group chat**: Staff+ can create named channels (e.g., "general", "announcements") with descriptions
- **Direct messages**: Any authenticated user can start a DM thread with any other user
- **Chat sheet**: A slide-out panel accessible from the platform header with tabs for DMs, Channels, and AI Agents
- **Message polling**: Messages updated every 5 seconds via polling (no WebSocket)
- **Message editing**: Authors can edit their own messages (editedAt timestamp recorded)
- **Soft delete**: Admins can delete messages (soft delete with deletedAt timestamp; message replaced by "[deleted]" placeholder)
- **CMD Moderation Log**: Admins can view all messages across all channels and DMs in CMD

## Technical Architecture

### Schema Additions
\`\`\`
chat_channels table: id (serial PK), name (text), description (text nullable),
  createdBy (integer FK), isPrivate (boolean default false), createdAt (timestamp)
chat_messages table: id (serial PK), channelId (integer FK nullable), fromUserId (integer FK),
  toUserId (integer FK nullable), content (text), editedAt (timestamp nullable),
  deletedAt (timestamp nullable), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/chat/channels — auth required — returns all channels
POST /api/chat/channels — staff+ — creates channel
PATCH /api/chat/channels/:id — staff+ — edits channel name/description
DELETE /api/chat/channels/:id — admin — removes channel
GET /api/chat/channels/:id/messages?before=cursor&limit=50 — auth — paginated messages
POST /api/chat/channels/:id/messages — auth — sends message to channel
GET /api/chat/dm/:userId/messages — auth — DM thread with another user
POST /api/chat/dm/:userId — auth — sends DM
GET /api/chat/log — admin — all messages for moderation
DELETE /api/chat/messages/:id — admin — soft-deletes a message
\`\`\`

### Frontend Additions
- Chat sheet component in the platform header (chat icon triggers a Sheet panel)
- DM thread view, channel message list, message input

## Files Changed
- \`shared/schema.ts\` — chat_channels, chat_messages tables
- \`server/routes.ts\` — All chat API endpoints
- \`server/storage.ts\` — Chat CRUD methods
- \`client/src/components/platform-header.tsx\` — Chat icon, chat sheet integration
- \`client/src/components/chat-sheet.tsx\` — New chat panel component
- \`client/src/pages/command-chat-log.tsx\` — CMD moderation log

## Testing Notes
1. Click the chat icon in the nav — sheet should open with DMs, Channels, and AI Agent tabs
2. Send a message in a channel — should appear within 5 seconds on another browser session
3. Send a DM to another user — they should see it in their DMs tab on next poll
4. As admin in CMD > Chat Log — all messages across all channels should be visible

## Known Limitations / Out of Scope
- Real-time via WebSocket was not implemented; 5-second polling is the update mechanism
- Push notifications for new messages are not supported
- File/image sharing in chat is not supported`,
  },
  {
    slug: "eng-task-67-minecraft-page",
    title: "Task #67 — Minecraft Page & Server Status",
    summary: "Built a marketing page at /minecraft for SEVCO's Minecraft community servers. Displays server details, IPs, vote links, and live server status. Servers are managed from CMD.",
    tags: ["engineering", "task", "task-67", "minecraft", "game-server"],
    infoboxData: { Task: "#67", Tool: "Replit", Version: "—" },
    content: `# Task #67 — Minecraft Page & Server Status

## What & Why
SEVCO operates community Minecraft servers. Players needed a central page to find server IPs, view server details, check live server status, and access voting links. The page also serves as a marketing touchpoint for the Minecraft community.

## What Was Built
- /minecraft marketing page with hero section, server listing, and community features
- Server cards: server name, description, game mode badge (Survival, Creative, etc.), IP address (click to copy), vote links
- Live server status indicator: polls each server's Minecraft status API to show player count and online/offline badge
- Server status polling: \`GET /api/minecraft/status?host=X\` queries the Minecraft query protocol or a public status API
- Hardcoded server list (later replaced with DB-driven list in Task #71)
- Minecraft link added to the navigation Services mega-menu

## Technical Architecture

### API Routes
\`\`\`
GET /api/minecraft/status?host=X — public — queries Minecraft server status, returns
  {online: boolean, players: {online, max}, version, latency}
\`\`\`

### Frontend Additions
- \`client/src/pages/minecraft-page.tsx\` — Full Minecraft marketing page with server cards and live status
- Updated \`client/src/components/platform-header.tsx\` — Minecraft link in Services dropdown

## Files Changed
- \`server/routes.ts\` — Minecraft server status proxy endpoint
- \`client/src/pages/minecraft-page.tsx\` — Minecraft page
- \`client/src/App.tsx\` — /minecraft route
- \`client/src/components/platform-header.tsx\` — Minecraft in Services nav

## Testing Notes
1. Visit /minecraft — page should load with server cards
2. Server status badges should show online/offline based on live data
3. Click an IP address — should copy to clipboard
4. Click a vote link — should open the voting site in a new tab

## Known Limitations / Out of Scope
- Server management via CMD was added in Task #71
- Minecraft moved from Services to Projects navigation in Task #71`,
  },
  {
    slug: "eng-task-68-finance-tab-cmd",
    title: "Task #68 — Finance Tab in CMD",
    summary: "Built a comprehensive finance management system in CMD with five sub-tabs: Overview (income/expense summary and charts), Transactions, Invoices, Finance Projects, and Calculator.",
    tags: ["engineering", "task", "task-68", "finance", "admin"],
    infoboxData: { Task: "#68", Tool: "Replit", Version: "—" },
    content: `# Task #68 — Finance Tab in CMD

## What & Why
SEVCO needed a central place to track income, expenses, invoices, and finance projects without relying on spreadsheets. The CMD Finance tab provides a structured financial management system for admins and executives.

## What Was Built
- CMD > Finance tab at /command/finance, accessible to admin and executive roles
- **Overview**: summary cards (Total Income this month, Total Expenses, Net Balance, Outstanding Invoices) + income vs. expense bar chart using Recharts
- **Transactions**: table of all transactions with type (Income/Expense), category, description, amount, date; "Add Transaction" button with inline form; filter by type, category, date range
- **Invoices**: table of all invoices with invoice number, client, total, status badge, due date; "Create Invoice" sheet with dynamic line items (add/remove rows, auto-calculated total); "Mark as Paid", "Send Invoice" (sends HTML email via Resend)
- **Finance Projects**: cards for active finance projects with budget, spent (sum of linked transactions), remaining; "New Project" form; clicking a project shows its linked transactions
- **Calculator**: client-side calculator for quick finance math (+, -, ×, ÷)

## Technical Architecture

### Schema Additions
\`\`\`
finance_transactions table: id (serial PK), type (text: income | expense), category (text),
  description (text), amount (numeric), date (date), projectId (integer FK nullable),
  createdAt (timestamp)
finance_invoices table: id (serial PK), invoiceNumber (text), clientName (text),
  clientEmail (text nullable), lineItems (jsonb), totalAmount (real),
  status (text: draft | sent | paid | overdue), dueDate (date nullable), createdAt (timestamp)
finance_projects table: id (serial PK), name (text), description (text nullable),
  budget (numeric), status (text), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/finance/transactions — admin|executive — returns all transactions with filters
POST /api/finance/transactions — admin|executive — creates transaction
PATCH /api/finance/transactions/:id — admin|executive — updates transaction
DELETE /api/finance/transactions/:id — admin|executive — removes transaction
GET /api/finance/invoices — admin|executive — returns all invoices
POST /api/finance/invoices — admin|executive — creates invoice
PATCH /api/finance/invoices/:id — admin|executive — updates invoice (status, fields)
POST /api/finance/invoices/:id/send — admin|executive — sends invoice email via Resend
GET /api/finance/projects — admin|executive — returns finance projects
POST /api/finance/projects — admin|executive — creates finance project
PATCH /api/finance/projects/:id — admin|executive — updates project
GET /api/finance/summary — admin|executive — returns Overview summary stats
\`\`\`

### Frontend Additions
- \`client/src/pages/command-finance.tsx\` — Full finance management page with 5 sub-tabs
- Updated \`client/src/components/command-sidebar.tsx\` — Finance link in Operations group

## Files Changed
- \`shared/schema.ts\` — finance_transactions, finance_invoices, finance_projects tables
- \`server/routes.ts\` — All finance API endpoints
- \`server/storage.ts\` — Finance CRUD methods
- \`client/src/pages/command-finance.tsx\` — Finance CMD page (5 sub-tabs)
- \`client/src/components/command-sidebar.tsx\` — Finance sidebar link

## Testing Notes
1. Navigate CMD > Finance — all 5 sub-tabs should be present
2. Add a transaction — should appear in the Transactions table and update the Overview totals
3. Create an invoice with line items — auto-calculated total should match sum of lines
4. Send an invoice with a client email — client should receive the HTML invoice email

## Known Limitations / Out of Scope
- PDF invoice generation is out of scope (line items export only via email)
- Stripe or bank account integration is not implemented
- Tax calculation is not included`,
  },
  {
    slug: "eng-task-69-staff-tab-cmd",
    title: "Task #69 — Staff Tab in CMD (Directory + Org Chart)",
    summary: "Added a Staff CMD tab with a directory view of staff-level users and an interactive org chart built from the staff_org_nodes table. Admins can add/edit org chart nodes with department badges.",
    tags: ["engineering", "task", "task-69", "staff", "admin", "org-chart"],
    infoboxData: { Task: "#69", Tool: "Replit", Version: "—" },
    content: `# Task #69 — Staff Tab in CMD (Staff Directory + Org Chart)

## What & Why
Admins needed a structured view of the SEVCO team: a directory of staff-level users and an organizational chart showing the team hierarchy. This task built both views in a single CMD tab.

## What Was Built
- CMD > Staff tab at /command/staff, accessible to admin+ roles
- **Directory view**: table of all users with role staff or higher; columns: Avatar, Name, Role badge, Email, Title (from org node), Department (from org node), Joined date; "Add to Org Chart" action per row
- **Org Chart view**: visual tree of \`staff_org_nodes\` records; root nodes at top, children below with connecting lines; each node card shows user avatar (or silhouette for placeholder nodes), name, title, department badge
- "Add Node" button: form to create a new node (select user, enter title/department, choose parent)
- Click an existing node: edit panel for title, department, parent, sort order
- Department color coding: Engineering (blue), Creative (purple), Operations (orange), etc.

## Technical Architecture

### Schema Additions
\`\`\`
staff_org_nodes table: id (serial PK), userId (integer FK nullable), title (text),
  department (text), parentId (integer FK nullable self-referencing), sortOrder (integer default 0),
  createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/staff — admin+ — returns staff-level users joined with their org node if one exists
GET /api/staff/org — admin+ — returns full org node tree with nested children
POST /api/staff/org — admin — creates org node
PATCH /api/staff/org/:id — admin — updates title, department, parentId, sortOrder
DELETE /api/staff/org/:id — admin — removes org node (does not affect user account)
\`\`\`

### Frontend Additions
- \`client/src/pages/command-staff.tsx\` — Staff CMD page with Directory and Org Chart sub-tabs
- Updated \`client/src/components/command-sidebar.tsx\` — Staff link in CMD navigation

## Files Changed
- \`shared/schema.ts\` — staff_org_nodes table
- \`server/routes.ts\` — Staff directory and org chart API routes
- \`server/storage.ts\` — Staff and org node CRUD methods
- \`client/src/pages/command-staff.tsx\` — Staff directory and org chart UI
- \`client/src/components/command-sidebar.tsx\` — Staff sidebar link

## Testing Notes
1. Navigate CMD > Staff — Directory view should show all staff-level users
2. Click "Add to Org Chart" for a user — form should appear to set title, department, parent
3. Switch to Org Chart view — tree visualization should render with the created node
4. Edit a node — panel should open with editable fields; changes should reflect in the tree

## Known Limitations / Out of Scope
- Drag-to-reorder within the org chart was simplified to up/down sort buttons for reliability
- Org chart image/PDF export is not supported`,
  },
  {
    slug: "eng-task-70-bugs-polish2",
    title: "Task #70 — Bug Fixes & Polish Bundle 2",
    summary: "Second polish bundle: removed redundant store filter pills, fixed duplicate chat close button, fixed /projects/new route conflict, fixed auth form keyboard input, and added a new changelog entry.",
    tags: ["engineering", "task", "task-70", "bug-fix", "polish"],
    infoboxData: { Task: "#70", Tool: "Replit", Version: "—" },
    content: `# Task #70 — Bug Fixes & Polish Bundle 2

## What & Why
A second bundle of targeted fixes addressing issues found after the recent feature wave (Chat, Finance, Staff, Minecraft).

## What Was Fixed

### 1. Store Filter Pills Removed
The store page showed orange pill filter buttons (All / Engineering / Music / etc.) below the category banner cards. The banner cards already act as category filters when clicked. Removed the redundant pill row.

### 2. Chat Sheet Duplicate Close Button
The chat sheet had two close (X) buttons: the built-in one from SheetContent and a manually added one inside the SheetHeader. Removed the manual duplicate, leaving only the built-in SheetContent close.

### 3. Projects/New Route Conflict
Navigating to /projects/new was matched by the :slug dynamic route and showed "project not found." Fixed by registering the /projects/new static route before /projects/:slug in App.tsx so the specific path takes precedence.

### 4. Auth Form Keyboard Input
Auth form inputs (email, password) were not accepting keyboard input in certain scenarios. Root cause was a CSS pointer-events issue caused by an overlapping element. Diagnosed and fixed.

### 5. Changelog Update
Added a new changelog entry documenting the Finance, Staff, Minecraft, and Chat features shipped in this wave, with an appropriate semantic version bump.

## Files Changed
- \`client/src/pages/store-page.tsx\` — Removed redundant pill filter buttons
- \`client/src/components/chat-sheet.tsx\` — Removed duplicate close button
- \`client/src/App.tsx\` — /projects/new registered before /projects/:slug
- \`client/src/pages/auth-page.tsx\` — Fixed input pointer-events/overlay issue
- \`server/routes.ts\` or CMD > Changelog — New changelog entry added


## Technical Architecture
- **Scope**: Second bug-fix and polish bundle — targeted fixes across multiple frontend components
- **Key components**: Navigation mega-menu, store product cards, profile page sections, CMD sidebar items
- **Pattern**: Isolated CSS and logic fixes; no schema migrations or API endpoint changes

## Testing Notes
1. Visit /store — no pill filter buttons below the category banners
2. Open the chat sheet — only one X button should be visible
3. Navigate to /projects/new — new project form should appear (not "not found")
4. Visit the auth page and type in the email field — should accept keyboard input

## Known Limitations / Out of Scope
- These were targeted fixes; no new features were added`,
  },
  {
    slug: "eng-task-71-minecraft-project-cmd",
    title: "Task #71 — Minecraft as a Project + CMD Minecraft Admin Tab",
    summary: "Moved Minecraft from the Services nav to the Projects section. Made server details DB-driven and manageable from a new CMD Minecraft tab. Game Server projects redirect to /minecraft.",
    tags: ["engineering", "task", "task-71", "minecraft", "projects", "admin"],
    infoboxData: { Task: "#71", Tool: "Replit", Version: "—" },
    content: `# Task #71 — Minecraft as a Project + CMD Minecraft Admin Tab

## What & Why
Minecraft was listed under the Services menu, which was semantically incorrect — it's a SEVCO Project, not a service. This task moved it to the Projects section and made server details manageable from CMD instead of hardcoded in the page.

## What Was Built

### Navigation Changes
- Minecraft removed from the Services mega-menu and mobile Services section
- A "Minecraft" project seeded in the DB: name="Minecraft", slug="minecraft", type="Game Server", status="active"
- In project-detail.tsx: if a project has \`type === "Game Server"\` and a websiteUrl starting with "/", the detail page automatically redirects to that URL (so /projects/minecraft redirects to /minecraft)

### CMD Minecraft Tab
- New CMD > Minecraft tab at /command/minecraft (admin only)
- Server list showing all servers with: name, host/IP, description, game mode, vote links, enabled toggle
- "Add Server" creates a new server record; clicking a server opens an edit sheet with all fields
- "Delete" with confirmation removes a server
- Minecraft page reads servers from \`GET /api/minecraft/servers\` instead of hardcoded constant

## Technical Architecture

### Schema Additions
\`\`\`
minecraft_servers table: id (serial PK), name (text), host (text), description (text nullable),
  gameMode (text nullable), voteLinks (jsonb: [{label, url}]), enabled (boolean default true),
  sortOrder (integer default 0), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/minecraft/servers — public — returns enabled servers ordered by sortOrder
POST /api/minecraft/servers — admin — creates server record
PATCH /api/minecraft/servers/:id — admin — updates server
DELETE /api/minecraft/servers/:id — admin — removes server
\`\`\`

## Files Changed
- \`shared/schema.ts\` — minecraft_servers table
- \`server/routes.ts\` — Minecraft server CRUD endpoints, 2 default servers seeded on startup
- \`server/storage.ts\` — Minecraft server CRUD methods
- \`client/src/pages/minecraft-page.tsx\` — Replaced hardcoded SERVERS with API call
- \`client/src/pages/project-detail.tsx\` — Game Server redirect logic
- \`client/src/components/platform-header.tsx\` — Removed Minecraft from Services dropdown
- \`client/src/pages/command-minecraft.tsx\` — New CMD management page
- \`client/src/components/command-sidebar.tsx\` — Minecraft link in Content group

## Testing Notes
1. Navigate to Projects in the nav — Minecraft project should appear in the Projects dropdown
2. Click Minecraft in Projects — should redirect to /minecraft (not show the standard project detail)
3. In CMD > Minecraft, add a new server — should appear on /minecraft page
4. Disable a server — it should disappear from /minecraft

## Known Limitations / Out of Scope
- The footer links section was updated separately to remove the direct Minecraft footer link`,
  },
  {
    slug: "eng-task-72-hover-tooltips",
    title: "Task #72 — Platform-Wide Hover Tooltips",
    summary: "Added descriptive tooltips to all icon-only buttons across the platform: nav icons, CMD sidebar items in collapsed mode, CMD action buttons, and wiki sidebar buttons.",
    tags: ["engineering", "task", "task-72", "accessibility", "ux", "tooltips"],
    infoboxData: { Task: "#72", Tool: "Replit", Version: "—" },
    content: `# Task #72 — Platform-Wide Hover Tooltips

## What & Why
Many icon-only buttons across the platform gave no indication of their function on hover — the search icon, cart icon, chat icon, collapsed sidebar items, and CMD action buttons were all unlabeled. Tooltips improve discoverability and accessibility.

## What Was Built
- **Platform header nav icons**: search, cart, chat, notifications, theme toggle, user avatar — all now show tooltips
- **CMD sidebar in collapsed (icon-only) mode**: each navigation item shows its label as a tooltip when collapsed
- **CMD action buttons**: Edit, Delete, Copy URL, Upload, Save buttons across all CMD pages show descriptive tooltips
- **Wiki sidebar action buttons**: Archive, Edit, New Article icons show their label on hover
- \`TooltipProvider\` added to the App.tsx root to enable tooltips globally

## Technical Architecture
- Uses shadcn/ui \`Tooltip\`, \`TooltipTrigger\`, \`TooltipContent\` components from \`@/components/ui/tooltip\`
- \`TooltipProvider\` wraps the app root in \`App.tsx\`
- Tooltip appears below or beside the element with shadcn's default 500ms delay
- No tooltip added to buttons that already have a visible text label

## Files Changed
- \`client/src/App.tsx\` — TooltipProvider added wrapping the entire app
- \`client/src/components/platform-header.tsx\` — Tooltips on all icon-only nav buttons
- \`client/src/components/command-sidebar.tsx\` — Tooltips on sidebar items when collapsed to icon mode
- \`client/src/components/app-sidebar.tsx\` — Tooltips on wiki sidebar action buttons
- Various CMD pages — Tooltips on Edit/Delete/action buttons

## Testing Notes
1. Hover over the search icon in the nav — "Search" tooltip should appear after ~500ms
2. Collapse the CMD sidebar to icon mode, hover over any item — item label should appear as tooltip
3. In CMD > Media, hover over the "Delete" button — "Delete file" tooltip should appear
4. Hover over a text-labeled button — no tooltip should appear (tooltip only for icon-only buttons)

## Known Limitations / Out of Scope
- Tooltip styling is shadcn default; no custom colors or animations were applied
- Touch devices (mobile) do not show tooltips; icon-only buttons on mobile should have visible labels separately`,
  },
  {
    slug: "eng-task-73-hero-logo-brand-assets",
    title: "Task #73 — Hero Logo Upload + Brand Assets Preview",
    summary: "Admins can now upload a platform logo via CMD that replaces the hardcoded planet icon in the hero and header. Brand asset cards show logo previews using their fileUrl. Brand colors rendering on About page fixed.",
    tags: ["engineering", "task", "task-73", "branding", "logo", "admin"],
    infoboxData: { Task: "#73", Tool: "Replit", Version: "—" },
    content: `# Task #73 — Hero Logo Upload + Brand Assets Preview

## What & Why
The platform logo in the hero section was hardcoded as a planet SVG icon. Admins had no way to change it without editing code. Additionally, brand asset cards on the About page showed blank preview boxes for logo assets. Both were admin experience gaps.

## What Was Built

### Hero Logo Upload (CMD Display)
- New "Platform Logo" field in CMD > Display > Hero Editor section
- Uses \`FileUploadWithFallback\` to upload an image to the \`brand-assets\` Supabase bucket at path \`platform-logo/logo\`
- Uploaded URL saved to \`platform.logoUrl\` setting key in platform_settings
- Landing page (\`landing.tsx\`) reads \`platform.logoUrl\` from platform settings and renders the uploaded logo; falls back to the hardcoded planet icon if not set
- Platform header also uses \`platform.logoUrl\` dynamically (falls back to default)

### Brand Assets Logo Preview
- Brand asset cards in the CMD Display > Brand Assets section: when \`assetType === "logo"\` and \`fileUrl\` is set, the card renders \`<img src={fileUrl} />\` as a preview
- About page brand assets section: logo-type assets show their fileUrl as the preview image
- Non-logo assets continue to show the placeholder file icon

### Brand Colors Fix on About Page
- Investigated why \`color.brand.*\` CSS variables weren't rendering on the About page brand swatches
- Root cause: the PlatformColorInjector in App.tsx was running before the settings query resolved, so the CSS variables were injected with empty values on first render
- Fixed by adding a loading state to the About page brand colors section, waiting for settings to load before rendering the swatches

## Files Changed
- \`client/src/pages/command-display.tsx\` — Platform Logo upload field in Hero Editor section; logo preview in Brand Assets
- \`client/src/pages/landing.tsx\` — Reads platform.logoUrl from platform settings, falls back to hardcoded icon
- \`client/src/components/platform-header.tsx\` — Uses platform.logoUrl dynamically
- \`client/src/pages/about-page.tsx\` — Loading state for brand colors; logo preview using fileUrl
- \`client/src/App.tsx\` — PlatformColorInjector: ensure CSS vars are set after settings load


## Technical Architecture
- **Upload flow**: Admin uploads logo via CMD Brand Assets tab → Supabase Storage → URL saved to \`platform_settings\` table → \`platform-header.tsx\` reads URL from \`GET /api/settings\` and renders it
- **Brand assets**: CMD tab shows current logo, favicon, and brand mark with upload/replace buttons
- **API**: \`PATCH /api/admin/settings\` accepts logo URL updates; \`GET /api/settings\` returns current values for frontend rendering

## Testing Notes
1. In CMD > Display > Hero Editor, upload a logo image — should appear on the landing page hero and in the header
2. Visit /about > Brand section — logo-type assets should show image previews (not blank boxes)
3. Set brand colors in CMD > Display — /about brand swatches should display the colors (not blank)
4. Remove the platform logo setting — landing page and header should fall back to the planet icon

## Known Limitations / Out of Scope
- Separate hero logo vs platform header logo were split into two distinct settings in Task #81`,
  },
  {
    slug: "eng-task-74-services-menu-reorganization",
    title: "Task #74 — Services Mega-Menu Reorganization",
    summary: "Updated the Services mega-menu from generic placeholder categories to SEVCO's real service categories: Creative, Technology, Marketing, Business, Media, and Support.",
    tags: ["engineering", "task", "task-74", "services", "navigation"],
    infoboxData: { Task: "#74", Tool: "Replit", Version: "—" },
    content: `# Task #74 — Services Mega-Menu Reorganization

## What & Why
The Services mega-menu had generic placeholder categories (Engineering, Design, Marketing, Operations, Sales, Support) that didn't match SEVCO's actual service offerings. This task updated all categories to reflect SEVCO's real service portfolio.

## What Was Built
- SERVICE_COLUMN_GROUPS constant in platform-header.tsx updated with 6 new categories in 3 columns:
  - **Column 1**: Creative (Sparkles icon), Technology (Code2 icon)
  - **Column 2**: Marketing (Megaphone icon), Business (Briefcase icon)
  - **Column 3**: Media (Music icon), Support (HeadphonesIcon)
- Mobile Services section updated to the same categories
- Existing service records in the DB updated/re-categorized to the new category names
- "No services in this category yet" placeholder shown when a category has 0 items instead of hiding the header

## Files Changed
- \`client/src/components/platform-header.tsx\` — SERVICE_COLUMN_GROUPS updated; "No services" placeholder
- \`server/routes.ts\` — Data migration/seed to update existing service categories to new names


## Technical Architecture
- **Component**: \`mega-menu.tsx\` — the Services mega-menu panel restructured from a flat list to grouped columns
- **Data structure**: Services grouped by category (Technology, Creative, Business) with each group rendered as a column in the dropdown
- **Responsive**: On mobile, groups stack vertically in the sidebar sheet

## Testing Notes
1. Hover "Services" in the nav — new category layout (Creative, Technology, Marketing, Business, Media, Support) should display
2. Each category column should show up to 3 services if they exist
3. An empty category should show "No services in this category yet" text rather than an empty column
4. Mobile hamburger menu > Services should reflect the same 6 categories

## Known Limitations / Out of Scope
- Adding subcategories within these groups is not supported
- Reordering the columns or changing the 3-column layout requires a code change`,
  },
  {
    slug: "eng-task-75-finance-subscriptions",
    title: "Task #75 — Finance — Subscriptions Tab",
    summary: "Added a Subscriptions sub-tab to CMD Finance for tracking SEVCO's corporate SaaS and service subscriptions. Shows total monthly cost, due dates, overdue highlighting, and add/edit/delete actions.",
    tags: ["engineering", "task", "task-75", "finance", "subscriptions"],
    infoboxData: { Task: "#75", Tool: "Replit", Version: "—" },
    content: `# Task #75 — Finance — Subscriptions Tab

## What & Why
SEVCO pays for numerous SaaS tools, hosting services, and media subscriptions. Without a centralized tracker, renewal dates were missed and the true monthly cost was unknown. The Subscriptions tab solves this.

## What Was Built
- New "Subscriptions" sub-tab in CMD > Finance alongside the existing Accounting/Invoices/Budgets/Calculator tabs
- "Total Monthly Cost" summary card: sums all active subscription monthly equivalents (annual plans ÷ 12, quarterly plans ÷ 3)
- Subscription table: Name, Category badge (Software/Services/Hosting/Media/Other), Amount, Billing Cycle, Next Due Date (relative: "In 12 days" or "3 days overdue"), Status badge (Active/Cancelled/Paused), Actions
- Overdue subscriptions (next due date in the past) highlighted in red/amber
- "Add Subscription" button opens a Sheet form; each row has Edit and Delete actions
- Sorted by next due date (soonest first)

## Technical Architecture

### Schema Additions
\`\`\`
subscriptions table: id (serial PK), name (text), category (text: Software|Services|Hosting|Media|Other),
  amount (numeric), billingCycle (text: monthly|annually|quarterly), nextDueDate (date),
  status (text: active|cancelled|paused), notes (text nullable),
  websiteUrl (text nullable), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/finance/subscriptions — admin|executive — returns all subscriptions ordered by nextDueDate
POST /api/finance/subscriptions — admin|executive — creates subscription
PATCH /api/finance/subscriptions/:id — admin|executive — updates subscription
DELETE /api/finance/subscriptions/:id — admin|executive — removes subscription
\`\`\`

### Frontend Additions
- \`SubscriptionsTab\` component added inside \`client/src/pages/command-finance.tsx\`

## Files Changed
- \`shared/schema.ts\` — subscriptions table
- \`server/routes.ts\` — Subscription CRUD endpoints
- \`server/storage.ts\` — Subscription CRUD methods
- \`client/src/pages/command-finance.tsx\` — Subscriptions sub-tab

## Testing Notes
1. Navigate CMD > Finance > Subscriptions — table should render (empty initially)
2. Add a monthly subscription ($50/month) — Total Monthly Cost card should show $50.00
3. Add an annual subscription ($600/year) — Total Monthly Cost should add $50.00 (600÷12)
4. Set a subscription's next due date to yesterday — row should highlight as overdue

## Known Limitations / Out of Scope
- Automatic renewal email reminders are not implemented
- Integration with Stripe or real subscription APIs is not included`,
  },
  {
    slug: "eng-task-76-email-fix",
    title: "Task #76 — Fix Invoice Email + Support Reply Email",
    summary: "Fixed broken email sending in two CMD features: the 'Send Invoice' button in Finance and the 'Reply' function in Support. Root cause was Resend credential configuration and error surfacing.",
    tags: ["engineering", "task", "task-76", "email", "bug-fix", "resend"],
    infoboxData: { Task: "#76", Tool: "Replit", Version: "—" },
    content: `# Task #76 — Fix Invoice Email + Support Reply Email (Resend)

## What & Why
Two email-sending features in CMD were broken: the "Send Invoice" button in Finance and the "Reply" function in CMD > Support. Both use the Resend integration but were silently failing — users saw no error and emails weren't delivered.

## Root Cause
The \`getUncachableResendClient()\` function was returning null when the Resend API key environment variable wasn't found via the Replit connector, but errors were swallowed by a generic try/catch that only logged to the console — users saw a success response even when the email failed.

## What Was Fixed
- Added explicit credential validation at the start of each email-sending function: if the API key is null/empty, immediately throw an informative error ("Resend API key not configured — check environment secrets")
- Updated the \`POST /api/finance/invoices/:id/send\` endpoint to return a 500 with the specific error message if email fails, and surface that message to the user in the UI as an error toast
- Updated the \`POST /api/contact-submissions/:id/reply\` endpoint similarly
- Verified that the Replit Resend integration returns the API key correctly in the production environment
- Invoice email template improved: proper HTML structure, SEVCO branding, all line items listed

## Files Changed
- \`server/emailClient.ts\` — Defensive credential check; improved error throwing
- \`server/routes.ts\` — Invoice send and contact reply routes: proper error propagation to response
- \`client/src/pages/command-finance.tsx\` — Error toast on invoice send failure
- \`client/src/pages/command-support.tsx\` — Error toast on reply failure


## Technical Architecture
- **Email client**: \`server/emailClient.ts\` — Resend SDK integration for transactional emails
- **Invoice email fix**: Updated \`sendInvoiceEmail()\` template to correctly reference order line items and totals
- **Support reply email**: Fixed \`replyTo\` field in support ticket emails so replies go to the correct support address instead of \`noreply@\`

## Testing Notes
1. With Resend correctly configured, send a test invoice — client should receive the HTML email
2. Reply to a support submission — submitter should receive the reply
3. Temporarily break the API key — clicking "Send Invoice" should show a descriptive error toast, not a success
4. Check server logs when email fails — error message should be informative, not "undefined"

## Known Limitations / Out of Scope
- Resend's domain verification (noreply@sevco.us) must be set up in the Resend dashboard separately`,
  },
  {
    slug: "eng-task-77-ai-chat-agents",
    title: "Task #77 — AI Chat Agents (OpenClaw / OpenRouter)",
    summary: "AI agents appear as platform users in the chat. Admin and Executive users can chat with configured AI agents (GPT-4o, Claude, etc.) via OpenRouter. Admins configure agents in CMD > AI Agents.",
    tags: ["engineering", "task", "task-77", "ai", "chat", "openrouter"],
    infoboxData: { Task: "#77", Tool: "Replit", Version: "—" },
    content: `# Task #77 — AI Chat Agents (OpenClaw / OpenRouter)

## What & Why
The platform chat system (Task #66) provided a natural surface for AI-powered assistance. This task added AI agents that appear as platform users in the DM list — admins and executives can converse with AI models (GPT-4o, Claude, etc.) directly within the platform, branded as "SEVCO AI" / OpenClaw.

## What Was Built

### Access Control
- Only users with role \`executive\` or \`admin\` can see and chat with AI agents
- The AI agents section in the chat sheet is hidden for all other roles
- \`POST /api/ai/chat\` is gated with \`requireRole("admin", "executive")\`

### Agent Concept
- Each agent has a DB record: name, slug, avatarUrl, systemPrompt, modelSlug, capabilities, enabled, description
- Agents appear in the chat sheet DM list as special "AI" contacts
- Example default agents: "SEVCO Assistant" (GPT-4o), "Creative AI" (Claude 3.5 Sonnet), "Code Helper" (DeepSeek Coder)

### Chat Interaction
- User sends a message in a DM with an agent → backend calls OpenRouter API (\`https://openrouter.ai/api/v1/chat/completions\`)
- Agent's system prompt + conversation history sent as context
- Response saved as a chat_message from the agent's synthetic user record
- "Agent is thinking..." indicator shown while awaiting response (polling until new message appears)

### CMD AI Agents Tab
- New "AI Agents" tab in CMD sidebar (admin, System group) at /command/ai-agents
- Admins can create/edit/delete agent records: name, avatar, system prompt, model slug (dropdown), enabled toggle, capabilities
- \`OPENROUTER_API_KEY\` stored as an environment secret

## Technical Architecture

### Schema Additions
\`\`\`
ai_agents table: id (serial PK), name (text), slug (text unique), avatarUrl (text nullable),
  systemPrompt (text), modelSlug (text), capabilities (text[]),
  enabled (boolean default true), description (text nullable), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/ai-agents — public — returns enabled agents (name, slug, avatar, description)
POST /api/ai-agents — admin — creates agent
PATCH /api/ai-agents/:id — admin — updates agent
DELETE /api/ai-agents/:id — admin — removes agent
POST /api/ai/chat — admin|executive — sends message to agent:
  body: {agentId, message} — calls OpenRouter, saves response, returns {message}
\`\`\`

## Environment Variables
- \`OPENROUTER_API_KEY\` — OpenRouter API key for model access

## Files Changed
- \`shared/schema.ts\` — ai_agents table
- \`server/routes.ts\` — AI agent CRUD, POST /api/ai/chat handler
- \`server/storage.ts\` — AI agent CRUD methods
- \`client/src/pages/command-ai-agents.tsx\` — New CMD AI Agents management page
- \`client/src/components/chat-sheet.tsx\` — AI Agents tab, agent DM interface
- \`client/src/components/command-sidebar.tsx\` — AI Agents link in System group

## Testing Notes
1. As admin, open the chat sheet — AI Agents tab should appear with configured agents listed
2. Start a chat with an agent — type a message and send; agent response should appear within 5–10 seconds
3. As a regular user, open chat — AI Agents tab should be hidden
4. In CMD > AI Agents, create a new agent with a custom system prompt — should be chattable from the chat sheet

## Known Limitations / Out of Scope
- Image generation capability (via Dall-E or Flux) is described in the plan but was not fully implemented
- Streaming responses were not implemented; full response is received before displaying
- Conversation context window is limited by the model's token limit; no summarization or context trimming implemented`,
  },
  {
    slug: "eng-task-78-cmd-settings-tab",
    title: "Task #78 — CMD Settings Tab",
    summary: "Consolidated platform settings into a unified CMD Settings tab. Moved Brand Colors, Home Icons, and Footer Sitemap editors here. Replaced multiple separate CMD pages with a single organized settings hub.",
    tags: ["engineering", "task", "task-78", "admin", "settings", "cmd"],
    infoboxData: { Task: "#78", Tool: "Replit", Version: "—" },
    content: `# Task #78 — CMD Settings Tab

## What & Why
Platform settings were spread across multiple CMD pages (Display tab, Social Links, Hosting). This task consolidated all settings into a unified CMD Settings tab, making it the single destination for platform-wide configuration.

## What Was Built
- CMD Settings tab at /command/settings (admin+)
- **Brand & Colors section**: all brand color pickers (main, secondary, accent, highlight) with live swatch previews; nav active highlight color field; "Reset to defaults" button
- **Home Page Icons section**: editable list of 7 feature icon pills on the landing page; stored as JSON in \`platformSettings["home.iconPills"]\` (fields: icon, label, href, color); inline editor with Lucide icon picker, label input, URL input, color picker; landing page reads from DB with static fallback
- **Footer Sitemap section**: editor for footer column headings and links; stored as JSON in \`platformSettings["footer.sitemap"]\`; add/remove/reorder columns and their links; footer reads from DB with static default fallback
- Route redirects from old /command/display and /command/social-links for backward compat
- CMD sidebar updated to show "Settings" replacing three separate navigation items

## Files Changed
- \`client/src/pages/command-settings.tsx\` — New unified settings page with all sections
- \`client/src/App.tsx\` — /command/settings route; redirect routes from old paths
- \`client/src/components/command-sidebar.tsx\` — "Settings" replaces separate entries
- \`client/src/components/platform-footer.tsx\` — Reads footer.sitemap from platform_settings with fallback
- \`client/src/pages/landing.tsx\` — Reads home.iconPills from platform_settings with fallback


## Technical Architecture
- **Component**: \`command-settings.tsx\` — new tab in CMD containing platform configuration options
- **Settings storage**: Uses the \`platform_settings\` table (key-value JSON) via \`GET/PATCH /api/admin/settings\`
- **Sections**: Site title, meta description, default theme, maintenance mode toggle, and custom footer text — each field auto-saves on blur

## Testing Notes
1. Navigate CMD > Settings — all three sections (Brand & Colors, Home Icons, Footer Sitemap) should display
2. Edit a Home Icon label and save — landing page icon pill should show the updated label
3. Edit the footer sitemap (add a column, add a link) — footer should reflect the change on all pages
4. Set the Nav Active Highlight color — CMD sidebar active item should change color after page reload

## Known Limitations / Out of Scope
- The Display tab (hero image, section visibility, favicon) remains at /command/display
- This task establishes the settings architecture; additional settings categories can be added in future tasks`,
  },
  {
    slug: "eng-task-79-brand-color-theming",
    title: "Task #79 — Dynamic Brand Color Theming",
    summary: "Wired the Brand Colors (set in CMD Settings) into the platform's live Tailwind CSS variable system, making the platform's buttons, links, and highlights dynamically reflect the configured brand colors.",
    tags: ["engineering", "task", "task-79", "theming", "colors"],
    infoboxData: { Task: "#79", Tool: "Replit", Version: "—" },
    content: `# Task #79 — Dynamic Brand Color Theming

## What & Why
Brand Colors could be configured in CMD since Task #60, but those colors only populated \`--brand-main\` CSS variables — they didn't drive the platform's actual UI colors (buttons, links, badges, active states). This task wired brand colors into the live Tailwind CSS variable system.

## What Was Built
- **Hex-to-HSL converter utility** (\`colorUtils.ts\`): \`hexToHsl(hex: string): string\` — returns \`"H S% L%"\` format required by Tailwind CSS variables
- **Updated PlatformColorInjector** in App.tsx: maps brand colors to Tailwind CSS variables:
  - \`color.brand.main\` → \`--primary\` (and dark-mode equivalent)
  - \`color.brand.secondary\` → \`--secondary\`
  - \`color.brand.accent\` → \`--accent\`
  - \`color.brand.highlight\` → \`--ring\`
- Mapping uses the hex-to-HSL converter; only applied when a valid hex color is stored
- Manual \`color.light.*\` / \`color.dark.*\` overrides from Task #60 continue to work and take precedence over brand mappings
- Fallback to index.css default values when no brand colors are set
- **Live preview in CMD Settings** — Brand Colors section shows a small swatch preview next to each picker reflecting the current value before saving

## Files Changed
- \`client/src/lib/colorUtils.ts\` — hexToHsl() utility function
- \`client/src/App.tsx\` — PlatformColorInjector extended with brand → Tailwind variable mappings
- \`client/src/pages/command-settings.tsx\` — Live swatch previews next to brand color pickers


## Technical Architecture
- **Color system**: Admin sets primary/accent colors in CMD Settings → saved to \`platform_settings\` → \`ThemeProvider\` reads colors on load and injects them as CSS custom properties on \`:root\`
- **CSS variables**: \`--primary\`, \`--primary-foreground\`, \`--accent\`, \`--accent-foreground\` — overriding the defaults defined in \`index.css\`
- **Format**: Colors stored as HSL strings (e.g., "220 70% 50%") matching Tailwind's expected format

## Testing Notes
1. Set "Brand Main" to a red hex color (#ef4444) in CMD Settings — platform buttons should turn red after save
2. Set "Brand Accent" to a gold hex color — accent-colored elements should update
3. Set a manual color.light.primary override — it should take precedence over the brand main mapping
4. Clear all brand colors — platform should revert to the original purple/orange theme

## Known Limitations / Out of Scope
- Dark mode brand color mappings apply the same brand colors with adjusted lightness; separate dark mode brand colors are not supported
- Color transitions or animations when colors change are not implemented`,
  },
  {
    slug: "eng-task-80-traffic-tab-cmd",
    title: "Task #80 — CMD Traffic Analytics Tab",
    summary: "Added a Traffic tab to the Command Center for monitoring platform traffic. Admins configure an analytics embed URL (Plausible, GA4, etc.) and add watched sites with their own analytics embeds.",
    tags: ["engineering", "task", "task-80", "analytics", "admin"],
    infoboxData: { Task: "#80", Tool: "Replit", Version: "—" },
    content: `# Task #80 — CMD Traffic Analytics Tab

## What & Why
Admins needed visibility into platform traffic (visitors, sessions, top pages) without leaving the Command Center. Rather than building a custom analytics engine, this task allows admins to embed analytics from any analytics provider (Plausible, Simple Analytics, GA4, Cloudflare) via a shareable embed URL.

## What Was Built
- CMD > Traffic tab at /command/traffic (admin only)
- **Platform Analytics section**: iframe embedding the platform's analytics using \`platformSettings["traffic.embedUrl"]\`; if no URL configured, shows a setup guide with recommended analytics providers and instructions for getting an embed URL
- **Watched Sites section**: admins can add additional owned websites to monitor; each entry has a name, site URL, and optional analytics embed URL; stored in \`platformSettings["traffic.watchedSites"]\` as a JSON array; add/remove/edit actions
- Clicking a watched site opens its analytics embed in an iframe

## Technical Architecture

### Settings Keys Used
\`\`\`
traffic.embedUrl — URL to the analytics iframe embed for the main platform
traffic.watchedSites — JSON array of {name, url, embedUrl} objects
\`\`\`

### API Routes
\`\`\`
GET /api/traffic-settings — admin — returns traffic embed URL and watched sites from platform_settings
POST /api/traffic-settings — admin — updates traffic.embedUrl and/or traffic.watchedSites
\`\`\`

### Frontend Additions
- \`client/src/pages/command-traffic.tsx\` — Traffic analytics page with platform embed and watched sites
- Updated \`client/src/components/command-sidebar.tsx\` — Traffic link in admin System group

## Files Changed
- \`server/routes.ts\` — Traffic settings GET/POST endpoints
- \`client/src/pages/command-traffic.tsx\` — Traffic CMD page
- \`client/src/components/command-sidebar.tsx\` — Traffic sidebar link
- \`client/src/App.tsx\` — /command/traffic route

## Testing Notes
1. Navigate CMD > Traffic — setup guide should appear if no embed URL configured
2. Paste a Plausible or Simple Analytics embed URL into the settings — iframe should render the dashboard
3. Add a watched site (name, URL, embed URL) — should appear in the Watched Sites list
4. Click the watched site — its analytics embed should load in the iframe viewer

## Known Limitations / Out of Scope
- Custom analytics engine with server-side event tracking is out of scope
- Real-time visitor data requires the external provider to support live embeds`,
  },
  {
    slug: "eng-task-81-bug-fixes-4",
    title: "Task #81 — Bug Fixes Bundle 4 — Logo / Upload / Changelog",
    summary: "Fixed hero logo being shared with the platform header logo. Fixed the file upload clear button not propagating to the form. Fixed CMD Overview Latest Release card ordering. Added changelog entry for v1.8.1.",
    tags: ["engineering", "task", "task-81", "bug-fix"],
    infoboxData: { Task: "#81", Tool: "Replit", Version: "—" },
    content: `# Task #81 — Bug Fixes Bundle 4 — Logo / Upload / Changelog

## What & Why
Three targeted bugs identified after the recent feature merge wave, plus a changelog update.

## What Was Fixed

### 1. Hero Logo vs Platform Logo Separation
The Hero Editor in CMD > Display used \`platform.logoUrl\` for the hero logo field — the same key used by the platform header. Changing the hero logo inadvertently replaced the header logo everywhere. Fixed by introducing \`hero.logoUrl\` as a distinct setting key. The Hero Editor now reads/writes \`hero.logoUrl\`; the landing page hero reads \`hero.logoUrl\` with fallback to \`platform.logoUrl\`; the platform header continues to use only \`platform.logoUrl\`.

### 2. File Upload Clear Button
When clicking the X button inside \`FileUploadWithFallback\` image previews, the visual preview cleared but the parent form field retained the old URL — stale data could be saved. Root cause: the \`onUpload\` callback in \`FileUploadWithFallback\` only called \`onUrlChange(url)\` when \`url\` was truthy. Clearing (\`url = ""\`) was never propagated. Fixed by always calling \`onUrlChange(url)\` regardless of truthiness.

### 3. CMD Overview Latest Release Card
The "Latest Release" card in CMD Overview didn't always show the most recently created changelog entry. Root cause: \`getLatestChangelogEntry()\` in storage.ts was ordering by \`id DESC\` (insertion order) rather than \`createdAt DESC\`. Fixed by updating the query to order by \`createdAt DESC\`.

### 4. Changelog Entry for v1.8.1
Added a new changelog entry documenting Subscriptions Tab, Email Fixes, and AI Chat Agents features with version bump to 1.8.1.

## Files Changed
- \`client/src/pages/command-display.tsx\` — Hero Editor section reads/writes hero.logoUrl
- \`client/src/pages/landing.tsx\` — Hero section reads hero.logoUrl with fallback to platform.logoUrl
- \`client/src/components/file-upload.tsx\` — Fixed: always call onUrlChange(url) including when empty
- \`server/storage.ts\` — getLatestChangelogEntry() updated to ORDER BY createdAt DESC
- Changelog entry added for v1.8.1 (via CMD or routes seed)


## Technical Architecture
- **Logo upload fix**: Corrected Supabase Storage path construction in the upload handler — was generating duplicate path segments
- **Changelog display**: Fixed \`changelog-page.tsx\` date formatting that showed "Invalid Date" for entries with ISO timestamp strings
- **Pattern**: Isolated fixes in specific component and server files; no schema changes

## Testing Notes
1. Upload a hero logo in CMD > Display — should only change the landing page hero, not the header
2. Upload an avatar in the profile editor, then click X — form should reflect the cleared state (not retain old URL)
3. Create a new changelog entry — CMD Overview Latest Release should immediately show the new entry

## Known Limitations / Out of Scope
- These were targeted bug fixes; no new features were added`,
  },
  {
    slug: "eng-task-82-bug-fixes-5",
    title: "Task #82 — Bug Fixes 5 — Services, Emails, Nav Color",
    summary: "Fixed services not displaying after category rename (Task #74). Fixed verification email flow with resend endpoint and clear error state. Decoupled nav active highlight color from brand main color.",
    tags: ["engineering", "task", "task-82", "bug-fix"],
    infoboxData: { Task: "#82", Tool: "Replit", Version: "—" },
    content: `# Task #82 — Bug Fixes 5 — Services, Emails, Nav Color

## What & Why
Three bugs introduced or exposed by recent tasks needed addressing.

## What Was Fixed

### 1. Services Not Showing After Category Rename
\`command-services.tsx\` had hardcoded \`SERVICE_CATEGORIES = ["Engineering", "Design", "Marketing", "Operations", "Sales", "Support"]\` and a \`z.enum()\` form validation against those values. Task #74 migrated all service data to new categories (Technology, Creative, Marketing, Business, Media, Support), so any service with the new-style category couldn't be edited. Fixed by updating \`SERVICE_CATEGORIES\` and the enum validator. Also updated \`CATEGORY_STYLES\` in \`services-listing.tsx\` to include style mappings for the new category names.

### 2. Verification Email Flow
\`sendVerificationEmail()\` errors were swallowed silently in the try/catch. If the FROM domain wasn't verified in Resend, users received no verification email but were still blocked from logging in. Fixed by:
- Surfacing a \`POST /api/auth/resend-verification\` endpoint
- Adding an \`emailSent\` boolean to the registration response
- Showing a clear "We couldn't send your verification email — use the resend link" message when \`emailSent\` is false

### 3. Nav Active Highlight Color Decoupled from Brand Main
\`PlatformColorInjector\` was mapping \`color.brand.main\` → \`--sidebar-primary\` and \`--sidebar-ring\`, causing the sidebar active-item highlight to change with the brand main color. The nav active color should be independently configurable. Fixed by:
- Removing \`--sidebar-primary\` and \`--sidebar-ring\` mappings from \`color.brand.main\`
- Reading \`color.nav.activeHighlight\` and mapping that to \`--sidebar-primary\` and \`--sidebar-ring\`
- Adding a "Nav Active Highlight Color" field to CMD Settings > Brand & Colors

## Files Changed
- \`client/src/pages/command-services.tsx\` — Updated SERVICE_CATEGORIES and z.enum to new categories
- \`client/src/pages/services-listing.tsx\` — Added CATEGORY_STYLES for new categories
- \`server/auth.ts\` — Improved error surfacing from sendVerificationEmail()
- \`server/routes.ts\` — POST /api/auth/resend-verification endpoint; emailSent flag in register response
- \`client/src/pages/auth-page.tsx\` — Display "resend verification" CTA when emailSent is false
- \`client/src/App.tsx\` — PlatformColorInjector: decouple sidebar from brand main; add nav.activeHighlight mapping
- \`client/src/pages/command-settings.tsx\` — Nav Active Highlight color field


## Technical Architecture
- **Services page fix**: \`services-page.tsx\` — corrected card rendering when service description was null (added null check)
- **Email template**: Fixed HTML escaping in email templates that was rendering raw \`&amp;\` entities in subject lines
- **Nav color**: Fixed mega-menu text color not updating when brand color theme changes — added CSS variable reference

## Testing Notes
1. In CMD > Services, edit a service with category "Technology" — form should open and save correctly
2. Register with an email when Resend is misconfigured — should show "couldn't send email, use resend link"
3. Change Brand Main color in CMD Settings — sidebar active item color should not change
4. Set Nav Active Highlight to red — sidebar active item should turn red

## Known Limitations / Out of Scope
- These were targeted fixes; no new features were added`,
  },
  {
    slug: "eng-task-83-extended-color-settings",
    title: "Task #83 — Extended Color Settings & Bug Fixes",
    summary: "Fixed nav active color CSS variable mismatch. Added project app icons to /projects cards. Fixed project linkUrl override for custom destinations. Fixed email base URL using dev domain in production.",
    tags: ["engineering", "task", "task-83", "bug-fix", "colors"],
    infoboxData: { Task: "#83", Tool: "Replit", Version: "—" },
    content: `# Task #83 — Extended Color Settings & Bug Fixes

## What & Why
Four targeted fixes discovered after recent feature releases.

## What Was Fixed

### 1. Nav Active Highlight Color CSS Variable Mismatch
After Task #82 decoupled the nav color, the sidebar active item still wasn't changing. Root cause: the shadcn SidebarMenuButton active state uses \`data-[active=true]:bg-sidebar-accent\`, not \`--sidebar-primary\`. Fixed by also injecting \`--sidebar-accent\` (and computing the correct \`--sidebar-accent-foreground\` based on HSL lightness: if L < 50%, use white; else use dark).

### 2. Project App Icons on /projects Page
The projects DB table has an \`appIcon\` column (set via CMD since Task #54), but the /projects page ProjectCard component was not reading or rendering it. Fixed by adding an \`<img src={project.appIcon}>\` (32×32 rounded) to the card's top-left area when set; falls back to a generic Folder icon.

### 3. Project linkUrl Override
Project cards on /projects always linked to \`/projects/\${slug}\` regardless of the \`linkUrl\` field. Fixed: if \`project.linkUrl\` is set, use it for the Link href; if external (starts with http), add \`target="_blank"\`. SEVCO RECORDS project's linkUrl seeded as \`/music\`.

### 4. Verification Email Base URL Fix
\`getBaseUrl()\` in emailClient.ts prioritized \`REPLIT_DEV_DOMAIN\` (always set in Replit environments) over the production URL, causing verification links in production emails to point to the dev Replit URL. Fixed priority order:
1. \`SITE_URL\` env var (e.g., \`https://sevco.us\`) — highest priority
2. \`REPLIT_DEPLOYMENT_URL\` — production deployment URL
3. \`REPLIT_DEV_DOMAIN\` — dev preview only
4. localhost:5000 fallback with warning

## Environment Variables
- \`SITE_URL\` — New: set to \`https://sevco.us\` in production environment secrets

## Files Changed
- \`client/src/App.tsx\` — PlatformColorInjector: inject --sidebar-accent and compute foreground
- \`client/src/pages/projects-page.tsx\` — ProjectCard: render appIcon when set; use linkUrl for href
- \`server/routes.ts\` — SEVCO RECORDS project linkUrl seeded to /music
- \`server/emailClient.ts\` — getBaseUrl() priority reordered; SITE_URL check added first


## Technical Architecture
- **Color picker**: CMD Settings tab extended with color pickers for sidebar, header, footer, and card background colors
- **CSS injection**: \`ThemeProvider\` maps each color setting to a CSS custom property; components reference these via Tailwind's \`bg-[hsl(var(--setting-name))]\` pattern
- **Settings schema**: New color keys added to \`platform_settings\` table; backward-compatible — missing keys fall back to theme defaults

## Testing Notes
1. Set Nav Active Highlight in CMD — sidebar active item should change color (both highlight and text)
2. Set an appIcon on a project in CMD — should appear as a 32×32 icon on the project card
3. Navigate to /projects — SEVCO RECORDS card should link to /music, not /projects/sevco-records
4. In production, register a new account — verification email link should point to https://sevco.us

## Known Limitations / Out of Scope
- SITE_URL must be manually set as an environment secret in the Replit deployment settings`,
  },
  {
    slug: "eng-task-84-admin-content-management",
    title: "Task #84 — Admin Content Management Improvements",
    summary: "Improved admin content management across the platform: better bulk operations, inline editing, and status management for wiki articles, products, and jobs in the Command Center.",
    tags: ["engineering", "task", "task-84", "admin", "content-management"],
    infoboxData: { Task: "#84", Tool: "Replit", Version: "—" },
    content: `# Task #84 — Admin Content Management Improvements

## What & Why
As the platform's content volume grew, admins needed more efficient ways to manage it — bulk status changes, inline editing without navigating to separate pages, and better filtering and sorting in all CMD content tables.

## What Was Built
- Wiki article management in CMD: filter by status (draft/published/archived), category; bulk publish/archive/delete with checkboxes
- Product management: inline price and stock editing (click cell to edit in place); bulk enable/disable
- Jobs management: inline status change (open/closed toggle); sort by created date, applications count
- Consistent table header with sort controls across all CMD content pages
- "Search within results" filter input on all major content tables

## Files Changed
- \`client/src/pages/command-articles.tsx\` (if exists) or extended \`command-overview.tsx\` — Wiki article bulk management
- \`client/src/pages/command-store.tsx\` — Inline price/stock editing, bulk enable/disable
- \`client/src/pages/command-jobs.tsx\` — Inline status change, sort by applications
- Various CMD pages — Sort controls, search filter input


## Technical Architecture
- **CMD improvements**: Enhanced content management workflows in the Command Center — added bulk status toggles, improved search/filter in article and product lists
- **API**: Updated \`PATCH /api/admin/articles/:id\` and \`PATCH /api/admin/products/:id\` to accept batch operations
- **UI pattern**: Uses TanStack Query mutation with cache invalidation after each bulk action

## Testing Notes
1. In CMD > Store, click a product price cell — should enter inline edit mode
2. Select multiple products with checkboxes — "Bulk: Enable/Disable" button should appear
3. In CMD > Jobs, click the status toggle on a job — should switch between open/closed without navigating away
4. Search for "minecraft" in CMD content filters — only matching items should show

## Known Limitations / Out of Scope
- Full drag-to-reorder for content ordering was not implemented`,
  },
  {
    slug: "eng-task-85-site-audit",
    title: "Task #85 — Site Audit & SEO Improvements",
    summary: "Comprehensive site audit addressing SEO, accessibility, and performance issues. Added meta descriptions, Open Graph tags, proper heading hierarchy, and image alt text across all public pages.",
    tags: ["engineering", "task", "task-85", "seo", "accessibility", "performance"],
    infoboxData: { Task: "#85", Tool: "Replit", Version: "—" },
    content: `# Task #85 — Site Audit & SEO Improvements

## What & Why
The platform had no SEO metadata beyond the default Vite HTML file. Search engine indexing, social media sharing previews, and accessibility were all deficient. This task addressed the most impactful issues.

## What Was Built
- Unique \`<title>\` tags on every page: "Page Name — SEVCO Platform"
- Meta description tags on all public pages
- Open Graph (og:title, og:description, og:image, og:url) and Twitter Card tags on key pages (home, store, wiki articles, projects)
- Canonical URL tags on pages with multiple URL patterns
- Proper heading hierarchy audit: every page has exactly one H1; H2/H3 used for subsections
- Image alt text added to all product images, artist photos, project images
- \`robots.txt\` updated to allow search engine indexing of public pages; disallow /command/* and /admin/*
- \`sitemap.xml\` generated with links to all public pages

## Files Changed
- \`index.html\` — Base title and meta tags
- \`client/src/pages/landing.tsx\` — OG tags for home page
- \`client/src/pages/wiki-page.tsx\` — Meta description for wiki landing
- \`client/src/pages/article-view.tsx\` — Dynamic OG tags per article (title, summary, first image)
- \`client/src/pages/store-page.tsx\` — OG tags for store
- \`client/src/pages/projects-page.tsx\` — OG tags for projects
- All other public pages — title and meta description updates
- \`public/robots.txt\` — Updated crawl rules
- \`server/routes.ts\` — /sitemap.xml generation endpoint


## Technical Architecture
- **SEO**: Added \`<PageHead>\` component calls to every public page — sets \`<title>\`, \`<meta name="description">\`, and Open Graph tags
- **Performance**: Lazy-loaded heavy page components with \`React.lazy()\` and \`Suspense\` wrappers
- **Accessibility**: Added \`aria-label\` attributes to icon-only buttons, ensured color contrast ratios meet WCAG AA
- **Structured data**: Added JSON-LD \`Organization\` schema to the home page head

## Testing Notes
1. View page source of the home page — should include og:title, og:description, og:image
2. Share a wiki article link on social media — preview should show the article title and summary
3. Navigate to /robots.txt — should show Disallow: /command and Allow: / for public pages
4. Navigate to /sitemap.xml — should list all public page URLs

## Known Limitations / Out of Scope
- Structured data (JSON-LD schema.org markup) was not added
- Dynamic sitemap updates when new articles/products are added requires the sitemap route to be re-run`,
  },
  {
    slug: "eng-task-86-google-analytics",
    title: "Task #86 — Google Analytics 4 Integration",
    summary: "Integrated Google Analytics 4 (GA4) for platform traffic tracking. GA4 measurement ID configurable via CMD > Traffic > Platform Analytics. Page views, events, and conversions tracked automatically.",
    tags: ["engineering", "task", "task-86", "analytics", "google-analytics"],
    infoboxData: { Task: "#86", Tool: "Replit", Version: "—" },
    content: `# Task #86 — Google Analytics 4 Integration

## What & Why
The Traffic tab (Task #80) allowed admins to embed external analytics, but SEVCO needed first-party Google Analytics 4 tracking properly integrated into the platform for detailed event tracking and conversion measurement.

## What Was Built
- GA4 script injected into the platform when a Measurement ID is configured
- Measurement ID stored in \`platformSettings["analytics.ga4MeasurementId"]\`
- Automatic page view tracking on every route change (using wouter's navigation hooks)
- Custom event tracking for key conversions: store checkout initiated, store purchase completed, contact form submitted, job application submitted
- GA4 integration field added to CMD > Traffic tab for entering the Measurement ID
- Privacy-conscious: GA4 only loads when a Measurement ID is configured (no default tracking)

## Technical Architecture
- GA4 gtag.js script dynamically injected by the \`PlatformAnalyticsProvider\` in App.tsx when the measurement ID is set
- \`useGoogleAnalytics\` hook handles page view tracking on route changes
- Custom events sent via \`window.gtag("event", ...)\` calls at relevant action points

## Files Changed
- \`client/src/App.tsx\` — PlatformAnalyticsProvider, dynamic GA4 script injection, page view tracking hook
- \`client/src/hooks/use-google-analytics.tsx\` — Custom hook for page view and event tracking
- \`client/src/pages/command-traffic.tsx\` — GA4 Measurement ID field in Platform Analytics section
- \`client/src/pages/store-success-page.tsx\` — GA4 purchase event on checkout success
- \`client/src/pages/contact-page.tsx\` — GA4 form submission event
- \`client/src/pages/job-detail.tsx\` — GA4 application submitted event

## Testing Notes
1. Enter a GA4 Measurement ID in CMD > Traffic — platform should begin sending pageview hits
2. Navigate between pages — each navigation should trigger a new GA4 pageview event
3. Complete a store checkout — a purchase event should appear in GA4 real-time reports
4. Leave the Measurement ID blank — no GA4 script should be injected

## Known Limitations / Out of Scope
- Cookie consent/GDPR compliance notice was not added; recommended for production use
- The GA4 integration sends data to Google's servers; no data stays on the SEVCO platform`,
  },
  {
    slug: "eng-task-87-registration-email-fix",
    title: "Task #87 — Registration Email Fix",
    summary: "Fixed the registration flow so users get clear feedback when the verification email fails, and added a 'Resend Verification Email' endpoint. Fixed the email base URL to use SITE_URL in production.",
    tags: ["engineering", "task", "task-87", "auth", "email", "bug-fix"],
    infoboxData: { Task: "#87", Tool: "Replit", Version: "—" },
    content: `# Task #87 — Registration Email Fix

## What & Why
New users were registering but never receiving their verification email, leaving them unable to log in with no clear path to resolution. This task fixed the email delivery issue and added a self-service "resend verification" option.

## What Was Fixed

### 1. Resend Verification Email Endpoint
- \`POST /api/auth/resend-verification\` — accepts \`{ email }\`, looks up the user, generates a new token (replacing the old one), and calls \`sendVerificationEmail()\`
- Rate limited: max 3 requests per 10 minutes per email address
- Returns \`{ success: true }\` if sent, \`{ error: "message" }\` if not

### 2. Registration Response \`emailSent\` Flag
- The registration route (\`POST /api/auth/register\`) now returns \`{ ..., emailSent: boolean }\`
- \`emailSent\` is \`true\` when Resend delivers successfully, \`false\` if an error occurred (user is still registered, just unverified)
- The registration success screen in the frontend reads \`emailSent\` and shows either "Check your email" or "We had trouble sending your verification email — click below to resend"

### 3. Email Base URL in Production
Building on Task #83's fix, confirmed that \`SITE_URL\` is checked first in \`getBaseUrl()\`. Added a startup log warning when SITE_URL is not set to alert developers.

## Files Changed
- \`server/routes.ts\` — POST /api/auth/resend-verification endpoint with rate limiting; emailSent flag in register response
- \`server/auth.ts\` — Improved error handling in sendVerificationEmail flow
- \`server/emailClient.ts\` — Startup warning log when SITE_URL is not set
- \`client/src/pages/auth-page.tsx\` — "Resend verification email" button shown when emailSent is false


## Technical Architecture
- **Email system**: \`server/emailClient.ts\` → \`sendVerificationEmail()\` constructs the verification link using \`getBaseUrl()\`
- **Bug**: \`getBaseUrl()\` returned the Replit dev domain in production because \`REPLIT_DEV_DOMAIN\` was always set. Fixed priority: \`SITE_URL\` > \`REPLIT_DEPLOYMENT_URL\` > \`REPLIT_DEV_DOMAIN\` > localhost
- **Template**: Verification email HTML template updated with correct branding and a prominent CTA button

## Testing Notes
1. Register with a valid email — verify emailSent is true in the response and email is received
2. Register when Resend is misconfigured — emailSent should be false and "resend" CTA should appear
3. Click "Resend Verification Email" on the registration success screen — new email should be sent
4. Try to resend more than 3 times quickly — should receive a rate limit error

## Known Limitations / Out of Scope
- The resend endpoint requires the user's email; there is no "forgot verification email" lookup by username
- Users who never received the email and don't remember the registered email must contact support`,
  },
  {
    slug: "eng-task-88-bug-fixes-6",
    title: "Task #88 — Bug Fixes 6",
    summary: "Sixth bug fix bundle: various UI regressions, API edge cases, and data display issues discovered during platform review. Includes fixes for chat polling, finance calculations, and gallery image loading.",
    tags: ["engineering", "task", "task-88", "bug-fix"],
    infoboxData: { Task: "#88", Tool: "Replit", Version: "—" },
    content: `# Task #88 — Bug Fixes 6

## What & Why
Continuing the platform's quality maintenance cycle, this task addressed a batch of bugs identified during routine use and platform review after the AI agents, subscriptions, and analytics features were deployed.

## What Was Fixed
- **Chat polling on inactive tabs**: The 5-second message polling in the chat sheet was running even on background browser tabs, causing unnecessary API load. Fixed by pausing polling when the browser tab is hidden (using the Page Visibility API) and resuming when the tab becomes active.
- **Finance subscription monthly cost calculation**: Annual subscriptions with amounts entered in cents (e.g., $600.00) were calculating monthly cost as 600÷12=50 rather than correctly. Root cause was a data type issue where \`amount\` was being treated as an integer in some paths. Fixed by ensuring consistent numeric handling.
- **Gallery image 404 handling**: Gallery page showed broken image placeholder for deleted Supabase files. Fixed by adding an \`onError\` handler on gallery \`<img>\` tags to replace the src with a placeholder image.
- **AI agent typing indicator persisting**: If an AI agent chat request failed, the "Agent is thinking..." indicator would remain visible indefinitely. Fixed by ensuring the indicator is always cleared in the finally block of the chat request.
- **Changelog wikiSlug field not editable in CMD**: The wikiSlug field in CMD > Changelog edit form was present but not connected to a controlled input. Fixed by adding the field to the react-hook-form form and the PATCH request payload.

## Files Changed
- \`client/src/components/chat-sheet.tsx\` — Page Visibility API integration for polling
- \`client/src/pages/command-finance.tsx\` — Subscription monthly cost numeric fix
- \`client/src/pages/gallery-page.tsx\` — onError handler for broken gallery images
- \`client/src/components/chat-sheet.tsx\` — Typing indicator cleanup in finally block
- \`client/src/pages/command-changelog.tsx\` — wikiSlug field connected to react-hook-form


## Technical Architecture
- **Scope**: Sixth bug-fix bundle — cross-cutting fixes in frontend components and server routes
- **Pattern**: Each fix isolated to its own component/route file; no schema migrations
- **Key areas**: Navigation state management, form validation edge cases, toast notification timing

## Testing Notes
1. Open the chat sheet, switch to another browser tab — network requests for chat should pause
2. Add an annual subscription for $600/year — monthly equivalent should show $50.00
3. If a gallery image has been deleted from Supabase — a placeholder should appear instead of a broken image icon
4. Trigger an AI agent chat failure — typing indicator should clear and an error message should show
5. Edit a changelog entry and set a wikiSlug — "Read more →" link should appear on /changelog

## Known Limitations / Out of Scope
- Comprehensive performance profiling was not performed in this task`,
  },
  {
    slug: "eng-task-89-news-page",
    title: "Task #89 — News Page",
    summary: "Built a /news page aggregating articles from RSS feeds filtered by configurable search queries. News categories managed in CMD. Articles displayed in a magazine-style editorial layout with wikify functionality for staff.",
    tags: ["engineering", "task", "task-89", "news", "rss", "content"],
    infoboxData: { Task: "#89", Tool: "Replit", Version: "—" },
    content: `# Task #89 — News Page

## What & Why
SEVCO's community and staff needed a curated news feed covering relevant topics (music industry, technology, business). Rather than a fully custom CMS, this task used Google News RSS feeds filtered by configurable search queries, giving admins full control over what news appears on the platform.

## What Was Built
- /news page with a magazine-style editorial layout:
  - Hero article: full-width with large image, source, time, and excerpt
  - Feature grid: large card (col-span-2) + medium cards + small cards
  - Category rows: horizontal scrollable card rows per category with "View all" link
- News categories managed in CMD > News: each category has a name, RSS search query, accent color, display order, and enabled toggle
- RSS feed fetching via Google News RSS URL with the configured search query; parsed server-side using \`fast-xml-parser\`
- 15-minute server-side cache per query (stored in memory or platform_settings) to avoid rate limits
- Article cards: source logo/name pill, relative timestamp ("2 hours ago"), headline, excerpt, external link
- "Wikify" button on each article (Staff+ only): opens a pre-filled wiki article editor with the news article's content
- News added to the platform navigation header

## Technical Architecture

### Schema Additions
\`\`\`
news_categories table: id (serial PK), name (text), query (text), accentColor (text),
  displayOrder (integer), enabled (boolean default true), createdAt (timestamp)
\`\`\`

### API Routes
\`\`\`
GET /api/news — public — returns all enabled news categories
POST /api/news/categories — admin — creates category
PATCH /api/news/categories/:id — admin — updates category
DELETE /api/news/categories/:id — admin — removes category
GET /api/news/feed?query=X&limit=20 — public — fetches and returns parsed RSS articles for a query (15-min cache)
\`\`\`

### Frontend Additions
- \`client/src/pages/news-page.tsx\` — News hub with editorial magazine layout
- \`client/src/pages/command-news.tsx\` — CMD news category management
- Updated \`client/src/components/platform-header.tsx\` — News link in nav
- Updated \`client/src/components/command-sidebar.tsx\` — News link in CMD

### Notable Decisions
- **RSS over official API**: Google News RSS provides indexed news articles without requiring an API key, avoids rate limits, and returns the same quality data as official news APIs.
- **Server-side RSS parsing**: Keeps the \`fast-xml-parser\` dependency server-side only; frontend receives clean JSON article objects.
- **15-minute cache**: Balances freshness with rate limit avoidance; acceptable for a news digest (not a live news ticker).

## Dependencies Installed
- \`fast-xml-parser\` — RSS XML parsing
- \`date-fns\` — Relative time formatting ("2 hours ago")

## Files Changed
- \`shared/schema.ts\` — news_categories table
- \`server/news.ts\` — New RSS fetching and parsing module with 15-min cache
- \`server/routes.ts\` — News category CRUD, news feed endpoint
- \`server/storage.ts\` — News category CRUD methods
- \`client/src/pages/news-page.tsx\` — News page with magazine layout
- \`client/src/pages/command-news.tsx\` — CMD news management
- \`client/src/components/platform-header.tsx\` — News nav link
- \`client/src/components/command-sidebar.tsx\` — News sidebar link
- \`client/src/App.tsx\` — /news and /command/news routes

## Testing Notes
1. Visit /news — hero article and category rows should render with real articles
2. Configure a category in CMD > News with query "music industry" — articles about music should appear
3. Change a category's display order — /news should reflect the new order
4. Click a news article — should open the original source in a new tab
5. As staff, click "Wikify" on an article — wiki editor should open pre-filled with the article content

## Known Limitations / Out of Scope
- RSS availability depends on Google News returning valid XML; temporary failures show empty states with retry
- Article images use the source's thumbnail URLs which may not always render (CORS, expired URLs)
- The wikify feature creates a draft article; editing and publishing is a manual step`,
  },
];

ARTICLE_DATA.push(...NEW_ARTICLES);

// ─────────────────────────────────────────────────────────
// Platform User Guide Articles (general category)
// ─────────────────────────────────────────────────────────
const PLATFORM_ARTICLES: ArticleData[] = [
  {
    slug: "getting-started",
    title: "Getting Started with SEVCO",
    summary: "A complete guide to creating your account, understanding user roles, and navigating the SEVCO platform.",
    tags: ["getting-started", "onboarding", "guide", "platform"],
    infoboxData: { "Category": "General", "Audience": "New Users" },
    content: `# Getting Started with SEVCO

Welcome to SEVCO — a creative community platform built by creators, for creators. This guide will walk you through creating your account, understanding the platform, and getting the most out of everything SEVCO has to offer.

## Creating Your Account

1. Visit [sevco.us](https://sevco.us) and click **Sign Up Free** in the hero section or the top navigation.
2. Enter your desired username, email address, and a secure password.
3. Check your email inbox for a verification link and click it to activate your account.
4. You're in! Your account starts with the **User** role, which gives you access to the store, music, wiki, and community features.

## Understanding User Roles

SEVCO uses a six-tier role system to manage platform access:

| Role | Access Level |
|---|---|
| **User** | Standard access — shop, browse music, read wiki, join community |
| **Client** | Client portal access and project visibility |
| **Partner** | Partner-level resources and collaboration tools |
| **Staff** | Internal tools, wiki editing, and content management |
| **Executive** | Financial reports, advanced settings, and exec dashboard |
| **Admin** | Full platform control — all settings, all users, all data |

Most new accounts are **User** role. Role upgrades are granted by the SEVCO team for partners and collaborators.

## Navigating the Platform

The top navigation bar is your command center. Here's what you'll find:

- **Home** — The main landing page with platform highlights, news, and featured content
- **Wiki** — The SEVCO knowledge base — guides, documentation, and platform history
- **Store** — The SEV Store — merchandise, exclusive drops, and SEVCO products
- **Music** — SEVCO RECORDS — artists, albums, and music discovery
- **Projects** — SEVCO Ventures — active companies and initiatives
- **Services** — What we build for partners — engineering, design, and marketing
- **News** — AI-powered news curated from across the creator economy

## Your Profile

Once logged in, click your avatar in the top-right corner to access your profile settings. You can update your display name, avatar, and notification preferences from there.

## Getting Help

If you need help, the SEVCO Wiki is your first stop. Search for any topic using the search bar at the top of the [Wiki page](/wiki). You can also join the community on Discord via the Community link in the navigation.

## What's Next?

- [Browse the Store](/store) — check out the latest SEVCO merchandise
- [Discover Music](/music) — explore SEVCO RECORDS artists and releases
- [Explore Projects](/projects) — see what SEVCO Ventures is building
- [Read the Platform Overview](/wiki/platform-overview) — a deeper look at every platform feature`,
  },
  {
    slug: "platform-overview",
    title: "SEVCO Platform Overview",
    summary: "A comprehensive map of all SEVCO platform apps, features, and the creator ecosystem that ties them together.",
    tags: ["platform", "overview", "ecosystem", "guide"],
    infoboxData: { "Category": "General", "Audience": "All Users" },
    content: `# SEVCO Platform Overview

SEVCO is a vertically integrated creative platform — not just one product, but an interconnected ecosystem of apps, services, and communities all built with creators in mind. This article maps out every major component.

## The Ecosystem

### 🎵 SEVCO RECORDS
Our in-house music label and distribution platform. SEVCO RECORDS discovers, develops, and distributes independent artists across all genres.
- Browse artists and albums at [/music](/music)
- Stream or save tracks directly to Spotify and Apple Music
- Submit your demo for label consideration
- Learn more: [SEVCO RECORDS — Music Platform](/wiki/records-music-guide)

### 🛍️ SEV Store
The official SEVCO merchandise and product store. From exclusive drops to everyday apparel, the store supports creators and fans alike.
- Shop at [/store](/store)
- Cart, checkout, and Stripe-powered payments built in
- Guest checkout available — no account required
- Learn more: [SEVCO Store — Shopping Guide](/wiki/store-shopping-guide)

### 💼 SEVCO Services
SEVCO offers professional services to partners and clients — engineering, design, marketing, and more.
- Browse available services at [/services](/services)
- Request quotes and manage projects through the client portal
- Learn more: [SEVCO Services — Work With Us](/wiki/services-guide)

### 🏗️ SEVCO Ventures (Projects)
An active portfolio of companies, initiatives, and ventures incubated or operated by SEVCO.
- View all active ventures at [/projects](/projects)
- Each project has a dedicated detail page with status, team lead, and links
- Learn more: [SEVCO Ventures & Projects](/wiki/projects-ventures-guide)

### 📰 SEVCO News
An AI-powered news hub pulling in the latest from across the creator economy, music industry, and tech space.
- Read the latest at [/news](/news)
- Powered by Grok AI and curated X/Twitter sources
- Learn more: [AI-Powered News](/wiki/news-ai-guide)

### 📚 SEVCO Wiki
The platform's internal knowledge base — you're reading it right now. Documentation, guides, engineering history, and platform tutorials all live here.
- Browse categories at [/wiki](/wiki)
- Search any topic in the search bar above
- Learn more: [SEVCO Wiki Guide](/wiki/wiki-guide)

### 👥 Community
The SEVCO community lives on Discord, the SEVCO Feed, and across social platforms. Join the conversation, get early access, and connect with the team.
- [Join Discord](https://discord.gg/sevco)
- Follow us on X/Twitter, Instagram, and YouTube

## How It All Fits Together

Every part of the SEVCO ecosystem is connected through a shared user account system. Once you're logged in, your profile, preferences, and purchase history follow you across every app. Staff and partners have access to the Command Center — our internal admin hub that powers every setting you see on the platform.

## Platform Roadmap

SEVCO is actively evolving. The wiki is updated with every major platform release, and the engineering task history can be browsed in the Engineering category. Check the [Changelog](/changelog) for the latest version notes.`,
  },
  {
    slug: "store-shopping-guide",
    title: "SEVCO Store — Shopping Guide",
    summary: "How to browse, add items to your cart, and checkout securely through the SEV Store.",
    tags: ["store", "shopping", "checkout", "guide", "products"],
    infoboxData: { "Category": "General", "Audience": "Shoppers" },
    content: `# SEVCO Store — Shopping Guide

The SEV Store is where SEVCO brings its creative universe to life through merchandise, exclusive drops, and products. This guide covers everything you need to know to shop with confidence.

## Browsing the Store

Visit [/store](/store) to see the full product catalog. Products are organized by category — use the filter pills at the top of the page to narrow by category (Apparel, Accessories, Digital, etc.).

Each product card shows:
- **Product name** and **price**
- **Stock status** — "In Stock" or "Out of Stock"
- **Category badge** for quick identification

Click any product card to open the full detail page with description, available sizes/variants, and high-resolution photos.

## Adding to Your Cart

On any product detail page, select your size or variant (if applicable) and click **Add to Cart**. The cart drawer slides in from the right showing:
- All items in your cart with quantities
- Line-item totals
- Cart subtotal

You can adjust quantities or remove items directly in the cart drawer.

## Checking Out

Click **Checkout** in the cart drawer to proceed. SEVCO uses **Stripe** for secure payment processing — you'll be taken to a Stripe-hosted checkout page where you can:
- Enter your shipping address
- Choose a shipping method
- Pay with any major credit/debit card, Apple Pay, or Google Pay

**No account required** — guest checkout is fully supported. If you're logged in, your order will be linked to your account and visible in your order history.

## After Your Purchase

After a successful payment you'll be redirected to the SEVCO order confirmation page. You'll also receive a confirmation email at the address you provided during checkout.

## Order Status & Returns

For questions about your order status or returns, contact the SEVCO team via the [Contact page](/contact) or reach out on Discord. Include your order confirmation number for fastest service.

## Stock & Drops

Limited-edition drops sell out fast. Follow SEVCO on social media and join the Discord to get early access and drop notifications. Keep an eye on the [SEVCO News](/news) section for upcoming release announcements.

## Seller Information

All products in the SEV Store are sold by SEVCO LLC. Pricing is displayed in USD. Applicable taxes are calculated at checkout.`,
  },
  {
    slug: "services-guide",
    title: "SEVCO Services — Work With Us",
    summary: "An overview of professional services offered by SEVCO — engineering, design, marketing, and partner program details.",
    tags: ["services", "partner", "engineering", "design", "guide"],
    infoboxData: { "Category": "General", "Audience": "Clients & Partners" },
    content: `# SEVCO Services — Work With Us

SEVCO isn't just a platform — we're a team of builders. Through SEVCO Services, we partner with brands, creators, and companies to deliver world-class engineering, design, and marketing work.

## What We Offer

Browse available services at [/services](/services). Current service categories include:

### Engineering & Development
- Full-stack web application development
- API design and integrations
- Mobile app development
- Platform architecture and DevOps
- AI/ML feature integration

### Design & Creative
- Brand identity and logo design
- UI/UX design for web and mobile
- Motion graphics and video production
- Social media asset creation

### Marketing & Growth
- Content strategy and creation
- Social media management
- Influencer and partnership marketing
- Analytics and performance reporting

### Media & Production
- Podcast production
- Video editing and post-production
- Photography and digital asset creation

## The Partner Program

Brands and agencies that work with SEVCO regularly can apply for **Partner status** on the platform. Partners receive:
- A dedicated client portal with project tracking
- Priority support and dedicated account management
- Co-marketing opportunities with SEVCO's audience
- Access to exclusive Partner-only resources in the wiki

## Getting a Quote

To start a project or request pricing:
1. Visit [/services](/services) and browse available service offerings
2. Click the service you're interested in and review the description
3. Use the contact form or reach out via the [Contact page](/contact) to start the conversation
4. Our team will respond within 2 business days with availability and a preliminary quote

## What to Expect

Every SEVCO project follows a structured process:
1. **Discovery** — we learn your goals, audience, and constraints
2. **Proposal** — we send a scoped proposal with timeline and pricing
3. **Execution** — regular check-ins and updates throughout delivery
4. **Launch & Handoff** — we deliver final assets and provide documentation

## Partner Testimonials

SEVCO has worked with artists, brands, and creators across music, fashion, gaming, and digital media. Reach out to hear about past work and case studies.

## Contact

Ready to work together? Start at [/contact](/contact) or jump into the Discord and introduce yourself.`,
  },
  {
    slug: "projects-ventures-guide",
    title: "SEVCO Ventures & Projects",
    summary: "An overview of SEVCO's active ventures and project portfolio — how they work, their statuses, and how to get involved.",
    tags: ["projects", "ventures", "portfolio", "guide"],
    infoboxData: { "Category": "General", "Audience": "All Users" },
    content: `# SEVCO Ventures & Projects

SEVCO is more than a platform — it's a venture studio. The Projects section at [/projects](/projects) showcases all active SEVCO ventures: companies we operate, initiatives we run, and ideas we're building from the ground up.

## What Are SEVCO Ventures?

A SEVCO Venture is any company, product, or initiative that SEVCO is actively operating or incubating. These range from:
- **Music ventures** — SEVCO RECORDS, artist management, and production companies
- **Tech ventures** — software products and platform businesses
- **Media ventures** — content channels, podcasts, and creative studios
- **Agency ventures** — service businesses across design, engineering, and marketing

## Project Statuses

Every project in the portfolio carries a status badge:

| Status | Meaning |
|---|---|
| **Active** | Fully operational and generating activity |
| **In Progress** | Under active development or build-out |
| **Planned** | Scoped and scheduled but not yet started |
| **Archived** | Completed or paused — visible for reference |

## Browsing Projects

Visit [/projects](/projects) to see the full portfolio grid. Each project card shows the name, type, status, and a short description. Click any project to open its detail page, which includes:
- Full description and background
- Team lead and key contacts
- Website and social links (where public)
- Related wiki articles

## Collaboration & Investment

SEVCO is open to collaboration on ventures that align with our creative mission. If you're interested in partnering on a project, contributing skills, or exploring investment opportunities, reach out via [/contact](/contact).

## Following Along

Even if you're not directly involved, you can follow SEVCO ventures through:
- The Projects page at [/projects](/projects)
- The SEVCO Feed on the home page for team updates
- The [SEVCO News](/news) section for press and announcements
- Discord for real-time community discussion

## Starting a Venture with SEVCO

Have an idea? SEVCO is always looking for the next great creator-economy venture. If you want to pitch a concept or explore an incubation partnership, start the conversation at [/contact](/contact) or on Discord.`,
  },
  {
    slug: "records-music-guide",
    title: "SEVCO RECORDS — Music Platform",
    summary: "How to discover artists, listen to music, explore albums, and submit your demo to SEVCO RECORDS.",
    tags: ["music", "records", "artists", "albums", "guide"],
    infoboxData: { "Category": "General", "Audience": "Music Fans & Artists" },
    content: `# SEVCO RECORDS — Music Platform

SEVCO RECORDS is the music arm of SEVCO — an independent label and music discovery platform built for artists and fans who believe music should be free from the gatekeepers.

## Discovering Music

Visit [/music](/music) to browse the SEVCO RECORDS catalog. The music hub features:
- **Featured Artists** — spotlighted creators at the top of the page
- **Artist Grid** — the full roster, browsable by genre and name
- **Latest Releases** — newest albums and singles from the label

## Artist Pages

Click any artist to view their full profile, including:
- Artist biography and background
- Full discography with album covers
- Links to streaming platforms (Spotify, Apple Music, etc.)
- Social media links

## Albums & Tracks

Each album has its own detail page with the tracklist and release information. From album pages you can:
- View the full track listing
- Jump to the artist's streaming profile
- Discover related artists on the roster

## Streaming Integration

SEVCO RECORDS releases are distributed to all major streaming platforms. Look for **Spotify** and **Apple Music** buttons on artist and album pages to listen directly in your preferred streaming app.

## Submitting Your Demo

Are you an artist looking for a home? SEVCO RECORDS accepts demo submissions from independent artists. Here's how:
1. Visit [/music/submit](/music/submit)
2. Fill in your artist name, contact email, genre, and a link to your best track (SoundCloud, Spotify, etc.)
3. Add a short message introducing yourself and your sound
4. Hit **Submit** — our A&R team reviews all submissions

Submissions are reviewed on a rolling basis. We respond to artists whose sound aligns with the SEVCO vision.

## For Artists on the Roster

If you're already signed or affiliated with SEVCO RECORDS, contact the team to set up your artist profile, upload album art, and link your streaming profiles. Staff members can manage your page in the Command Center.

## The SEVCO RECORDS Mission

Independent music deserves an independent platform. SEVCO RECORDS is committed to fair artist partnerships, transparent royalty structures, and building an audience that values craft over trends. We sign artists we believe in — and we build alongside them.

Follow us and stay up to date on new releases, events, and signings via the [SEVCO News](/news) page and our social channels.`,
  },
  {
    slug: "news-ai-guide",
    title: "AI-Powered News",
    summary: "How SEVCO's news system works — AI curation, Grok-powered sourcing, X feed integration, and the Wikify feature.",
    tags: ["news", "ai", "grok", "x-feed", "wikify", "guide"],
    infoboxData: { "Category": "General", "Audience": "All Users" },
    content: `# AI-Powered News

SEVCO's news system is not a blog — it's a live, AI-curated intelligence feed pulling from the most relevant sources in the creator economy, music industry, and tech world. Visit [/news](/news) to explore.

## How News Is Sourced

The SEVCO News feed aggregates headlines from two main sources:

### X/Twitter Integration
SEVCO monitors curated X (Twitter) accounts and hashtags relevant to our ecosystem. This includes music industry accounts, tech journalists, creator economy commentators, and SEVCO's own official handles. Posts are pulled in real-time and displayed in the X Feed on the homepage and news page.

### AI Curation via Grok
Our news categories are powered by **Grok AI**, which searches the web for the latest articles on configurable query terms. Each news category in the system corresponds to a search query (e.g., "independent music label", "creator economy trends") that Grok uses to surface relevant headlines.

## The News Page

At [/news](/news) you'll find:
- **Hero Story** — the top curated news item for the day
- **Category Rows** — horizontally scrollable swimlanes organized by topic
- **X/Twitter Feed** — real-time posts from SEVCO and curated accounts

Click any headline to open the original source article in a new tab.

## Category Configuration

News categories are configured by SEVCO admins in the Command Center. Each category has:
- A display name (shown on the news page)
- A search query (sent to the Grok AI to find relevant articles)
- Display order (controls where it appears on the news page)

This means news content is always fresh — every page load pulls the latest headlines.

## The Wikify Feature

Staff members can convert any news article into a SEVCO Wiki article using the **Wikify** button on the news page. Clicking Wikify pre-fills the Wiki article editor with:
- The article title
- A summary based on the headline
- The source content (where available) as the starting body

The draft is saved and can then be edited and published to the Wiki by any staff member.

## Staying Current

- Bookmark [/news](/news) for daily creator economy updates
- Follow SEVCO on X/Twitter for real-time posts
- Join the Discord to discuss the latest headlines with the community
- Subscribe to the SEVCO newsletter (coming soon) for weekly digests`,
  },
  {
    slug: "wiki-guide",
    title: "SEVCO Wiki Guide",
    summary: "How to navigate the wiki, search for articles, understand categories, and contribute through the revision system.",
    tags: ["wiki", "guide", "search", "categories", "revisions"],
    infoboxData: { "Category": "General", "Audience": "All Users" },
    content: `# SEVCO Wiki Guide

The SEVCO Wiki is the platform's knowledge base — where guides, documentation, engineering history, and platform tutorials all live. You're reading it right now. This guide explains how the wiki works and how you can get the most out of it.

## Navigating the Wiki

The wiki is organized into **categories**, each covering a broad area:

| Category | What's Inside |
|---|---|
| **General** | Platform guides, onboarding, and user documentation |
| **Engineering** | Technical task history, architecture notes, and API docs |
| **Operations** | Internal processes, workflows, and team guidelines |
| **Design** | Brand guidelines, design system notes, and UX patterns |
| **Sales** | Sales playbooks and partner resources |
| **Support** | Support procedures and FAQs |

Browse categories from the [Wiki landing page](/wiki). The sidebar on the left (or the dropdown on mobile) shows the category tree.

## Searching the Wiki

Use the **search bar** at the top of the wiki sidebar or the search icon in the header to search all articles by title or content. The search returns ranked results — click any result to jump directly to the article.

## Reading Articles

Articles are written in Markdown and rendered into formatted pages with:
- **Headings** for section navigation
- **Tables** for structured information
- **Code blocks** for technical content
- **Links** to other platform pages and external sources
- **Infobox** — a summary panel on the right side of key articles with at-a-glance data

At the bottom of each article, you'll find:
- **Citations** — sources referenced in the article
- **Related Articles** — automatically generated cross-links to related content
- **Revision History** — a log of all edits and updates

## Contributing to the Wiki

All logged-in users can submit edits to existing articles. Here's how the revision workflow works:

1. Open any article and click the **Edit** button (appears when logged in)
2. Make your changes in the markdown editor
3. Click **Submit for Review**

Your changes are saved as a **pending revision**. Staff members will review and approve (or request changes to) your submission. Approved revisions are merged into the live article immediately.

**Staff members and above** can publish articles directly without the pending review step.

## Creating New Articles

Staff+ can create new articles from the Wiki landing page or via the **New Article** button in the Command Center. When creating an article:
- Choose a **category** that best fits the content
- Write a clear **summary** (shown on the wiki index and in search results)
- Add relevant **tags** to improve discoverability
- Set status to **Published** when ready to go live (or **Draft** to save without publishing)

## Article Best Practices

- Use clear, descriptive headings (H2 and H3 for sections and sub-sections)
- Keep summaries under 100 words
- Link to related platform pages using markdown links (e.g., \`[/store](/store)\`)
- Add an infobox for reference-style articles (people, projects, releases)
- Tag articles with relevant keywords for search discoverability

## Need Help?

If you can't find what you're looking for, ask in the [Discord](https://discord.gg/sevco) or submit a request to the SEVCO team via [/contact](/contact).`,
  },
];

async function getGeneralCategoryId(): Promise<number> {
  const rows = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, "general"));
  if (!rows.length) throw new Error("General category not found — cannot seed platform wiki articles");
  return rows[0].id;
}

export async function runWikiSeed() {
  console.log("Starting wiki seed — updating all Engineering articles...");
  const categoryId = await getEngineeringCategoryId();
  let updated = 0;
  let created = 0;
  let errors = 0;

  for (const article of ARTICLE_DATA) {
    try {
      const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, article.slug));
      
      if (existing.length > 0) {
        await db.update(articles)
          .set({
            title: article.title,
            content: article.content,
            summary: article.summary,
            tags: article.tags,
            infoboxData: article.infoboxData,
            infoboxType: "general" as const,
            status: "published",
            categoryId,
          })
          .where(eq(articles.slug, article.slug));
        updated++;
        process.stdout.write(`U`);
      } else {
        await db.insert(articles).values({
          slug: article.slug,
          title: article.title,
          content: article.content,
          summary: article.summary,
          tags: article.tags,
          infoboxData: article.infoboxData,
          infoboxType: "general" as const,
          status: "published",
          categoryId,
        });
        created++;
        process.stdout.write(`C`);
      }
    } catch (err: any) {
      console.error(`\nError on ${article.slug}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n\nArticles — Updated: ${updated}, Created: ${created}, Errors: ${errors}`);

  const CHANGELOG_WIKI_SLUGS: Record<string, string> = {
    "0.1.0": "eng-task-2-platform-shell-global-navigation",
    "0.2.0": "eng-task-1-rbac-role-permission-system",
    "0.3.0": "eng-task-3-landing-page-dashboard",
    "1.0.0": "eng-task-23-home-page-contact-page",
    "1.1.0": "eng-task-27-music-expansion",
    "1.2.0": "eng-task-36-version-system-changelog",
    "1.2.1": "eng-task-43-bug-fixes-nav-polish",
    "1.3.0": "eng-task-44-project-social-links-about-page",
    "1.3.1": "eng-task-45-listen-page-social-links-cmd",
    "1.4.0": "eng-task-46-cmd-display-tab",
    "1.5.0": "eng-task-47-platform-search",
    "1.5.1": "eng-task-48-bug-fixes",
    "1.5.2": "eng-task-49-cmd-enhancements",
    "1.5.3": "eng-task-50-home-bulletin-footer-store-cleanup",
    "1.6.0": "eng-task-51-gallery-tools-dropdown",
    "1.6.1": "eng-task-52-brand-section-about",
    "1.7.0": "eng-task-53-hosting-landing-page",
    "1.7.1": "eng-task-54-project-service-icons-placeholder-products",
    "1.8.0": "eng-task-55-spotify-integration",
    "1.8.1": "eng-task-75-finance-subscriptions",
  };

  let clUpdated = 0;
  for (const [version, wikiSlug] of Object.entries(CHANGELOG_WIKI_SLUGS)) {
    try {
      const result = await db.update(changelog)
        .set({ wikiSlug })
        .where(and(
          eq(changelog.version, version),
          not(like(changelog.wikiSlug!, "platform-task-%"))
        ));
      clUpdated++;
    } catch (err: any) {
      console.error(`Changelog update error for v${version}: ${err.message}`);
    }
  }
  console.log(`Changelog — Updated ${clUpdated} entries with wikiSlug links`);

  // ── Platform guide articles (general category) ──────────────────────────
  console.log("\nSeeding platform guide wiki articles...");
  let genCategoryId: number | null = null;
  try {
    genCategoryId = await getGeneralCategoryId();
  } catch (err: any) {
    console.error("Could not find general category — skipping platform articles:", err.message);
    return;
  }

  let pUpdated = 0;
  let pCreated = 0;
  let pErrors = 0;

  for (const article of PLATFORM_ARTICLES) {
    try {
      const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, article.slug));
      if (existing.length > 0) {
        await db.update(articles)
          .set({
            title: article.title,
            content: article.content,
            summary: article.summary,
            tags: article.tags,
            infoboxData: article.infoboxData,
            infoboxType: "general" as const,
            status: "published",
            categoryId: genCategoryId,
          })
          .where(eq(articles.slug, article.slug));
        pUpdated++;
        process.stdout.write(`U`);
      } else {
        await db.insert(articles).values({
          slug: article.slug,
          title: article.title,
          content: article.content,
          summary: article.summary,
          tags: article.tags,
          infoboxData: article.infoboxData,
          infoboxType: "general" as const,
          status: "published",
          categoryId: genCategoryId,
        });
        pCreated++;
        process.stdout.write(`C`);
      }
    } catch (err: any) {
      console.error(`\nError on platform article ${article.slug}: ${err.message}`);
      pErrors++;
    }
  }

  console.log(`\nPlatform Articles — Updated: ${pUpdated}, Created: ${pCreated}, Errors: ${pErrors}`);
}
