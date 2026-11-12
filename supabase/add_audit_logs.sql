-- ─────────────────────────────────────────────────────────────────────────────
-- Audit logs: every INSERT / UPDATE / DELETE on every table in `public` is
-- recorded with who did it, when, and the before/after row data.
-- Read-only, and visible to super admins only (Dashboard → Logs).
--
-- Safe to re-run. Tables created later are NOT covered automatically:
-- re-run the "Attach the trigger" block after adding a new table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id       UUID,          -- auth.users id (NULL = system / service key / SQL editor)
  actor_email    TEXT,
  action         TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name     TEXT NOT NULL,
  record_id      TEXT,
  old_data       JSONB,
  new_data       JSONB,
  changed_fields TEXT[]
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_table_idx      ON public.audit_logs (table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx      ON public.audit_logs (actor_email, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_record_idx     ON public.audit_logs (record_id);

-- ── Who may read: active super admins only ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
      AND s.role = 'super_admin'
      AND s.is_active IS NOT FALSE
  );
$$;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins read audit logs" ON public.audit_logs;
CREATE POLICY "Super admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Nobody writes to the log directly; only the trigger below (SECURITY DEFINER) does.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon, authenticated;

-- ── Trigger function ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old     JSONB;
  v_new     JSONB;
  v_changed TEXT[];
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN v_new := to_jsonb(NEW); END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key ORDER BY n.key) INTO v_changed
    FROM jsonb_each(v_new) n
    WHERE n.value IS DISTINCT FROM (v_old -> n.key)
      AND n.key NOT IN ('updated_at');
    -- Nothing meaningful changed → don't log.
    IF v_changed IS NULL THEN RETURN NULL; END IF;
  END IF;

  INSERT INTO public.audit_logs
    (actor_id, actor_email, action, table_name, record_id, old_data, new_data, changed_fields)
  VALUES (
    auth.uid(),
    auth.jwt() ->> 'email',
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key'),
    v_old,
    v_new,
    v_changed
  );
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Logging must never block a real change in the app.
  RAISE WARNING 'audit_log_changes failed on %: %', TG_TABLE_NAME, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_log_changes() FROM PUBLIC, anon, authenticated;

-- ── Attach the trigger to every table in public (except the log itself) ─────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname <> 'audit_logs'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I', r.relname);
    EXECUTE format(
      'CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_log_changes()',
      r.relname
    );
  END LOOP;
END $$;
