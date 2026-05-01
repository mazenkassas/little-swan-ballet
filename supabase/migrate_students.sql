-- Add all missing columns to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS parent_name             TEXT,
  ADD COLUMN IF NOT EXISTS grade_id                UUID REFERENCES grades(id),
  ADD COLUMN IF NOT EXISTS term_id                 UUID REFERENCES terms(id),
  ADD COLUMN IF NOT EXISTS monthly_fees            INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discounted_monthly_fees INTEGER,
  ADD COLUMN IF NOT EXISTS discount_end_date       DATE;
