# SEVCO Platform

## Overview
The SEVCO Platform is a multi-application system designed for sevco.us, integrating a Wiki for knowledge, SEVCO RECORDS for music, a Store, SEVCO Ventures for projects, and a role-based Dashboard. Its primary goal is to provide a comprehensive, interconnected digital ecosystem for various SEVCO initiatives, featuring a persistent global navigation while allowing individual applications flexible layouts. The platform aims to centralize content, e-commerce, and community engagement for SEVCO's diverse operations.

## User Preferences
I want iterative development.
Ask before making major changes.
Do not make changes to the folder `shared/`
Do not make changes to the file `server/db.ts`

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
    - **Supabase Storage**: Utilized for file uploads (avatars, banners, music tracks, gallery, brand assets) with public and private buckets, leveraging signed URLs for private assets.
    - **Analytics**: Google Analytics 4 integration via GA4 Data API for admin dashboards, including session data, top pages, traffic sources, and device information.
    - **Dynamic Content**: AI-powered news features (summarization, image generation), trending hashtags, and personalized news feeds with bookmarking and preference management.
    - **Email System**: Threaded email conversation view with inbox, starred, and send functionalities.

## External Dependencies
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js, bcryptjs, express-session, connect-pg-simple, passport-oauth2
- **Email Service**: Resend (via Replit connector)
- **Payment Gateway**: Stripe (via Replit integration)
- **Cloud Storage**: Supabase Storage
- **Analytics**: Google Analytics 4 (via `@google-analytics/data` package)
- **AI Services**: Grok AI (for news summarization, image generation, etc.)
- **Hosting Management**: Hostinger API (for VPS, domains, catalog, WHOIS)
- **Frontend Libraries**: React, Vite, TailwindCSS, Shadcn UI, Wouter, TanStack Query
