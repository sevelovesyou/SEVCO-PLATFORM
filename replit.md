# SEVCO Wiki - Encyclopedic Platform

## Overview
An encyclopedic wiki platform for sevelovesyou.com (SEVE / SEVCO Records). Features structured infoboxes, citation validation, auto-generated semantic crosslinks, and a version review workflow with flagged revisions and approvals.

## Architecture
- **Frontend**: React + Vite + TailwindCSS + Shadcn UI + Wouter routing + TanStack Query
- **Backend**: Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM
- **Theme**: Clean encyclopedic design with dark/light mode support

## Key Features
1. **Articles** with structured content and markdown-like formatting
2. **Infoboxes** - type-based (artist, song, album, merchandise, event, general) with key-value fields
3. **Citation Validator** - validates URLs (HEAD request + fallback GET) and citation format (APA/MLA/Chicago)
4. **Semantic Crosslinks** - auto-generated using keyword extraction and frequency analysis
5. **Version Review Workflow** - edits create pending revisions; admin approves/rejects before publishing
6. **Search** with server-side filtering by query, category, and status
7. **Categories** for organizing articles

## Project Structure
```
shared/schema.ts       - Drizzle schema (articles, revisions, citations, crosslinks, categories)
server/db.ts           - Database connection
server/storage.ts      - DatabaseStorage implementing IStorage interface
server/routes.ts       - REST API routes + crosslink generation + citation validation
server/seed.ts         - Seed data with real SEVE content
client/src/App.tsx     - Main app with sidebar layout
client/src/pages/      - Home, ArticleView, ArticleEditor, Search, ReviewQueue, CategoryView
client/src/components/ - WikiInfobox, CitationBadge, CrosslinkPanel, RevisionTimeline, AppSidebar
```

## Recent Changes
- 2026-02-19: Initial MVP with full wiki functionality, seed data, and review workflow
