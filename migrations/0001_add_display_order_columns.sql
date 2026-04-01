-- Migration: Add display_order column to tables missing it
-- Task #182: Fix "column display_order does not exist" on projects table
-- Applied: 2026-04-01
-- These are idempotent ADD COLUMN IF NOT EXISTS statements — safe to re-run

ALTER TABLE projects ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
ALTER TABLE platform_social_links ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE brand_assets ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE gallery_images ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE spotify_artists ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
ALTER TABLE minecraft_servers ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE news_categories ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
