-- /admin/components v3 — per-route scoping (2026-05-17).
--
-- Extends component_config + component_config_history with a `route` column
-- so an admin can publish a flag override that applies only when the user is
-- on a specific path (e.g. `/backlog` only, not platform-wide).
--
-- Semantics
-- ────────
--   route = ''            → global default (legacy v2 behaviour; matches
--                            every pathname). All existing v2 rows migrate
--                            to this value via the DEFAULT.
--   route = '/backlog'    → matches any pathname containing the substring
--                            (e.g. /project-hub/BAU/backlog, /project-hub/
--                            INV/backlog/BAU-5717). Routes are stored as
--                            substring patterns; the runtime hook picks the
--                            LONGEST matching route per (componentId,
--                            pathname).
--
-- Resolver precedence inside the hook (locked):
--   1. caller props
--   2. route-specific runtime row (longest substring match for pathname)
--   3. global runtime row (route = '')
--   4. registry default
--
-- CLAUDE.md gates honoured:
--   - RLS in same migration as DDL
--   - Anti-pattern #18: schema added explicitly with Vikram approval
--
-- Reversal: drops the route column from both tables and restores the
-- single-column PK on component_config. Safe to re-run.

BEGIN;

-- ─── component_config: add `route` and recompose the primary key ────────────

ALTER TABLE public.component_config
  ADD COLUMN IF NOT EXISTS route TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.component_config.route IS
  'Substring pattern matched against window.location.pathname at runtime. Empty string = global default (matches every route). Longest matching pattern wins per (component_id, pathname).';

-- Recompose the primary key as (component_id, route). PK was (component_id)
-- in v2; we drop the constraint by name (PostgreSQL auto-names it
-- `component_config_pkey`) and add the composite one. Safe under
-- IF EXISTS / IF NOT EXISTS so the migration re-runs cleanly.
ALTER TABLE public.component_config DROP CONSTRAINT IF EXISTS component_config_pkey;
ALTER TABLE public.component_config
  ADD CONSTRAINT component_config_pkey PRIMARY KEY (component_id, route);

-- ─── component_config_history: add `route` so audit rows carry scope ────────

ALTER TABLE public.component_config_history
  ADD COLUMN IF NOT EXISTS route TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.component_config_history.route IS
  'Route scope of the published/updated/rolled-back row. Empty string = global. Populated by the audit trigger from NEW.route (or OLD.route on DELETE).';

CREATE INDEX IF NOT EXISTS idx_cfg_history_component_route
  ON public.component_config_history (component_id, route, applied_at DESC);

-- ─── Audit trigger: write `route` into every history row ────────────────────

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
      (component_id, route, version, feature_flags, action, applied_by, notes)
    VALUES
      (NEW.component_id, NEW.route, NEW.active_version, NEW.feature_flags, v_action, NEW.applied_by, NEW.notes);
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
      (component_id, route, version, feature_flags, action, applied_by, notes)
    VALUES
      (NEW.component_id, NEW.route, NEW.active_version, NEW.feature_flags, v_action, NEW.applied_by, NEW.notes);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.component_config_history
      (component_id, route, version, feature_flags, action, applied_by, notes)
    VALUES
      (OLD.component_id, OLD.route, OLD.active_version, OLD.feature_flags, 'reset', OLD.applied_by, 'Row deleted — reset to registry default.');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger itself doesn't change shape — same INSERT/UPDATE/DELETE coverage,
-- same row-level firing. Just re-declare to pick up the function update.
DROP TRIGGER IF EXISTS trg_component_config_history ON public.component_config;
CREATE TRIGGER trg_component_config_history
  AFTER INSERT OR UPDATE OR DELETE ON public.component_config
  FOR EACH ROW
  EXECUTE FUNCTION public.write_component_config_history();

COMMIT;
