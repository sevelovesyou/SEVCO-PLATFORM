#!/usr/bin/env node
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const AUTHOR_ID = "f035b031-5ca4-4b7c-8e78-343b86d41968";
const CATEGORY_ID = 12; // SEVCO Platform subcategory

const articles = [
  {
    title: "Authentication & Access Control",
    slug: "authentication-access-control",
    summary: "How SEVCO handles user registration, login, sessions, role-based permissions, and account security.",
    tags: ["authentication", "rbac", "roles", "security", "sessions"],
    content: `# Authentication & Access Control

## Overview
The SEVCO Platform uses a layered authentication and role-based access control (RBAC) system to manage who can access what across every section of the platform. From first registration through every authenticated request, identity and permissions are verified server-side.

## Role Hierarchy
Roles are tiered from most to least privileged:

- **admin** — Full platform control: all Command Center features, schema management, unrestricted access
- **executive** — High-level oversight, reports, and user management
- **staff** — Content creation, store management, wiki editing, member support
- **partner** — Access to partner-facing features and private project content
- **client** — Client portal: invoices and assigned project views
- **user** — Standard member: feed, profile, notes, wiki reading

Every API route is guarded server-side using the requireAuth and requireRole(minRole) middleware. Frontend UI conditionally renders based on the role returned by /api/auth/me.

## Registration & Email Verification
New accounts go through email verification via Resend. After registration the user receives a time-limited, single-use verification link. Unverified accounts have limited access until the email is confirmed.

## Session Management
Sessions use Express sessions backed by PostgreSQL (connect-pg-simple). The trust proxy setting is enabled in production so cookies work correctly behind Replit's reverse proxy. Session cookies are httpOnly and secure in production environments.

## X/Twitter Account Linking
Users can connect their X account from the Account settings page. This stores the x_id, x_username, and x_access_token on the user record, enabling X-authenticated features: posting, timeline access, and X search enrichment on the Search page.

## Authentication UX
The login and registration pages use SEVCO-branded copy. The flow is intentionally minimal — email and password, with a clear path to verification.`
  },
  {
    title: "Platform Shell & Navigation",
    slug: "platform-shell-navigation",
    summary: "The persistent top navigation bar, sidebar, header dropdowns, mega-menus, mobile nav, and platform footer.",
    tags: ["navigation", "header", "sidebar", "mega-menu", "footer"],
    content: `# Platform Shell & Navigation

## Overview
The platform shell is the chrome that wraps every page: the top navigation bar, the collapsible wiki sidebar, section mega-menus, and the footer. It was designed once and used everywhere so changes propagate across the entire platform automatically.

## Top Navigation Bar
The platform header (platform-header.tsx) is a persistent bar containing:
- SEVCO logo (links to home)
- Primary nav links: Home, Wiki, Music, Store, Projects, Services, Jobs, More
- Right side: Tools dropdown, Cart icon, Search, Account menu
- Notification bell with chime and unread badge

Dropdowns use a custom DropdownPanel component that avoids Radix's modal mode to prevent the platform header from being hidden by portals. All Radix Select and DropdownMenu components default to modal=false globally.

## Mega-Menus
Several sections use full-width mega-menu dropdowns for deep navigation:
- **Projects** — shows all ventures with logos and descriptions
- **Services** — organized service categories with icons
- **More** — links to secondary platform sections

## Wiki Sidebar
The wiki has a collapsible left sidebar (app-sidebar.tsx) showing the six main categories (General, Operations, Engineering, Design, Sales, Support) with expandable subcategory trees. The sidebar highlights the active article and category.

## Mobile Navigation
The nav collapses to a hamburger menu on mobile. Sidebar navigation is accessible via a slide-out drawer.

## Footer
The platform footer appears on all public pages and includes:
- Social media links
- Navigation sections: Platform, Company, Legal
- Copyright notice and version number

## Nav Color Controls
The header background, text, and accent colors are configurable from Platform Settings in the Command Center. Admins can set per-section button colors as well. Changes propagate instantly without a deployment.`
  },
  {
    title: "Landing Page & Home",
    slug: "landing-page-home",
    summary: "The SEVCO public landing page, hero section, feature cards, bulletin board, wiki section, and marketing surfaces.",
    tags: ["landing", "home", "hero", "marketing", "bulletin"],
    content: `# Landing Page & Home

## Overview
The SEVCO landing page (/) is the public face of the platform. It introduces the brand, showcases ventures, highlights platform features, and drives visitors toward key sections. It is fully content-managed — text, cards, and section visibility are controlled from the Command Center.

## Hero Section
The hero features a large headline, a subheadline, and a primary CTA. The headline text is editable from CMD Platform Settings, including an asterisk (*) markup that renders a highlighted accent word for visual emphasis. The hero background uses a layered dark design with brand imagery.

## Feature Cards (What's New / Updates)
Below the hero, a grid of cards surfaces recent platform updates pulled from the wiki (SEVCO Platform category articles). Cards show title, summary, category badge, and date. Heights are uniform and hover states include an elevation/lift effect.

## Ventures Grid
A grid of venture cards shows all SEVCO projects. Each card displays:
- Venture name and description
- App icon image (if set) or a folder icon fallback
- Links to the project page or external URL

## From the Wiki
A 6-card section pulls recent published wiki articles, giving visitors a taste of platform knowledge. Article cards link directly to their full articles.

## Store Card
The home page store preview shows the last 3 product images in a stacked visual, linking to the full store.

## Bulletin Board
An admin-managed announcement section sits prominently on the home page. Admins set the content from CMD. Useful for announcements, events, and featured content.

## Section Visibility
Admins can toggle which home page sections are visible (hero, ventures, wiki section, bulletin, store card, etc.) from Platform Settings without touching code.

## Sparks Section
The home page includes a Social Sparks promo section explaining the sparks economy and linking to the pricing/purchase page.`
  },
  {
    title: "Wiki System",
    slug: "wiki-system",
    summary: "The SEVCO wiki: categories, subcategories, article editor, review queue, archive, URL structure, and sidebar.",
    tags: ["wiki", "articles", "categories", "editor", "review"],
    content: `# Wiki System

## Overview
The SEVCO Wiki is a full-featured internal knowledge base and public documentation platform. It supports categories, subcategories, rich markdown articles, a staff review queue, an archive, and platform-generated changelog articles.

## URL Structure
Wiki articles use two-level URL paths:
- /wiki/:categorySlug/:articleSlug — for articles in a subcategory
- /wiki/:slug — for top-level articles and special routes

Special routes (in order): /wiki/archive → /wiki/new → /wiki/review → /wiki/:catSlug/:artSlug → /wiki/:slug

## Categories & Subcategories
Six main categories: General, Operations, Engineering, Design, Sales, Support. Each can have subcategories (e.g., Engineering > SEVCO Platform). Category slugs are unique; names are not. Staff and above can manage subcategories from CMD → Wiki.

## Article Editor
The article editor supports full markdown with a preview mode. Articles have:
- Title, slug (auto-generated from title, editable)
- Summary / description
- Tags array
- Category assignment
- Status: draft, published, archived
- Optional infobox (type + data) for structured sidebar content

## Review Queue
Articles submitted by lower-permission users land in a review queue at /wiki/review. Staff+ can approve or reject. Approved articles are published immediately.

## Archive
Archived articles are preserved at /wiki/archive. They are not shown in navigation or recent article feeds but remain accessible via direct URL.

## SEVCO Platform Articles
The Engineering > SEVCO Platform subcategory contains feature-area articles describing what has been built on the platform. These replace the old one-per-task auto-generated articles and are updated automatically when new tasks merge.

## Recent Articles
The wiki home and platform landing surfaces pull recently updated published articles. Articles in SEVCO Platform appear in the Engineering section of the wiki and in the /platform update feed.

## Sidebar
The wiki sidebar shows all categories and subcategories in a collapsible tree. The active article and its parent category are highlighted. Staff+ see a "New Article" button on category and subcategory pages.`
  },
  {
    title: "Store & E-Commerce",
    slug: "store-ecommerce",
    summary: "The SEVCO Store: product catalog, categories, cart, Stripe checkout, order management, analytics, and store CMD.",
    tags: ["store", "ecommerce", "stripe", "checkout", "products", "orders"],
    content: `# Store & E-Commerce

## Overview
The SEVCO Store (/store) is a full-featured e-commerce section where physical and digital products are sold to the public. It is backed by Stripe for payment processing and managed from the Command Center.

## Product Catalog
Products have:
- Name, description, price, stock count
- Up to 5 product photos (stored in Supabase Storage)
- Category assignment
- Visibility: public or draft
- Stock status indicator (In Stock / Low Stock / Sold Out)

Product cards feature clear pricing, stock status, and a hover action. Clicking opens a detail view with the full product description and photo gallery.

## Categories Management
Store categories are managed by staff+ from CMD → Store. Categories organize the product grid with filter tabs. Category order and naming are controlled without code changes.

## Cart & Checkout
The cart is a slide-out drawer accessible from the cart icon in the nav. Line items show product thumbnail, name, quantity controls, and subtotal. Checkout uses Stripe Checkout — users are redirected to a hosted Stripe page, then returned to a success/cancel URL on SEVCO.

## Orders Management
The CMD → Store → Orders tab shows all orders from Stripe. Staff+ can view order status, line items, customer info, and fulfillment notes. Orders are pulled live from the Stripe API.

## Analytics
The Store Analytics section in CMD shows:
- Total revenue, order count, average order value
- Revenue over time chart
- Top-selling products
- Recent transactions

## Admin Management (CMD)
From CMD → Store, staff+ can:
- Create, edit, and delete products
- Upload/reorder product photos
- Manage product categories
- Set store-wide settings
- View order history and analytics`
  },
  {
    title: "Music Platform — SEVCO Records",
    slug: "music-platform-sevco-records",
    summary: "The SEVCO Records music hub: artist pages, albums, tracks, the music player, playlists, beats library, stream counts, and Spotify integration.",
    tags: ["music", "sevco-records", "artist", "player", "spotify", "beats"],
    content: `# Music Platform — SEVCO Records

## Overview
The Music section (/music) is SEVCO RECORDS' home on the platform. It showcases artists, albums, and tracks; provides a persistent music player; and gives staff tools to manage the music catalog from the Command Center.

## Artists & User Profiles
Artist pages are built on top of user profiles — any user with tracks in the system gets an artist profile page. Artist pages show:
- Profile photo and bio
- Discography (albums and singles)
- Stream counts per track
- Social links

## Albums & Tracks
The music catalog supports:
- Albums with cover art, release date, genre, and description
- Individual tracks with audio file, cover image, genre, duration, and privacy setting
- Private tracks are playable only when authenticated
- Stream counts increment on each play and are displayed on track cards

## Music Player
A persistent player bar appears at the bottom of the screen when music is playing. The player shows:
- Track cover art (responsive height)
- Track name and artist
- Play/pause, previous, next controls
- Progress bar with scrubbing
- Volume and mute controls, synced with the nav mute button

Audio is proxied through a /songs/:trackId route to handle authentication and Supabase Storage signed URLs transparently.

## Beats Library
The beats library in CMD → Music gives producers a place to upload instrumental beats separately from full tracks.

## Music Submission
Artists can submit tracks for review from the Music page. The submission form pre-fills genre and links to the submitting user's profile.

## Spotify Integration
The CMD → Music → Spotify tab allows staff to connect and manage the SEVCO Records Spotify presence, link Spotify artist profiles, and view Spotify data alongside platform stream counts.

## CMD Music Management
From CMD → Music, staff+ can:
- Upload and manage tracks (with cover image upload)
- Create and manage albums
- View the beats library
- Configure Spotify integration`
  },
  {
    title: "Projects & Ventures",
    slug: "projects-ventures",
    summary: "The Projects section showcasing all SEVCO ventures: project cards, detail pages, mega-menu, icons, and social links.",
    tags: ["projects", "ventures", "portfolio", "companies"],
    content: `# Projects & Ventures

## Overview
The Projects section (/projects) is a portfolio of all active SEVCO ventures. Each venture is a company, product, or initiative operating under the SEVCO umbrella. The section gives visitors and partners a high-level view of SEVCO's scope.

## Venture Cards
Each project card displays:
- Venture name and short description
- App icon image (pulled from the project's appIcon URL field) or a folder icon fallback
- External URL and GitHub/app links
- Tags and category

The landing page also surfaces a venture card grid with the same icon-first design.

## Project Detail Pages
Clicking a venture opens a detail view with:
- Full description
- Links (website, GitHub, app)
- Associated team members
- Project status and category

## Projects Mega-Menu
The nav Projects dropdown is a full-width mega-menu listing all ventures with their names and one-line descriptions. Clicking any entry navigates to that project's detail page.

## CMD Projects Management
From CMD → Projects, admins and executives can:
- Create, edit, and delete ventures
- Upload a project app icon (stored in Supabase Storage)
- Set the GitHub URL, app URL, and website URL (with validation)
- Assign linked domains from the Domains section
- Manage team assignments

## App Icons
Project icons are displayed on venture cards both on the /projects page and on the home landing page. If no icon is set, a Folder icon from lucide-react is shown as a fallback. Icons are uploaded to Supabase Storage and referenced by URL.`
  },
  {
    title: "Services",
    slug: "services-platform",
    summary: "The SEVCO Services page: service categories, individual service listings, mega-menu navigation, and file upload support.",
    tags: ["services", "mega-menu", "categories", "offerings"],
    content: `# Services

## Overview
The Services section (/services) showcases all professional services offered by SEVCO. Services are organized by category and displayed with clear descriptions, icons, and pricing information where applicable.

## Service Categories
Services are grouped into categories (Creative, Technology, Business, etc.). Each category appears as a tab or section header. Category management is handled by admins from CMD.

## Service Listings
Each service has:
- Name and detailed description
- Category assignment
- Icon or thumbnail
- Pricing information or "Contact for pricing"
- CTA linking to contact or booking

## Services Mega-Menu
The Services nav link opens a mega-menu organized by service category, giving visitors quick access to any service area without navigating through the full page. Each column in the mega-menu represents a category.

## File Uploads
Services can have associated file uploads (case studies, portfolios, service guides). These are uploaded to Supabase Storage and linked from the service detail view.

## Admin Management
From CMD → Services, staff+ can create, edit, and delete services and service categories. They can reorder services within categories and control visibility.`
  },
  {
    title: "Jobs",
    slug: "jobs-platform",
    summary: "The SEVCO Jobs board: job listings, departments, application flow, and admin management.",
    tags: ["jobs", "careers", "hiring", "applications"],
    content: `# Jobs

## Overview
The Jobs section (/jobs) is SEVCO's internal hiring board, listing open roles across all ventures and departments. Anyone can browse; applying requires an account.

## Job Listings
Each job listing includes:
- Title, department, and location (remote/on-site/hybrid)
- Full description in markdown
- Employment type (full-time, part-time, contract, internship)
- Compensation range (optional)
- Application deadline

## Application Flow
Logged-in users can apply directly from the listing page. Applications capture:
- Applicant's profile information (pre-filled from their account)
- Cover letter or message
- Optional resume/portfolio link

## Department Organization
Jobs are grouped by department. The jobs page shows a department filter so applicants can find relevant roles quickly.

## Admin Management
From CMD → Jobs (or via the admin panel), staff+ can:
- Post new job listings
- Edit or close existing listings
- Review and manage applications
- Mark positions as filled or archived`
  },
  {
    title: "Profile & User Accounts",
    slug: "profile-user-accounts",
    summary: "User profile pages, avatar and banner customization, social links, follower system, and account settings.",
    tags: ["profile", "accounts", "avatar", "social", "followers"],
    content: `# Profile & User Accounts

## Overview
Every SEVCO member has a public profile page (/profile/:username) that serves as their identity on the platform. Profiles are highly customizable and inspired by the expressiveness of classic social platforms.

## Profile Customization
Users can customize:
- **Avatar** — uploaded image or URL; displayed throughout the platform (feed, wiki, comments)
- **Banner** — wide header image behind the profile card
- **Bio** — freeform markdown-supported description
- **Location and website** — optional display fields
- **Custom colors** — accent color for the profile card
- **Social links** — X, GitHub, Instagram, Spotify, LinkedIn, and others

## Follower System
Users can follow other members. Follow counts appear on the profile card. The Social Feed uses the follow graph to determine whose posts appear in the Following tab.

## Hover Cards
Throughout the platform (feed, wiki, comments), hovering over a username shows a compact profile hover card with avatar, bio snippet, follow button, and social links.

## Account Settings
From the Account page (/account), users can:
- Update their profile information and avatar
- Change their password
- Connect their X account
- Manage notification preferences
- View their Sparks balance

## Activity
User profiles show their recent activity: articles they've written, posts they've made, and sparks they've given or received.`
  },
  {
    title: "Social Feed",
    slug: "social-feed",
    summary: "The SEVCO Social Feed: posts, replies, reposts, likes, follows, feed tabs, and social submenu.",
    tags: ["feed", "social", "posts", "replies", "likes", "follows"],
    content: `# Social Feed

## Overview
The Social Feed (/social or /feed) is SEVCO's in-platform social network. Members post updates, share content, reply to each other, and engage with the community in real time.

## Feed Tabs
The feed has three tabs:
- **For You** — algorithmic mix of posts from followed users and trending content
- **Following** — posts only from users you follow
- **Trending** — most-engaged posts across the platform

## Posts
A post can contain:
- Text content (up to ~500 characters)
- Attached image or media
- Links with preview cards

Replies are threaded under the original post. Users can reply, repost (share to their followers), or give a ⚡ Spark.

## Follow Hover Cards
Hovering over any username in the feed shows a profile hover card with a follow/unfollow button, making it easy to grow your network without leaving the feed.

## Social Submenu
The navigation includes a Social submenu linking to the Feed, Members directory, and the Sparks Leaderboard.

## Moderation
Staff+ can remove posts and replies from the feed and from the admin view in CMD. Reported content is flagged for review.`
  },
  {
    title: "Social Sparks Economy",
    slug: "social-sparks-economy",
    summary: "The SEVCO Sparks currency: earning, spending, gifting sparks on posts and articles, leaderboard, purchase packs, and admin controls.",
    tags: ["sparks", "economy", "currency", "leaderboard", "social"],
    content: `# Social Sparks Economy

## Overview
Sparks (⚡) are SEVCO's platform currency. Members earn Sparks by receiving them from other users and spend them to recognize great content. Sparks create a virtuous economy of quality: the more value you provide, the more Sparks flow to you.

## What Sparks Can Be Given To
- **Posts** on the Social Feed
- **Wiki Articles**
- **Gallery Images**

Each content item shows its total Spark count. Clicking the ⚡ button deducts one Spark from your balance and credits it to the content creator. Animated in-app notifications celebrate incoming Sparks.

## Earning Sparks
- Free allocation: members receive a base Spark allowance periodically
- Received as gifts from other members
- Purchased in packs (see Pricing below)

## Spark Packs (Purchase)
| Pack | Amount | Price |
|------|--------|-------|
| Starter | 100 ⚡ | $8 |
| Boost | 500 ⚡ | $36 |
| Surge | 1,000 ⚡ | $69 |
| Inferno | 10,000 ⚡ | $600 |

Purchases go through Stripe Checkout. On success, the Sparks are credited immediately.

## Leaderboard
The Sparks Leaderboard (/sparks/leaderboard) ranks all members by total Sparks received. It refreshes regularly and shows top contributors across the platform.

## Account & Home Integration
The user's Spark balance appears on the Account page and in a Sparks section on the home page. The /sparks route provides a dedicated Sparks hub.

## Admin Controls
From CMD → Sparks, admins can:
- View the full Sparks ledger
- Manually adjust balances
- Configure free allocation amounts and intervals
- Seed the platform with initial pack products`
  },
  {
    title: "Notes Tool",
    slug: "notes-tool",
    summary: "The SEVCO Notes tool: creating notes, the rich text editor, auto-save, export options, and mobile toolbar.",
    tags: ["notes", "editor", "export", "productivity"],
    content: `# Notes Tool

## Overview
The Notes tool (/notes) is a personal note-taking workspace built into the platform. Every member has their own private notes that auto-save and persist across sessions.

## Editor
The notes editor uses a rich text experience with:
- Bold, italic, underline, strikethrough
- Headings (H1, H2, H3)
- Ordered and unordered lists
- Code blocks and inline code
- Blockquotes
- Links

The toolbar is responsive — on mobile it collapses to a compact row to avoid layout overflow. Paragraphs render at single-spacing (not double-spaced).

## Auto-Save
Notes save automatically as you type (debounced). When navigating away, a save-on-unmount hook ensures the final state is captured before the component unmounts.

## Export Options
Notes can be exported to:
- Plain text (.txt)
- Markdown (.md)
- Share via X post (pre-fills a tweet with the note content)

The Bear app link was replaced with an X post action for tighter platform integration.

## Organization
Notes are listed in a left sidebar with the note title (derived from the first line) and last-updated time. Creating a new note opens a blank editor immediately.

## Access
Notes are private by default — only the note owner can see or edit their notes. There is no sharing or collaboration feature currently.`
  },
  {
    title: "Command Center (CMD)",
    slug: "command-center-cmd",
    summary: "The SEVCO Command Center: admin sidebar, all management tabs, display settings, color editor, brand assets, media, staff directory, and org chart.",
    tags: ["cmd", "admin", "command-center", "management", "settings"],
    content: `# Command Center (CMD)

## Overview
The Command Center (/command) is the staff control panel for the entire SEVCO Platform. It uses a Linear-style dark sidebar navigation with icon tabs and collapsible groups. Access requires at minimum staff role; many features require admin or executive.

## Sidebar Navigation
The CMD sidebar is a dark, icon-first nav panel with labeled sections:
- Overview (dashboard)
- Store (products, categories, orders, analytics)
- Music (tracks, albums, beats, Spotify)
- Wiki (articles, categories, review queue)
- Users (member directory, roles, permissions)
- Staff (staff directory, org chart)
- Projects (ventures management)
- Services (service listings and categories)
- Jobs (job listings and applications)
- Brand (assets, color editor, media library)
- Sparks (ledger, allocation, packs)
- AI Agents (agent management, Paperclip dashboard)
- Domains (domain records, linked projects)
- Finance (invoices, subscriptions)
- Platform Settings (nav colors, hero text, legal links, section visibility)
- Inbox (email diagnostics, inbound email)

## Display Tab
The Display tab controls platform-wide appearance settings:
- Nav background, text, and accent colors (4-value system)
- Per-page CTA button colors
- Hero headline text and asterisk-accent markup
- Section visibility toggles for the home page

## Brand Assets & Color Editor
CMD → Brand allows admins to:
- Upload and manage brand logos, icons, and media
- Use the full color editor to define the platform's color palette
- Manage the media library (images, videos) used across the platform

## Staff Directory & Org Chart
CMD → Staff shows the full staff directory with avatars, roles, and departments. The org chart visualizes reporting relationships.

## AI Agents
CMD → AI Agents embeds the Paperclip dashboard for managing AI agent personas, their model configurations (Claude, Grok, OpenRouter models), and conversation history.

## Domains Management
CMD → Domains shows all registered domains, their DNS status, linked SEVCO projects, and Hostinger integration status.`
  },
  {
    title: "Gallery",
    slug: "gallery-platform",
    summary: "The SEVCO Gallery: image display, lightbox, CDN proxy, upload management, spark reactions, and upload limits.",
    tags: ["gallery", "images", "lightbox", "cdn", "uploads"],
    content: `# Gallery

## Overview
The Gallery (/gallery) is SEVCO's visual portfolio — a curated collection of images from across the organization's work, events, and projects. It supports full-resolution viewing, reactions, and staff management.

## Image Display
Gallery images are displayed in a masonry-style grid. Each image card shows:
- Thumbnail (optimized for grid display)
- Title and description on hover
- Spark count (⚡)
- Uploader credit

## Lightbox
Clicking any image opens a full-screen lightbox with:
- Full-resolution image (served via proxy to handle Supabase Storage signed URLs)
- Navigation arrows (previous / next)
- Title, description, tags, and uploader info
- Spark button

## CDN Proxy & Supabase Storage
Gallery images are stored in Supabase Storage. To avoid CORS issues and handle signed URL expiry gracefully, images are served through an internal proxy route. This ensures images always load correctly regardless of where they are embedded.

## Upload Limits
Gallery image uploads accept files up to 100MB (increased from the original 10MB limit).

## Management
Staff+ can upload new images to the gallery from the Gallery page or from CMD. Each upload captures:
- Image file (to Supabase Storage)
- Title and description
- Tags
- Visibility (public or private)

## Sparks on Gallery
Each gallery image has a ⚡ Spark button. Sparks are tracked in the gallery_sparks table and roll up to the content_sparks leaderboard.`
  },
  {
    title: "File Storage & Media Uploads",
    slug: "file-storage-media-uploads",
    summary: "Supabase Storage integration for all file uploads across the platform: images, audio, documents, and media library.",
    tags: ["supabase", "storage", "uploads", "files", "cdn"],
    content: `# File Storage & Media Uploads

## Overview
All file uploads on the SEVCO Platform are stored in Supabase Storage, giving the platform a scalable, CDN-backed file storage layer. This covers product images, music tracks, cover art, gallery images, profile avatars, brand assets, and document uploads.

## Supabase Storage Setup
The platform connects to Supabase using the service role key for server-side uploads and the anon key for client-side operations where appropriate. Buckets are organized by content type:
- products — store product images
- music — audio tracks and album art
- gallery — gallery images
- avatars — user profile photos
- brand — logo assets and brand files
- documents — uploaded service files and attachments

## Upload Components
Reusable upload components across the platform handle:
- File selection (drag-and-drop or click-to-browse)
- Client-side validation (file type, size limit)
- Upload progress indicator
- Signed URL generation for private files
- Returned URL storage in the database

## Proxy Routes
Several content types use server-side proxy routes to serve files, protecting Supabase signed URLs from expiry and CORS issues. Music tracks use /songs/:trackId, gallery images use /gallery/proxy/:imageId.

## Size Limits
- Gallery images: up to 100MB
- Music tracks: large file support (streamed through proxy)
- Product images: up to 10MB per image, up to 5 per product
- Avatars and brand assets: standard image sizes

## Media Library in CMD
CMD → Brand → Media Library gives admins a browser of all uploaded assets across the platform. Assets can be viewed, copied (URL), and deleted from one central interface.`
  },
  {
    title: "Brand & Visual Identity",
    slug: "brand-visual-identity",
    summary: "SEVCO brand assets, color system, logo management, About page, and brand guidelines.",
    tags: ["brand", "design", "colors", "logo", "about"],
    content: `# Brand & Visual Identity

## Overview
SEVCO's visual identity is managed on-platform and applied consistently across every surface. The brand system covers the logo, color palette, typography, and the About page that introduces SEVCO to the public.

## Logo & Favicon
The platform uses the official SEVCO logo and favicon across all pages. The logo is sized with a fixed aspect ratio constraint to prevent skewing on browser resize. Multiple logo variants exist for different contexts (light background, dark background, icon-only).

## Color System
The platform color system uses CSS custom properties defined in index.css and configured via Tailwind. Colors are organized as:
- Primary — main brand accent
- Secondary — supporting accent
- Background / Foreground — dark and light modes
- Muted — subdued UI elements
- Destructive — error and warning states

Nav colors (background, text, accent, border) are independently controllable from CMD → Platform Settings without a code change.

## Brand Assets in CMD
CMD → Brand provides admins with:
- Logo upload and management
- Color editor with a visual picker for all palette values
- Media library for all uploaded brand files

## About Page
The About page (/about) introduces SEVCO to visitors with:
- Company mission and story
- Team section (linked to staff directory)
- Venture highlights
- Brand asset downloads (where public)

## Brand Section on About
A dedicated Brand section on the About page surfaces downloadable brand assets (logos, color codes, usage guidelines) for partners and press.`
  },
  {
    title: "Hosting & Infrastructure",
    slug: "hosting-infrastructure",
    summary: "SEVCO hosting plans, the Hostinger API integration, VPS management, Minecraft hosting, and the hosting marketing page.",
    tags: ["hosting", "hostinger", "vps", "infrastructure", "minecraft"],
    content: `# Hosting & Infrastructure

## Overview
SEVCO offers hosting services to clients and the public, including web hosting, VPS, and specialized Minecraft server hosting. The hosting section of the platform is both a marketing surface and a management interface.

## Hosting Marketing Page
The public hosting landing page (/hosting) presents SEVCO's hosting plans with pricing tiers, feature comparisons, and CTAs. It uses a dark design with green/cyan accents consistent with the security and infrastructure aesthetic.

## Hostinger API Integration
The platform integrates with Hostinger's API to:
- List and manage hosted domains
- Check DNS record status
- Provision and manage VPS instances
- View server health metrics

API credentials are stored as environment secrets and accessed server-side only.

## VPS Management
Staff+ can view VPS instances from CMD → Hosting (or Domains). Each VPS entry shows:
- Hostname and IP
- Plan details and resource usage
- Status (running, stopped, suspended)

## Minecraft Hosting
SEVCO's Minecraft hosting offering has dedicated plan tiers. Server management (start/stop/restart) is available from the hosting dashboard for clients with active Minecraft plans.

## Security & Uptime
The hosting infrastructure uses enterprise-grade security practices. For the full security posture overview, see the [Security](/security) page.`
  },
  {
    title: "Domains Management",
    slug: "domains-management",
    summary: "The SEVCO Domains section: registering, managing, and linking domains to projects via the Hostinger API.",
    tags: ["domains", "dns", "hostinger", "management"],
    content: `# Domains Management

## Overview
The Domains section allows admins to manage all SEVCO-registered domain names, their DNS records, and their association with platform projects — all from within the Command Center.

## Domains in CMD
CMD → Domains (previously at /domains, now under CMD → Tools) provides:
- A list of all registered domains with registrar and expiry info
- DNS record status for each domain
- A "Linked Project" dropdown to associate domains with SEVCO ventures
- Integration with the Hostinger API for live DNS data

## Linked Projects
Each domain can be linked to a SEVCO project from the Linked Project dropdown. The dropdown populates from the ventures list and validates properly (no blank items). Linked projects appear on the project detail pages and in the ventures grid.

## Domain Registration Flow
Domain registration is handled through Hostinger. The CMD Domains view reflects Hostinger's data in real time via the API, showing current status, renewal dates, and nameserver configuration.

## Domains Page (Public)
A public-facing domains page was part of the original platform spec. It now lives under /tools or is linked from the Services section, directing prospective clients to SEVCO's domain services offering.`
  },
  {
    title: "Platform Search",
    slug: "platform-search",
    summary: "Platform-wide search across articles, posts, users, products, and music. X/xAI search enrichment for real-time results.",
    tags: ["search", "xai", "discovery", "index"],
    content: `# Platform Search

## Overview
The SEVCO Platform has a unified search experience that surfaces content from across all sections in one place. The search bar in the nav header triggers a full-page search at /search.

## What Gets Searched
- **Wiki Articles** — title, content, tags, summary
- **Social Feed Posts** — text content
- **Users** — username, display name, bio
- **Store Products** — name, description
- **Music Tracks & Albums** — title, artist, genre
- **Gallery Images** — title, description, tags

## X/xAI Enrichment
Search results are enriched with live X (Twitter) search data via the xAI API. The Search page shows a dedicated "X Results" column alongside platform results, giving users real-time public context alongside internal content.

## Search UX
The search page uses tabbed results sections so users can filter by content type. Each result card links directly to the relevant page. Loading states show skeleton placeholders while results stream in.

## Implementation
Server-side search uses PostgreSQL full-text search (to_tsvector + to_tsquery) for fast, relevance-ranked results. The xAI X Search call is made in parallel with the DB query so both results appear together without one waiting for the other.`
  },
  {
    title: "Chat, Email & Messaging",
    slug: "chat-email-messaging",
    summary: "The SEVCO Email Client, inbound email handling via Resend, member-to-member chat, channel messaging, and diagnostic tools.",
    tags: ["email", "chat", "messaging", "resend", "inbox"],
    content: `# Chat, Email & Messaging

## Overview
SEVCO has a unified messaging layer covering member-to-member chat, channel-based communication, and a full email client using Resend for sending and receiving email.

## Member Chat
The Members Chat section supports:
- Direct messages between members
- Channel-based group conversations (by team or topic)
- Message history with timestamps
- Online presence indicators

Chat routes are handled through the messaging section of the platform, with real-time updates using polling or WebSocket (depending on the session context).

## SEVCO Email Client
The platform includes a full email client (/messages) powered by Resend:
- Send emails from SEVCO company addresses
- Compose with To, CC, BCC, Subject, and body fields
- Rich text or plain text composition
- Attachment support via Supabase Storage links

## Inbound Email
Inbound email is handled through Resend's receiving API and Svix webhooks:
- Incoming emails to configured addresses are received via webhook
- Email body and attachments are parsed and stored
- The inbox shows threaded conversation views
- Svix webhook secret is decoded and verified for security

## Notification Emails
Transactional emails (invoice notifications, verification, support replies) are sent through Resend with SEVCO branding. Email templates are configured in the emailClient module.

## Diagnostics
CMD → Inbox includes an Email Diagnostics tool for testing:
- Inbound and outbound email delivery
- Mailbox address configuration
- Svix webhook secret verification

## Dark Mode
Email body text is properly styled for dark mode — white text on dark backgrounds, no invisible-on-dark text issues.`
  },
  {
    title: "AI Agents",
    slug: "ai-agents",
    summary: "SEVCO AI Agents: agent personas, model selection (Claude, Grok, OpenRouter), Grok Imagine, xAI Responses API, and the Paperclip integration.",
    tags: ["ai", "agents", "grok", "claude", "openrouter", "llm"],
    content: `# AI Agents

## Overview
SEVCO AI Agents (/ai or /agents) gives members access to conversational AI through a modern chat interface. Multiple AI agent personas can be configured, each with their own model, system prompt, and capabilities.

## Supported Models
The platform routes to multiple AI providers via OpenRouter:
- **xAI Grok** — Grok-3, Grok-3 Mini, Grok-2 (via xAI direct API and OpenRouter)
- **Anthropic Claude** — Claude 3.5 Sonnet, Haiku, Opus
- **OpenRouter models** — access to hundreds of third-party models

Broken or unavailable xAI direct models have been removed. The model list is cleaned and verified before each release.

## Grok Imagine
The AI Agent interface supports Grok's Imagine function for AI image generation. Error handling displays friendly messages when image generation fails, and generated images render inline in the chat.

## xAI Responses API
The platform uses the xAI Responses API for streaming Grok completions. News feed AI summaries and trending topics also use Grok via the Responses API endpoint.

## Agent Management (CMD)
From CMD → AI Agents, admins can:
- Create and configure agent personas (name, avatar, model, system prompt)
- Test agents before making them public
- View conversation history

## Paperclip Dashboard
CMD → AI Agents embeds the Paperclip dashboard, giving teams an interface to monitor agent usage, review conversations, and manage agent configuration in a purpose-built interface.

## Chat Interface
The AI chat interface features:
- Streaming responses with typing indicator
- Markdown rendering (code blocks, tables, lists) in responses
- Model selector in the chat header
- Conversation history saved per session`
  },
  {
    title: "News & Discovery",
    slug: "news-discovery",
    summary: "The SEVCO News page: RSS aggregation, AI-powered summaries via Grok, X trending topics, and Wikify integration.",
    tags: ["news", "rss", "grok", "ai", "trending", "discovery"],
    content: `# News & Discovery

## Overview
The News section aggregates, curates, and enriches news relevant to SEVCO and its ventures. It uses free RSS feeds, AI-powered summaries from Grok, and live X trending data to give members a rich, context-aware news feed.

## RSS Aggregator
The platform pulls from a curated list of RSS feeds covering tech, business, music, and industry news. Feed results are cached in the database to avoid repeated fetching and to survive rate limits. Cache refresh runs on a schedule.

## AI Summaries (Grok)
Each news item can have a Grok-powered AI summary generated on demand or automatically. The summary gives a 2–3 sentence TL;DR without the user having to read the full article. Summaries are stored alongside the cached feed item.

## Wikify
The "Wikify" action on a news item uses Grok to generate a wiki-style article from the news story and creates a draft article in the wiki for staff review. Enhanced Wikify includes richer context and better article structure.

## X Trending
The News page surfaces trending topics from X via the xAI X Search API, showing what's trending publicly alongside the curated news feed.

## Grok-Powered News Page
The entire News page uses Grok for intelligent content ranking, duplicate detection, and topic clustering. Articles from multiple RSS sources about the same story are grouped together.

## Feed Quality
Feed quality improvements include:
- Filtering low-quality or duplicate entries
- Fixing broken RSS handles and 400 search errors
- Layout and card design improvements for readability`
  },
  {
    title: "Finance & Billing",
    slug: "finance-billing",
    summary: "The CMD Finance tab: invoices, subscriptions, billing management, and Stripe integration for client billing.",
    tags: ["finance", "billing", "invoices", "stripe", "subscriptions"],
    content: `# Finance & Billing

## Overview
The Finance section of the Command Center gives admins and executives a view of SEVCO's billing operations — client invoices, subscriptions, and revenue data — all connected through Stripe.

## Invoices
The CMD → Finance → Invoices tab shows all client invoices with:
- Invoice number, amount, and currency
- Status (draft, open, paid, void)
- Client name and email
- Issue date and due date
- PDF download link

Invoices are created and managed in Stripe. Invoice email notifications are sent through Resend with the SEVCO email client.

## Subscriptions
The Subscriptions tab shows active recurring billing relationships:
- Plan name and price
- Current period start/end
- Status (active, past due, canceled, trialing)
- Customer contact

## Revenue Overview
A dashboard card shows aggregate revenue metrics:
- Monthly Recurring Revenue (MRR)
- Total collected revenue
- Outstanding balance

## Stripe Integration
All billing data is pulled live from the Stripe API. Admins need Stripe access to manage underlying plans and products. SEVCO uses Stripe for:
- One-time store purchases
- Subscription billing
- Sparks pack purchases
- Client invoice management

## Access Control
The Finance tab is restricted to admin and executive roles.`
  },
  {
    title: "Platform Updates & Changelog",
    slug: "platform-updates-changelog",
    summary: "The /platform updates page, version system, changelog, update log, and how completed tasks automatically update the wiki.",
    tags: ["changelog", "updates", "versioning", "platform", "history"],
    content: `# Platform Updates & Changelog

## Overview
The /platform page is the SEVCO Platform's public changelog — a rolling history of everything that has been built, fixed, and improved. It gives staff, partners, and members full transparency into platform development.

## Version System
The platform uses semantic versioning tracked in a version file. The current version appears in the platform footer and at the top of the /platform page. Version numbers increment automatically with each significant task completion.

## The /platform Page
The updates page shows:
- A timeline of platform milestones
- Update cards for completed tasks (title, date, summary)
- Grouped by feature area or time period
- Links to the relevant wiki articles for deep dives

## Update Log
The update log is an append-only record of every completed task, automatically updated by the post-merge script. Each entry includes the task number, title, summary, and completion date.

## Auto-Update System (Post-Merge)
When a task agent merges work into the platform, the post-merge script runs automatically and:
1. Identifies the feature area of the completed task
2. Appends a new update section to the relevant feature wiki article in SEVCO Platform
3. Appends the task to the platform update log
4. Increments the version number

This means the wiki always reflects the current state of the platform without manual documentation effort.

## Changelog
The Changelog in CMD → Platform shows the same data as /platform but in a more structured admin view with filtering by feature area, date, and version.`
  }
];

async function main() {
  console.log(`Inserting ${articles.length} feature articles...`);
  
  for (const article of articles) {
    const tagsArray = `ARRAY[${article.tags.map(t => `'${t}'`).join(', ')}]`;
    const safeTitle = article.title.replace(/'/g, "''");
    const safeSummary = article.summary.replace(/'/g, "''");
    const safeContent = article.content.replace(/'/g, "''");
    
    try {
      const result = await pool.query(
        `INSERT INTO articles (title, slug, content, summary, category_id, status, tags, author_id)
         VALUES ($1, $2, $3, $4, $5, 'published', ${tagsArray}, $6)
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           summary = EXCLUDED.summary,
           updated_at = now()
         RETURNING id, slug`,
        [article.title, article.slug, article.content, article.summary, CATEGORY_ID, AUTHOR_ID]
      );
      console.log(`✓ ${result.rows[0].id}: ${result.rows[0].slug}`);
    } catch (err) {
      console.error(`✗ ${article.slug}: ${err.message}`);
    }
  }
  
  // Final count
  const countResult = await pool.query(
    `SELECT c.name, COUNT(*) as count FROM articles a JOIN categories c ON a.category_id = c.id GROUP BY c.name ORDER BY count DESC`
  );
  console.log('\nFinal article counts:');
  countResult.rows.forEach(r => console.log(`  ${r.name}: ${r.count}`));
  
  await pool.end();
}

main().catch(console.error);
