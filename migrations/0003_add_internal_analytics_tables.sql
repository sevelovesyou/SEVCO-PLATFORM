-- Internal per-page analytics tables (replaces GA4).
-- These were defined in shared/schema.ts but never reached the live DB,
-- which caused the Command Center Analytics summary to fail at runtime
-- because visitor_hash / session_hash columns did not exist.

CREATE TABLE IF NOT EXISTS pageviews (
  id BIGSERIAL PRIMARY KEY,
  path VARCHAR(512) NOT NULL,
  referrer_host VARCHAR(255),
  visitor_hash VARCHAR(64) NOT NULL,
  session_hash VARCHAR(64) NOT NULL,
  country VARCHAR(2),
  device VARCHAR(16) NOT NULL,
  is_bot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pageviews_created_at_idx ON pageviews(created_at);
CREATE INDEX IF NOT EXISTS pageviews_path_created_idx ON pageviews(path, created_at);
CREATE INDEX IF NOT EXISTS pageviews_visitor_created_idx ON pageviews(visitor_hash, created_at);
CREATE INDEX IF NOT EXISTS pageviews_referrer_created_idx ON pageviews(referrer_host, created_at);

CREATE TABLE IF NOT EXISTS analytics_salts (
  day DATE PRIMARY KEY,
  salt VARCHAR(64) NOT NULL
);
