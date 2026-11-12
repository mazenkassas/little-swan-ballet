-- Applied to production 2026-11-12 (migration enable_realtime_dashboard_tables).
-- Broadcast row changes so open dashboards refresh live (Supabase Realtime).
-- Realtime still applies each table's RLS, so only users allowed to read a row receive it.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'attendance','class_students','classes','coach_attendance','coach_manual_sessions','coaches',
    'daily_attendance_import','daily_payment_import','event_enrollments','events','exams','expenses',
    'freezes','grades','halls','holidays','leotard_orders','levels','payment_methods','payments',
    'private_sessions','product_orders','products','role_permissions','sessions','staff',
    'staff_attendance','student_exams','student_transfers','students','subscription_plans',
    'subscriptions','system_settings','terms'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- Lets the client see the previous row, so heartbeat-only updates (last_seen) can be ignored.
ALTER TABLE public.staff_attendance REPLICA IDENTITY FULL;
