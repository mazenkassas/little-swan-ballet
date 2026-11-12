-- New payment type: placement / level test (تحديد مستوى).
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('subscription', 'product', 'event', 'private', 'exam', 'enrollment', 'level_test'));
