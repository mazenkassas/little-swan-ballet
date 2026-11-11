-- ============================================================
-- Leotard orders (replaces the monthly "مايوهات" Google Sheet)
-- Run this in the Supabase SQL Editor.
-- Safe to run more than once, and safe to run whether or not
-- the first version of this file was already applied.
-- ============================================================

CREATE TABLE IF NOT EXISTS leotard_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   TEXT NOT NULL DEFAULT '',
  student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
  sheet_month     TEXT,                       -- 'YYYY-MM' — the monthly sheet the row belongs to
  branch          TEXT,
  order_date      DATE,
  day_of_week     TEXT,                       -- sat | sun | mon | tue | wed | thu | fri
  group_name      TEXT,
  size            TEXT,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  pay_status      TEXT,                       -- paid | remaining
  cash            BOOLEAN NOT NULL DEFAULT FALSE,
  instapay        BOOLEAN NOT NULL DEFAULT FALSE,
  payment_method  TEXT,                       -- legacy, no longer used
  tailor_status   TEXT,                       -- received | pending
  delivery_status TEXT,                       -- delivered | pending
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade a table created by the first version of this file
ALTER TABLE leotard_orders ADD COLUMN IF NOT EXISTS sheet_month TEXT;
ALTER TABLE leotard_orders ADD COLUMN IF NOT EXISTS pay_status  TEXT;
ALTER TABLE leotard_orders ADD COLUMN IF NOT EXISTS cash        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leotard_orders ADD COLUMN IF NOT EXISTS instapay    BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE leotard_orders ALTER COLUMN customer_name   SET DEFAULT '';
ALTER TABLE leotard_orders ALTER COLUMN tailor_status   DROP NOT NULL;
ALTER TABLE leotard_orders ALTER COLUMN tailor_status   DROP DEFAULT;
ALTER TABLE leotard_orders ALTER COLUMN delivery_status DROP NOT NULL;
ALTER TABLE leotard_orders ALTER COLUMN delivery_status DROP DEFAULT;

-- Carry over any rows saved with the first version
UPDATE leotard_orders SET
  sheet_month = to_char(COALESCE(order_date, created_at::date), 'YYYY-MM'),
  cash        = COALESCE(payment_method = 'cash', FALSE),
  instapay    = COALESCE(payment_method = 'instapay', FALSE),
  pay_status  = CASE
                  WHEN total_amount > 0 AND paid_amount >= total_amount THEN 'paid'
                  WHEN total_amount > paid_amount THEN 'remaining'
                END,
  branch      = CASE WHEN branch = 'ميامي' THEN 'miami' ELSE branch END
WHERE sheet_month IS NULL;

CREATE INDEX IF NOT EXISTS leotard_orders_sheet_month_idx ON leotard_orders (sheet_month);

ALTER TABLE leotard_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated" ON leotard_orders;
CREATE POLICY "Allow authenticated" ON leotard_orders
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
