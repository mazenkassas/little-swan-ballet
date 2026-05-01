-- Add term_id to students table
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id);
