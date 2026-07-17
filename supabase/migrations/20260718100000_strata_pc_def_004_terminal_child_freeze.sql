-- =============================================================================
-- PC-DEF-004 — Terminal-state immutability for Project Cards
-- Feature: CAT-STRATA-PCDEF-20260717-001
--
-- Defect: a Completed Project Card remained mutable — it accepted a NEW open
-- risk and a NEW open delivery dependency after completion (evidence:
-- "J Project Risk Post-Completion 20260717-1759" / "J Project Dependency
-- Post-Completion 20260717-1801" persisted against completed PRJ-00033).
-- Completed / Cancelled / Archived delivery history must be frozen.
--
-- Fix (server-enforced, table-level — catches EVERY write path, not just the
-- current RPCs, and is immune to future ones): a BEFORE INSERT OR UPDATE guard
-- on every child/evidence table that resolves its owning Project Card and
-- rejects the write when that card is in a terminal lifecycle stage.
--
-- Corrections to frozen history must therefore be prospective or explicitly
-- superseding (a governed reopen/supersede verb — PC-DEF-003 — not a silent
-- in-place mutation). This migration ONLY freezes; it does not add the reopen
-- verb, so it cannot loosen any existing control.
--
-- Scope note: `stage` is the Project Card lifecycle column. Terminal set is
-- ('completed','cancelled','archived'). 'cancelled' is not yet a seeded
-- delivery_status picklist value; it is included here so the freeze is already
-- correct once PC-DEF cancellation lands (harmless until then).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.strata_guard_terminal_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card  uuid;
  v_stage text;
BEGIN
  -- Resolve the owning Project Card for the row being written.
  IF TG_TABLE_NAME = 'strata_milestones' THEN
    v_card := NEW.project_card_id;
  ELSIF TG_TABLE_NAME = 'strata_risks' THEN
    v_card := NEW.project_card_id;
  ELSIF TG_TABLE_NAME = 'strata_dependencies' THEN
    -- Only the requesting (owning) side freezes with its Project Card.
    IF NEW.requesting_type = 'project_card' THEN
      v_card := NEW.requesting_id;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'strata_execution_links' THEN
    -- A Project Card's own outgoing edges (e.g. `measures` KPI links,
    -- `has_objective`) are part of its delivery evidence set.
    IF NEW.from_type = 'project_card' THEN
      v_card := NEW.from_id;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  IF v_card IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT stage INTO v_stage FROM public.strata_project_cards WHERE id = v_card;

  IF v_stage IN ('completed', 'cancelled', 'archived') THEN
    RAISE EXCEPTION
      'project card is in terminal state "%" — its delivery history is frozen; new or modified % are not permitted (corrections must be prospective or explicitly superseding)',
      v_stage, TG_TABLE_NAME
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.strata_guard_terminal_child() IS
  'PC-DEF-004: rejects INSERT/UPDATE of Project Card child/evidence rows (milestones, risks, dependencies, execution links) when the owning card is in a terminal lifecycle stage (completed | cancelled | archived). Terminal delivery history is immutable; corrections must be prospective or superseding.';

-- Milestones -----------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_strata_guard_terminal ON public.strata_milestones;
CREATE TRIGGER trg_strata_guard_terminal
  BEFORE INSERT OR UPDATE ON public.strata_milestones
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_terminal_child();

-- Risks ----------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_strata_guard_terminal ON public.strata_risks;
CREATE TRIGGER trg_strata_guard_terminal
  BEFORE INSERT OR UPDATE ON public.strata_risks
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_terminal_child();

-- Dependencies (requesting-side only) ----------------------------------------
DROP TRIGGER IF EXISTS trg_strata_guard_terminal ON public.strata_dependencies;
CREATE TRIGGER trg_strata_guard_terminal
  BEFORE INSERT OR UPDATE ON public.strata_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_terminal_child();

-- Execution links (a card's own outgoing edges: measures KPI, has_objective) --
DROP TRIGGER IF EXISTS trg_strata_guard_terminal ON public.strata_execution_links;
CREATE TRIGGER trg_strata_guard_terminal
  BEFORE INSERT OR UPDATE ON public.strata_execution_links
  FOR EACH ROW EXECUTE FUNCTION public.strata_guard_terminal_child();
