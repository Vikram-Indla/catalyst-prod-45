-- CAT-STRATA-IMPL-20260712-001 · PB-DEF-010 · Reviews ↔ Portfolio/Benefit/Gate linkage
--
-- Reviews & Decisions could reference OKRs but not portfolios, benefits, benefit values or gates.
-- This adds a governed, bidirectional reference model. Links are metadata that sit ALONGSIDE the
-- review — they never touch the review's locked snapshot or issued board pack, so immutability holds.

CREATE TABLE IF NOT EXISTS public.strata_review_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.strata_reviews(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('portfolio','benefit','benefit_value','gate_instance')),
  target_id uuid NOT NULL,
  note text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, target_type, target_id)
);
ALTER TABLE public.strata_review_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS strata_review_links_read ON public.strata_review_links;
CREATE POLICY strata_review_links_read ON public.strata_review_links FOR SELECT
  USING (public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward','kpi_owner','strata_admin']));

-- link (SoD: strategy_office; target must exist; append-only reference; audited)
CREATE OR REPLACE FUNCTION public.strata_link_review(p_review uuid, p_target_type text, p_target_id uuid, p_note text DEFAULT NULL)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid; ok boolean;
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'linking a review requires strategy_office, vmo_validator or admin role';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.strata_reviews WHERE id = p_review) THEN
    RAISE EXCEPTION 'review not found';
  END IF;
  ok := CASE p_target_type
    WHEN 'portfolio'     THEN EXISTS (SELECT 1 FROM public.strata_portfolios      WHERE id = p_target_id)
    WHEN 'benefit'       THEN EXISTS (SELECT 1 FROM public.strata_benefits         WHERE id = p_target_id)
    WHEN 'benefit_value' THEN EXISTS (SELECT 1 FROM public.strata_benefit_values   WHERE id = p_target_id)
    WHEN 'gate_instance' THEN EXISTS (SELECT 1 FROM public.strata_gate_instances   WHERE id = p_target_id)
    ELSE false END;
  IF NOT ok THEN RAISE EXCEPTION 'referenced % not found (governed reference required, never a free-text id)', p_target_type; END IF;

  INSERT INTO public.strata_review_links (review_id, target_type, target_id, note)
  VALUES (p_review, p_target_type, p_target_id, NULLIF(btrim(p_note), ''))
  ON CONFLICT (review_id, target_type, target_id) DO UPDATE SET note = COALESCE(EXCLUDED.note, strata_review_links.note)
  RETURNING id INTO new_id;

  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', p_review, 'RPC:link_review', auth.uid(), format('linked %s %s', p_target_type, p_target_id));
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.strata_unlink_review(p_review uuid, p_target_type text, p_target_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.strata_has_role(ARRAY['strategy_office','vmo_validator']) THEN
    RAISE EXCEPTION 'unlinking a review requires strategy_office, vmo_validator or admin role';
  END IF;
  DELETE FROM public.strata_review_links
   WHERE review_id = p_review AND target_type = p_target_type AND target_id = p_target_id;
  INSERT INTO public.strata_audit_events (entity_table, entity_id, action, actor_id, note)
  VALUES ('strata_reviews', p_review, 'RPC:unlink_review', auth.uid(), format('unlinked %s %s', p_target_type, p_target_id));
END;
$$;

-- forward: what a review references (with resolved display names)
CREATE OR REPLACE FUNCTION public.strata_review_links_of(p_review uuid)
 RETURNS TABLE(id uuid, target_type text, target_id uuid, target_name text, note text, created_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.target_type, l.target_id,
         CASE l.target_type
           WHEN 'portfolio'     THEN (SELECT name FROM public.strata_portfolios    WHERE id = l.target_id)
           WHEN 'benefit'       THEN (SELECT name FROM public.strata_benefits       WHERE id = l.target_id)
           WHEN 'gate_instance' THEN public.strata_entity_name('gate_instance', l.target_id)
           WHEN 'benefit_value' THEN (SELECT b.name || ' · ' || bv.value_kind FROM public.strata_benefit_values bv JOIN public.strata_benefits b ON b.id = bv.benefit_id WHERE bv.id = l.target_id)
           ELSE NULL END,
         l.note, l.created_at
    FROM public.strata_review_links l
   WHERE l.review_id = p_review
     AND public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward','kpi_owner','strata_admin'])
   ORDER BY l.created_at DESC;
$$;

-- reverse: which reviews reference an entity (for benefit/portfolio → review navigation)
CREATE OR REPLACE FUNCTION public.strata_reviews_referencing(p_target_type text, p_target_id uuid)
 RETURNS TABLE(review_id uuid, review_key text, review_name text, review_slug text, scheduled_for timestamptz, note text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.review_key, r.name, r.slug, r.scheduled_for, l.note
    FROM public.strata_review_links l
    JOIN public.strata_reviews r ON r.id = l.review_id
   WHERE l.target_type = p_target_type AND l.target_id = p_target_id
     AND public.strata_has_role(ARRAY['strategy_office','vmo_validator','data_steward','kpi_owner','strata_admin'])
   ORDER BY r.scheduled_for DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.strata_link_review(uuid, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_unlink_review(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_review_links_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strata_reviews_referencing(text, uuid) TO authenticated;
