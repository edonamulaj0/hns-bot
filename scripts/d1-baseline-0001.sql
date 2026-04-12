-- Baseline: your remote D1 already has User / Submission / Blog from an earlier setup,
-- but Wrangler has no row in d1_migrations, so `migrations apply` tries 0001_init.sql and fails
-- with "table User already exists".
--
-- Run (from repo root):
--   npx wrangler d1 execute hns-bot-db --remote --file=scripts/d1-baseline-0001.sql
--
-- Then:
--   npx wrangler d1 migrations apply hns-bot-db --remote
--
-- If a later migration errors (e.g. duplicate column / table already exists), your DB partially
-- matched that file already: insert that migration name the same way, then re-run apply.
--   npx wrangler d1 execute hns-bot-db --remote --command "INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0002_pulse_votes.sql');"

CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0001_init.sql');
