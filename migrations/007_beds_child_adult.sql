-- Add child/adult free-bed counters to bed availability
ALTER TABLE bed_availability_log ADD COLUMN child_free INTEGER DEFAULT 0;
ALTER TABLE bed_availability_log ADD COLUMN adult_free INTEGER DEFAULT 0;
