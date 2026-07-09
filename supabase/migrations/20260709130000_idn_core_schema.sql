-- ============================================================================
-- CAT-IDEATION-REBUILD-20260709-001 · Phase 1 · Slice S1 — Ideation core schema
-- Greenfield idn_* namespace. Zero references to legacy ph_idea* objects.
-- Design of record: features/CAT-IDEATION-DISCOVERY-20260709-001/03 §3 (schema),
-- §4 (lifecycle/locks), §7 (roles). Decisions D1–D9 approved 2026-07-09.
-- ============================================================================

-- ---------- Enums -----------------------------------------------------------
CREATE TYPE public.idn_idea_class AS ENUM ('problem', 'opportunity', 'improvement');
CREATE TYPE public.idn_origin_channel AS ENUM ('form', 'chat', 'voice', 'document');
CREATE TYPE public.idn_language AS ENUM ('en', 'ar');
CREATE TYPE public.idn_decision AS ENUM ('approved', 'declined', 'parked', 'merged');
CREATE TYPE public.idn_evidence_kind AS ENUM ('snippet', 'document', 'link', 'voice_transcript', 'image');
CREATE TYPE public.idn_watch_reason AS ENUM ('submitter', 'voter', 'manual');
CREATE TYPE public.idn_role AS ENUM ('reviewer', 'approver', 'admin');

-- ---------- Module roles + helpers (per-module helper convention:
-- strata_has_role / kb_is_admin / planhub_is_admin) --------------------------
CREATE TABLE public.idn_user_roles (
  user_id uuid NOT NULL,
  role public.idn_role NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE OR REPLACE FUNCTION public.idn_has_role(_roles public.idn_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.idn_user_roles r
        WHERE r.user_id = auth.uid() AND r.role = ANY(_roles)
      );
$$;

CREATE OR REPLACE FUNCTION public.idn_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.idn_user_roles r
        WHERE r.user_id = auth.uid() AND r.role = 'admin'
      );
$$;

-- ---------- Display-key sequence (race-safe: sequence, not max()+1) ---------
CREATE SEQUENCE public.idn_idea_key_seq START WITH 1;

CREATE OR REPLACE FUNCTION public.idn_generate_idea_key()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.idea_key IS NULL OR NEW.idea_key = '' THEN
    NEW.idea_key := 'IDEA-' || nextval('public.idn_idea_key_seq');
  END IF;
  RETURN NEW;
END; $$;

-- ---------- Core table ------------------------------------------------------
CREATE TABLE public.idn_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_key text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  problem_statement jsonb,                  -- ADF
  proposed_value jsonb,                     -- ADF, optional
  idea_class public.idn_idea_class NOT NULL,
  -- Sole status column; states/transitions live in the ph_wf_* runtime (S3 seed)
  workflow_status_key text NOT NULL DEFAULT 'draft',
  submitter_id uuid NOT NULL DEFAULT auth.uid(),
  owner_id uuid,                            -- triage owner
  sponsor_id uuid,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  strategy_element_id uuid REFERENCES public.strata_strategy_elements(id) ON DELETE SET NULL,
  origin_channel public.idn_origin_channel NOT NULL DEFAULT 'form',
  language public.idn_language NOT NULL DEFAULT 'en',
  score_total numeric(10,2),                -- materialized from active scoring model (S2)
  decision public.idn_decision,
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  parked_until date,
  merged_into_id uuid REFERENCES public.idn_ideas(id) ON DELETE SET NULL,
  converted_business_request_id uuid REFERENCES public.business_requests(id) ON DELETE SET NULL,
  converted_at timestamptz,
  converted_by uuid,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Declines and parks always carry a reason (comment_required guard mirror)
  CONSTRAINT idn_decision_reason_required
    CHECK (decision IS NULL OR decision NOT IN ('declined', 'parked') OR decision_reason IS NOT NULL),
  CONSTRAINT idn_merged_needs_target
    CHECK (decision IS DISTINCT FROM 'merged' OR merged_into_id IS NOT NULL)
);

COMMENT ON TABLE public.idn_ideas IS
  'Ideation core (CAT-IDEATION-REBUILD-20260709-001). Terminal lock = converted or merged; enforced in RLS below.';

-- Locked = converted or merged: read-only except comments (03 §4)
CREATE OR REPLACE FUNCTION public.idn_idea_is_locked(_idea_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.idn_ideas i
    WHERE i.id = _idea_id
      AND (i.converted_business_request_id IS NOT NULL OR i.decision = 'merged')
  );
$$;

-- Slug: frozen on create, catalyst_slugify + -2/-3 dedupe (releases precedent)
CREATE OR REPLACE FUNCTION public.idn_ideas_generate_slug()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  base_slug text; candidate text; counter int := 2;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    IF NEW.title IS NOT NULL AND NEW.title <> '' THEN
      base_slug := public.catalyst_slugify(NEW.title);
    ELSE
      base_slug := 'idea-' || substr(NEW.id::text, 1, 8);
    END IF;
    candidate := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.idn_ideas WHERE slug = candidate) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.idn_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER idn_ideas_key_trigger
  BEFORE INSERT ON public.idn_ideas
  FOR EACH ROW EXECUTE FUNCTION public.idn_generate_idea_key();
CREATE TRIGGER idn_ideas_slug_trigger
  BEFORE INSERT ON public.idn_ideas
  FOR EACH ROW EXECUTE FUNCTION public.idn_ideas_generate_slug();
CREATE TRIGGER idn_ideas_touch_trigger
  BEFORE UPDATE ON public.idn_ideas
  FOR EACH ROW EXECUTE FUNCTION public.idn_touch_updated_at();

CREATE INDEX idx_idn_ideas_status ON public.idn_ideas (workflow_status_key);
CREATE INDEX idx_idn_ideas_submitter ON public.idn_ideas (submitter_id);
CREATE INDEX idx_idn_ideas_owner ON public.idn_ideas (owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_idn_ideas_created ON public.idn_ideas (created_at DESC);
CREATE INDEX idx_idn_ideas_strategy ON public.idn_ideas (strategy_element_id) WHERE strategy_element_id IS NOT NULL;
CREATE INDEX idx_idn_ideas_converted_br ON public.idn_ideas (converted_business_request_id) WHERE converted_business_request_id IS NOT NULL;

-- ---------- Satellites ------------------------------------------------------
CREATE TABLE public.idn_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  kind public.idn_evidence_kind NOT NULL,
  body text,                                -- verbatim snippet / transcript
  document_id uuid REFERENCES public.ai_documents(id) ON DELETE SET NULL,
  url text,
  source_attribution text,
  added_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idn_evidence_has_content CHECK (body IS NOT NULL OR document_id IS NOT NULL OR url IS NOT NULL)
);
CREATE INDEX idx_idn_evidence_idea ON public.idn_evidence (idea_id);

-- D3: vote + 4-level importance (1=critical … 4=none), one row per user per idea
CREATE TABLE public.idn_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  importance smallint NOT NULL CHECK (importance BETWEEN 1 AND 4),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_id, user_id)
);
CREATE INDEX idx_idn_votes_idea ON public.idn_votes (idea_id);

CREATE TABLE public.idn_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  content jsonb NOT NULL,                   -- ADF (CommentEditor)
  parent_comment_id uuid REFERENCES public.idn_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_idn_comments_idea ON public.idn_comments (idea_id);
CREATE TRIGGER idn_comments_touch_trigger
  BEFORE UPDATE ON public.idn_comments
  FOR EACH ROW EXECUTE FUNCTION public.idn_touch_updated_at();

CREATE TABLE public.idn_watchers (
  idea_id uuid NOT NULL REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason public.idn_watch_reason NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, user_id)
);

-- Append-only field-level audit (workflow transitions additionally audited by
-- the canonical runtime's recordAdvisoryStatusChange)
CREATE TABLE public.idn_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.idn_ideas(id) ON DELETE CASCADE,
  action text NOT NULL,
  changed_fields jsonb,
  actor uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_idn_audit_idea ON public.idn_audit_log (idea_id, created_at DESC);

-- ---------- RLS -------------------------------------------------------------
ALTER TABLE public.idn_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_user_roles_select ON public.idn_user_roles FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_user_roles_write ON public.idn_user_roles FOR ALL
  USING (public.idn_is_admin()) WITH CHECK (public.idn_is_admin());

ALTER TABLE public.idn_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_ideas_select ON public.idn_ideas FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_ideas_insert ON public.idn_ideas FOR INSERT
  WITH CHECK (public.current_user_is_approved() AND submitter_id = auth.uid());
-- Draft: submitter edits own. Post-draft: reviewer+. Locked (converted/merged):
-- nobody — reopen applies only to declined/parked, which are not locked.
CREATE POLICY idn_ideas_update ON public.idn_ideas FOR UPDATE
  USING (
    converted_business_request_id IS NULL
    AND decision IS DISTINCT FROM 'merged'
    AND (
      (submitter_id = auth.uid() AND workflow_status_key = 'draft')
      OR public.idn_has_role(ARRAY['reviewer','approver','admin']::public.idn_role[])
    )
  );
CREATE POLICY idn_ideas_delete ON public.idn_ideas FOR DELETE
  USING (public.idn_is_admin());

ALTER TABLE public.idn_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_evidence_select ON public.idn_evidence FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_evidence_insert ON public.idn_evidence FOR INSERT
  WITH CHECK (
    public.current_user_is_approved()
    AND added_by = auth.uid()
    AND NOT public.idn_idea_is_locked(idea_id)
  );
CREATE POLICY idn_evidence_delete ON public.idn_evidence FOR DELETE
  USING ((added_by = auth.uid() OR public.idn_is_admin()) AND NOT public.idn_idea_is_locked(idea_id));

ALTER TABLE public.idn_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_votes_select ON public.idn_votes FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_votes_insert ON public.idn_votes FOR INSERT
  WITH CHECK (
    public.current_user_is_approved()
    AND user_id = auth.uid()
    AND NOT public.idn_idea_is_locked(idea_id)
  );
CREATE POLICY idn_votes_update ON public.idn_votes FOR UPDATE
  USING (user_id = auth.uid() AND NOT public.idn_idea_is_locked(idea_id));
CREATE POLICY idn_votes_delete ON public.idn_votes FOR DELETE
  USING (user_id = auth.uid() AND NOT public.idn_idea_is_locked(idea_id));

-- Comments stay open on locked ideas by design (03 §4: read-only EXCEPT comments)
ALTER TABLE public.idn_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_comments_select ON public.idn_comments FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_comments_insert ON public.idn_comments FOR INSERT
  WITH CHECK (public.current_user_is_approved() AND user_id = auth.uid());
CREATE POLICY idn_comments_update ON public.idn_comments FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY idn_comments_delete ON public.idn_comments FOR DELETE
  USING (user_id = auth.uid() OR public.idn_is_admin());

ALTER TABLE public.idn_watchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_watchers_select ON public.idn_watchers FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_watchers_write ON public.idn_watchers FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.idn_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY idn_audit_select ON public.idn_audit_log FOR SELECT
  USING (public.current_user_is_approved());
CREATE POLICY idn_audit_insert ON public.idn_audit_log FOR INSERT
  WITH CHECK (public.current_user_is_approved() AND actor = auth.uid());
-- No UPDATE/DELETE policies: append-only.
