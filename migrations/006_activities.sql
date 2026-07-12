-- Workload activities (หัตถการ) — JSON per entry, record/report only
ALTER TABLE daily_entries   ADD COLUMN activities TEXT;
ALTER TABLE monthly_entries ADD COLUMN activities TEXT;
ALTER TABLE entries_log     ADD COLUMN activities TEXT;
