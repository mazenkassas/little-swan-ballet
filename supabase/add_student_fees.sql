-- Add monthly fees fields to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS monthly_fees INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discounted_monthly_fees INTEGER,
  ADD COLUMN IF NOT EXISTS discount_end_date DATE;
