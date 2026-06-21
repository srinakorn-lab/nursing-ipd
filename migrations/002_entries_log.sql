-- Append-only audit log for every save
-- Dashboard still reads from monthly_entries/daily_entries (current state)
-- Reports read from entries_log (full history)
CREATE TABLE IF NOT EXISTS entries_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  day         INTEGER,            -- NULL for monthly entries, day-of-month for daily
  ward_id     TEXT NOT NULL,
  shift       TEXT NOT NULL,      -- 'day' | 'night'
  lv1 INTEGER DEFAULT 0, lv2 INTEGER DEFAULT 0, lv3 INTEGER DEFAULT 0,
  lv4 INTEGER DEFAULT 0, lv5 INTEGER DEFAULT 0,
  adm INTEGER DEFAULT 0, trf INTEGER DEFAULT 0, ods INTEGER DEFAULT 0,
  rn  INTEGER DEFAULT 0, pn  INTEGER DEFAULT 0, na  INTEGER DEFAULT 0,
  device_id   TEXT,
  saved_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_log_period_day  ON entries_log(year, month, day);
CREATE INDEX IF NOT EXISTS idx_log_period_ward ON entries_log(year, month, ward_id);
CREATE INDEX IF NOT EXISTS idx_log_year        ON entries_log(year);
