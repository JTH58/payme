-- Migration number: 0001 
-- Description: Create raw analytics table

CREATE TABLE IF NOT EXISTS raw_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    user_info TEXT, -- JSON string containing UA, Country, Referer, etc.
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_path ON raw_analytics(path);
CREATE INDEX IF NOT EXISTS idx_created_at ON raw_analytics(created_at);
