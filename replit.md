# SEVCO Wiki - Encyclopedic Platform

## Overview
An encyclopedic wiki platform for sevelovesyou.com (SEVE / SEVCO Records). Features structured infoboxes, citation validation, auto-generated semantic crosslinks, and a version review workflow with flagged revisions and approvals.

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
- API routes: POST /api/register, POST /api/login, POST /api/logout, GET /api/user

## Project Structure
```
shared/schema.ts              - Drizzle schema (users, articles, revisions, citations, crosslinks, categories)
server/db.ts                  - Database connection (exports pool and db)
server/auth.ts                - Passport setup, session config, auth routes
server/storage.ts             - DatabaseStorage implementing IStorage interface
server/routes.ts              - REST API routes + crosslink generation + citation validation
server/seed.ts                - Seed data with real SEVE content
client/src/App.tsx            - Main app with auth-aware shell and sidebar layout
client/src/hooks/use-auth.tsx - Auth context provider and useAuth hook
client/src/pages/auth-page.tsx         - Login/register page
client/src/components/protected-route.tsx - Route guard component
client/src/pages/             - Home, ArticleView, ArticleEditor, Search, ReviewQueue, CategoryView
client/src/components/        - WikiInfobox, CitationBadge, CrosslinkPanel, RevisionTimeline, AppSidebar
```

## Recent Changes
- 2026-02-19: Initial MVP with full wiki functionality, seed data, and review workflow
- 2026-03-24: Added authenticated user login with passport.js, bcrypt, and pg-stored sessions
