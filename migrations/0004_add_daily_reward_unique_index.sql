-- Daily Spark reward — once-per-UTC-day enforcement.
-- A partial unique index on (user_id, metadata->>'claimDate') restricted
-- to type='daily_reward' guarantees that concurrent / repeated POSTs to
-- /api/me/rewards/daily/claim cannot double-credit the same calendar day.
-- Mirrors the Drizzle definition in shared/schema.ts.

CREATE UNIQUE INDEX IF NOT EXISTS spark_txn_daily_reward_idx
  ON spark_transactions (user_id, ((metadata ->> 'claimDate')))
  WHERE type = 'daily_reward';
