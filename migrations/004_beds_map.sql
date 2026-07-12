-- Per-bed status (cinema seat style)
-- 1 row per (ward, bed_no) — current state
CREATE TABLE IF NOT EXISTS beds_map (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ward_id      TEXT NOT NULL,
  bed_no       INTEGER NOT NULL,
  status       TEXT DEFAULT 'empty',    -- 'empty' | 'occupied' | 'cleaning'
  hn           TEXT,
  name         TEXT,
  sex          TEXT,                    -- 'M' | 'F'
  level        INTEGER,                 -- 1..5
  admitted_at  TEXT,                    -- ISO date
  remark       TEXT,
  updated_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(ward_id, bed_no)
);
CREATE INDEX IF NOT EXISTS idx_bedsmap_ward ON beds_map(ward_id);

-- Audit log
CREATE TABLE IF NOT EXISTS beds_map_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ward_id         TEXT NOT NULL,
  bed_no          INTEGER NOT NULL,
  action          TEXT NOT NULL,        -- 'assign' | 'discharge' | 'move' | 'clean_done' | 'update'
  status          TEXT,
  hn              TEXT, name TEXT, sex TEXT, level INTEGER,
  moved_from_ward TEXT,
  moved_from_bed  INTEGER,
  device_id       TEXT,
  saved_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bedsmap_log_ward ON beds_map_log(ward_id, saved_at);
