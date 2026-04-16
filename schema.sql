-- 行銷資料庫 · Cloudflare D1 Schema
-- 執行方式：npx wrangler d1 execute marketing-db --file=schema.sql --remote

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  is_admin   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_lists (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  company_id   INTEGER NOT NULL,
  company_name TEXT    NOT NULL DEFAULT '',
  added_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  note         TEXT,
  UNIQUE (user_id, company_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_lists_user ON user_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lists_company ON user_lists(company_id);
