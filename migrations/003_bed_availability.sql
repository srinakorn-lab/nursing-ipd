-- Bed availability log (append-only)
-- Latest record per ward = current state
CREATE TABLE IF NOT EXISTS bed_availability_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ward_id         TEXT NOT NULL,
  single_free     INTEGER DEFAULT 0,  -- ห้องว่างเดี่ยว
  male_free       INTEGER DEFAULT 0,  -- รวมชายว่าง
  female_free     INTEGER DEFAULT 0,  -- รวมหญิงว่าง
  monitor_male    INTEGER DEFAULT 0,  -- monitor รวมชาย
  monitor_female  INTEGER DEFAULT 0,  -- monitor รวมหญิง
  remark          TEXT DEFAULT '',
  device_id       TEXT,
  saved_at        TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_beds_ward ON bed_availability_log(ward_id, saved_at);
