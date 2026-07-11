-- CAT-STRATA-FOUNDATION-20260709-001 · W2 linkage model
-- REQ-007 (locked rules 5–6): Project Cards sit under the Strategic
-- Objective level while retaining their Strategic Theme link.
-- REQ-010 (locked rules 12–15): only Project Cards (and legacy initiatives,
-- until REQ-019 retires them) may join Portfolios — Strategic Themes can
-- never link to a Portfolio in either direction. member_type CHECK
-- ('initiative','project_card') already excludes themes; this migration adds
-- referential enforcement so a member row must point at a real row of the
-- declared type (a theme UUID smuggled in as member_id now fails loudly).

-- 1. REQ-007: direct card -> Strategic Objective edge (additive, nullable).
ALTER TABLE public.strata_project_cards
  ADD COLUMN IF NOT EXISTS objective_element_id uuid
    REFERENCES public.strata_strategy_elements(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.strata_project_cards.objective_element_id IS
  'Linked Strategic Objective (locked rule 5). Must be a theme-context objective; when theme_id is set the objective must belong to that Theme (rule 6 consistency). Validated by strata_validate_card_objective.';

CREATE OR REPLACE FUNCTION public.strata_validate_card_objective()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE obj record;
BEGIN
  IF NEW.objective_element_id IS NULL THEN RETURN NEW; END IF;
  SELECT id, element_type, context, parent_id INTO obj
    FROM public.strata_strategy_elements WHERE id = NEW.objective_element_id;
  IF obj.id IS NULL THEN
    RAISE EXCEPTION 'linked Strategic Objective not found';
  END IF;
  IF obj.element_type <> 'objective' OR obj.context <> 'theme' THEN
    RAISE EXCEPTION 'objective_element_id must reference a Strategic Objective (theme-context objective element)';
  END IF;
  IF NEW.theme_id IS NOT NULL AND obj.parent_id IS DISTINCT FROM NEW.theme_id THEN
    RAISE EXCEPTION 'linked Strategic Objective must belong to the card''s Strategic Theme';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strata_validate_card_objective ON public.strata_project_cards;
CREATE TRIGGER trg_strata_validate_card_objective
  BEFORE INSERT OR UPDATE OF objective_element_id, theme_id
  ON public.strata_project_cards
  FOR EACH ROW EXECUTE FUNCTION public.strata_validate_card_objective();

CREATE INDEX IF NOT EXISTS idx_strata_project_cards_objective
  ON public.strata_project_cards(objective_element_id)
  WHERE objective_element_id IS NOT NULL;

-- 2. REQ-010: portfolio membership referential guard. The type CHECK bans
--    themes structurally; this trigger bans identity smuggling.
CREATE OR REPLACE FUNCTION public.strata_validate_portfolio_member()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.member_type = 'project_card' THEN
    IF NOT EXISTS (SELECT 1 FROM public.strata_project_cards WHERE id = NEW.member_id) THEN
      RAISE EXCEPTION 'portfolio member (project_card) not found — only Project Cards link to Portfolios (locked rules 12–15)';
    END IF;
  ELSIF NEW.member_type = 'initiative' THEN
    IF NOT EXISTS (SELECT 1 FROM public.strata_initiatives WHERE id = NEW.member_id) THEN
      RAISE EXCEPTION 'portfolio member (initiative) not found';
    END IF;
  ELSE
    -- unreachable while the member_type CHECK holds; belt-and-braces for rule 12–15
    RAISE EXCEPTION 'invalid portfolio member type % — Strategic Themes never link to Portfolios', NEW.member_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strata_validate_portfolio_member ON public.strata_portfolio_memberships;
CREATE TRIGGER trg_strata_validate_portfolio_member
  BEFORE INSERT OR UPDATE ON public.strata_portfolio_memberships
  FOR EACH ROW EXECUTE FUNCTION public.strata_validate_portfolio_member();
