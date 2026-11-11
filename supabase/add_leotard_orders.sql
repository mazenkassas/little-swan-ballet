-- ============================================================
-- Leotard orders (replaces the monthly "مايوهات" Google Sheet)
-- Run this once in the Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS leotard_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   TEXT NOT NULL,
  student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
  branch          TEXT,
  order_date      DATE,
  day_of_week     TEXT CHECK (day_of_week IN ('sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri')),
  group_name      TEXT,
  size            TEXT,
  total_amount    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  payment_method  TEXT CHECK (payment_method IN ('cash', 'instapay')),
  tailor_status   TEXT NOT NULL DEFAULT 'pending' CHECK (tailor_status IN ('pending', 'received')),
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leotard_orders_order_date_idx ON leotard_orders (order_date);

ALTER TABLE leotard_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated" ON leotard_orders;
CREATE POLICY "Allow authenticated" ON leotard_orders
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
