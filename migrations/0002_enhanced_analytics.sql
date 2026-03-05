-- Migration number: 0002
-- Description: Enhanced analytics columns + client-side events table

-- raw_analytics extension (backward-compatible, all nullable)
ALTER TABLE raw_analytics ADD COLUMN visitor_id TEXT;
ALTER TABLE raw_analytics ADD COLUMN device_type TEXT;
ALTER TABLE raw_analytics ADD COLUMN browser TEXT;
ALTER TABLE raw_analytics ADD COLUMN referer_domain TEXT;

CREATE INDEX IF NOT EXISTS idx_visitor_id ON raw_analytics(visitor_id);

-- Client-side events (Cookie Piggyback writes)
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT,
    event TEXT NOT NULL,
    data TEXT,
    event_ts INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
