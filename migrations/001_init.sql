CREATE TABLE IF NOT EXISTS monthly_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  ward_id     TEXT NOT NULL,
  shift       TEXT NOT NULL,
  lv1 INTEGER DEFAULT 0, lv2 INTEGER DEFAULT 0, lv3 INTEGER DEFAULT 0,
  lv4 INTEGER DEFAULT 0, lv5 INTEGER DEFAULT 0, adm INTEGER DEFAULT 0,
  trf INTEGER DEFAULT 0, ods INTEGER DEFAULT 0,
  rn INTEGER DEFAULT 0, pn INTEGER DEFAULT 0, na INTEGER DEFAULT 0,
  updated_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(year, month, ward_id, shift)
);

CREATE TABLE IF NOT EXISTS daily_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  day         INTEGER NOT NULL,
  ward_id     TEXT NOT NULL,
  shift       TEXT NOT NULL,
  lv1 INTEGER DEFAULT 0, lv2 INTEGER DEFAULT 0, lv3 INTEGER DEFAULT 0,
  lv4 INTEGER DEFAULT 0, lv5 INTEGER DEFAULT 0, adm INTEGER DEFAULT 0,
  trf INTEGER DEFAULT 0, ods INTEGER DEFAULT 0,
  rn INTEGER DEFAULT 0, pn INTEGER DEFAULT 0, na INTEGER DEFAULT 0,
  updated_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(year, month, day, ward_id, shift)
);

CREATE TABLE IF NOT EXISTS oos (
  ward_id    TEXT PRIMARY KEY,
  count      INTEGER DEFAULT 0,
  remark     TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
