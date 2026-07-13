-- Add patient clinical fields to bed map
ALTER TABLE beds_map ADD COLUMN pay_right TEXT;   -- สิทธิการรักษา
ALTER TABLE beds_map ADD COLUMN specialty TEXT;   -- สาขา/แผนกเจ้าของไข้
ALTER TABLE beds_map ADD COLUMN diagnosis TEXT;   -- การวินิจฉัย

ALTER TABLE beds_map_log ADD COLUMN pay_right TEXT;
ALTER TABLE beds_map_log ADD COLUMN specialty TEXT;
ALTER TABLE beds_map_log ADD COLUMN diagnosis TEXT;
