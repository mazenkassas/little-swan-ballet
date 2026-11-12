-- Payment types: add Leotard (مايو), Bolero (بولورو) and Special Committee (لجنة خاصة).
-- 'product' stays allowed so older payments keep working; it is just no longer offered on the Daily page.
-- Existing payments are unchanged. Safe to re-run.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_type_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('subscription', 'product', 'event', 'private', 'exam', 'enrollment', 'level_test',
                  'leotard', 'bolero', 'special_committee'));
