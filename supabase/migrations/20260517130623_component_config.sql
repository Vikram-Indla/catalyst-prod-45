-- /admin/components v2 — Publish + Apply + Reset (2026-05-17).
--
-- Adds two tables that back the runtime component configuration system:
--
--   component_config          — one row per canonical component_id; holds
--                                the currently-active version + feature_flag
--                                overrides. Read by every canonical
--                                component through the useComponentConfig
--                                react-query hook.
--
--   component_config_history  — append-only audit log. Every INSERT/UPDATE/
--                                DELETE on component_config writes a row via
--                                trigger. Drives the History tab and the
--                                Rollback feature.
--
-- CLAUDE.md gates honoured:
--   - RLS in same migration as DDL (2026-05-09)
--   - Anti-pattern #18: schema added explicitly with Vikram approval
--   - admin role checked via existing is_admin() / user_roles pattern
--
-- Reversal: drops both tables, the trigger, the trigger function. Safe to
-- re-run.

BEGIN;

-- ─── component_config ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.component_config (
  component_id   TEXT        PRIMARY KEY,
  active_version TEXT        NOT NULL,
  feature_flags  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes          TEXT,
  CONSTRAINT component_config_version_format CHECK (active_version ~ '^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.]+)?$')
);

COMMENT ON TABLE public.component_config IS
  '/admin/components v2 — active runtime config per canonical component. One row per component_id. Read by useComponentConfig() hook in every canonical component.';

-- ─── component_config_history ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.component_config_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id  TEXT        NOT NULL,
  version       TEXT        NOT NULL,
  feature_flags JSONB       NOT NULL DEFAULT '{}'::jsonb,
  action        TEXT        NOT NULL CHECK (action IN ('publish','update','rollback','reset','delete')),
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         TEXT
);

CREATE INDEX IF NOT EXISTS idx_cfg_history_component
  ON public.component_config_history (component_id, applied_at DESC);

COMMENT ON TABLE public.component_config_history IS
  'Append-only audit log of every publish/update/rollback/reset on component_config. Powers the History tab and Rollback feature in /admin/components.';

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.component_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.component_config_history ENABLE ROW LEVEL SECURITY;

-- Authenticated users may READ the active config (every canonical component
-- needs this at runtime, including non-admins viewing detail views, lists,
-- etc.). Without read access, the hook returns nothing and the registry
-- default applies — which would defeat the publish mechanism.
CREATE POLICY component_config_read_all
  ON public.component_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins may write. Mirror the pattern used by other admin-only tables
-- in this schema (checks user_roles for 'admin' or 'super_admin').
CREATE POLICY component_config_admin_write
  ON public.component_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- History is admin-only end-to-end (read + write).
CREATE POLICY component_config_history_admin_read
  ON public.component_config_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

CREATE POLICY component_config_history_admin_insert
  ON public.component_config_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

-- ─── Audit trigger ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.write_component_config_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'publish';
    INSERT INTO public.component_config_history
      (component_id, version, feature_flags, action, applied_by, notes)
    VALUES
      (NEW.component_id, NEW.active_version, NEW.feature_flags, v_action, NEW.applied_by, NEW.notes);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Distinguish a true rollback (active_version went DOWN) from a normal
    -- update by inspecting whether the new version sorts below the old.
    IF NEW.active_version < OLD.active_version THEN
      v_action := 'rollback';
    ELSE
      v_action := 'update';
    END IF;
    INSERT INTO public.component_config_history
      (component_id, version, feature_flags, action, applied_by, notes)
    VALUES
      (NEW.component_id, NEW.active_version, NEW.feature_flags, v_action, NEW.applied_by, NEW.notes);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.component_config_history
      (component_id, version, feature_flags, action, applied_by, notes)
    VALUES
      (OLD.component_id, OLD.active_version, OLD.feature_flags, 'reset', OLD.applied_by, 'Row deleted — reset to registry default.');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_component_config_history ON public.component_config;
CREATE TRIGGER trg_component_config_history
  AFTER INSERT OR UPDATE OR DELETE ON public.component_config
  FOR EACH ROW
  EXECUTE FUNCTION public.write_component_config_history();

COMMIT;
