-- Rebuild beds_map with TEXT bed codes (e.g. '501A', '6B01/3', 'ICU 1')
DROP TABLE IF EXISTS beds_map;
DROP TABLE IF EXISTS beds_map_log;

CREATE TABLE beds_map (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ward_id      TEXT NOT NULL,
  bed_no       TEXT NOT NULL,           -- room/bed code: '501A', '6B01/1', '3'
  status       TEXT DEFAULT 'empty',    -- 'empty' | 'occupied' | 'cleaning'
  hn           TEXT,
  name         TEXT,
  sex          TEXT,                    -- 'M' | 'F'
  level        INTEGER,                 -- 1..5
  admitted_at  TEXT,
  remark       TEXT,
  updated_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(ward_id, bed_no)
);
CREATE INDEX idx_bedsmap_ward ON beds_map(ward_id);

CREATE TABLE beds_map_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ward_id         TEXT NOT NULL,
  bed_no          TEXT NOT NULL,
  action          TEXT NOT NULL,
  status          TEXT,
  hn              TEXT, name TEXT, sex TEXT, level INTEGER,
  moved_from_ward TEXT,
  moved_from_bed  TEXT,
  device_id       TEXT,
  saved_at        TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_bedsmap_log_ward ON beds_map_log(ward_id, saved_at);
