-- One-time backfill: create a payment for every private session that was saved
-- without one, so its fee shows in daily revenue, payments, reports and the dashboard.
-- Safe to run more than once (only touches sessions with payment_id IS NULL).

DO $$
DECLARE
  ps  RECORD;
  pid UUID;
BEGIN
  FOR ps IN
    SELECT id, student_id, fee, date, notes,
           CASE WHEN payment_method = 'instapay' THEN 'instapay' ELSE 'cash' END AS method
    FROM private_sessions
    WHERE payment_id IS NULL
  LOOP
    INSERT INTO payments (student_id, type, amount_due, amount_paid, payment_method, date, notes)
    VALUES (ps.student_id, 'private', ps.fee, ps.fee, ps.method, ps.date, ps.notes)
    RETURNING id INTO pid;

    UPDATE private_sessions SET payment_id = pid WHERE id = ps.id;
  END LOOP;
END $$;
