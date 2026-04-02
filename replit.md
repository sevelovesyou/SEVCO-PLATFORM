# SEVCO Platform

## Overview
The SEVCO Platform is a multi-application system designed for sevco.us, encompassing SEVE and SEVCO Records. It acts as a unified shell for various applications including a Wiki (knowledge base), Music (SEVCO RECORDS), Store, Projects (SEVCO Ventures), and a role-based Dashboard. The platform provides a consistent global navigation while allowing individual applications to have distinct layouts and sidebars. Its vision is to be a comprehensive digital ecosystem for community, commerce, and content related to SEVCO.

## User Preferences
I want iterative development. I prefer detailed explanations. Ask before making major changes. Do not make changes to the folder `client/src/pages/dashboard-page.tsx`.

## System Architecture
The platform is built with a modern web stack:
- **Frontend**: React, Vite, TailwindCSS, Shadcn UI, Wouter for routing, and TanStack Query for data fetching.
- **Backend**: An Express.js REST API.
- **Database**: PostgreSQL paired with Drizzle ORM.
- **UI/UX**: Features a clean, encyclopedic design supporting both dark and light modes.
- **Authentication**: Session-based login/registration using `passport.js` with `bcrypt` for password hashing and `express-session` storing sessions in PostgreSQL. It includes email verification via Resend and OAuth 2.0 integration for X (Twitter) accounts. Role-Based Access Control (RBAC) is implemented with a hierarchical role system (admin > executive > staff > partner > client > user) governing feature access and permissions.
- **Content Management**:
    - **Articles**: Structured content with markdown-like formatting, supporting infoboxes (artist, song, album, merchandise, event, general) and semantic crosslinks generated via keyword extraction.
    - **Citation Validation**: Automatic validation of URLs and citation formats (APA/MLA/Chicago).
    - **Version Review Workflow**: Edits create pending revisions requiring admin approval.
- **E-commerce**: Integrated Stripe for product management, checkout processes, and order tracking. Products can be managed via the admin dashboard, automatically syncing with Stripe.
- **Media Storage**: Utilizes Supabase Storage for managing various media assets (avatars, banners, tracks, gallery, brand assets) with distinct public/private buckets and size limits.
- **AI Integration**: Features an AI-powered News page leveraging Grok AI for content summarization, image generation, search, and briefing.
- **Analytics**: Google Analytics 4 integration with server-side data API for detailed traffic analysis presented in the Command Center.
- **Email System**: A threaded email conversation view with CRUD capabilities for personal notes.
- **Hostinger Integration**: Manages VPS hosting, domains, and WHOIS lookups through the Hostinger API.
- **Social Features**: Public user profiles, a social feed, and dynamic social links management.
- **Platform Modules**:
    - **Wiki**: Comprehensive knowledge base with article viewing, editing, search, category organization, and a review queue for pending revisions.
    - **Music (SEVCO RECORDS)**: Hub for music content, including catalog browsing, music submissions, curated playlists, and artist/album details.
    - **Store**: E-commerce functionality for products with a shopping cart, checkout, and order management.
    - **Projects (SEVCO Ventures)**: Section dedicated to projects.
    - **Command Center**: An admin dashboard providing role-based management for users, store products, music submissions, playlists, jobs, social links, hosting, media, and finance.
    - **News**: An AI-enhanced news feed with trending topics, breaking news, article bookmarking, and personalized preferences.
    - **Jobs**: A job board with application forms and administrative management.
    - **Notes**: Personal note-taking application with search, pinning, and color-coding.

## External Dependencies
- **Stripe**: Payment processing and e-commerce functionalities.
- **Resend**: Email delivery for user verification and contact forms.
- **Passport.js**: Authentication middleware.
- **Bcrypt.js**: Password hashing.
- **PostgreSQL**: Primary database.
- **Drizzle ORM**: Object-relational mapping.
- **TailwindCSS**: Utility-first CSS framework.
- **Shadcn UI**: UI component library.
- **TanStack Query**: Data fetching and caching.
- **Wouter**: Client-side routing.
- **Supabase Storage**: Cloud storage for media assets.
- **Google Analytics 4**: Web analytics and reporting.
- **Hostinger API**: Domain and hosting management.
- **Grok AI**: AI capabilities for news content generation and summarization.
- **X (Twitter) OAuth 2.0**: Social login integration.