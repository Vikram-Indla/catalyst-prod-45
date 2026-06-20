-- Migration: Catalyst Native 5-Digit ID Sequence
-- Date: 2026-06-20
-- Context: Jira deprecation — Catalyst becomes system of record
--
-- After migration:
-- - New Catalyst work items get 5-digit IDs (BAU-12345)
-- - Jira tickets stay 4-digit (BAU-1234) — historical reference only
-- - Conflict guard prevents Jira IDs from reaching 5-digit
-- - UI reads ONLY Catalyst tables (no live Jira connection)

-- 1. Create sequence for 5-digit Catalyst IDs per project
CREATE TABLE IF NOT EXISTS public.catalyst_issue_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_key text NOT NULL UNIQUE,
  next_sequence integer NOT NULL DEFAULT 10000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_key_format CHECK (project_key ~ '^[A-Z]{2,}$')
);

COMMENT ON TABLE public.catalyst_issue_sequences IS 'Tracks 5-digit sequence counter per project for Catalyst-native issue IDs. Used to generate keys like BAU-12345.';

-- 2. Create function to generate next Catalyst ID
CREATE OR REPLACE FUNCTION public.generate_catalyst_issue_key(p_project_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_seq integer;
  v_issue_key text;
BEGIN
  -- Insert or update sequence
  INSERT INTO public.catalyst_issue_sequences (project_key, next_sequence)
  VALUES (p_project_key, 10000)
  ON CONFLICT (project_key) DO UPDATE
  SET next_sequence = catalyst_issue_sequences.next_sequence + 1,
      updated_at = now()
  WHERE project_key = p_project_key
  RETURNING next_sequence INTO v_next_seq;

  v_issue_key := p_project_key || '-' || v_next_seq;
  RETURN v_issue_key;
END;
$$;

COMMENT ON FUNCTION public.generate_catalyst_issue_key IS 'Generate next 5-digit Catalyst-native issue key for a project (e.g. BAU-12345). Called on work item creation.';

-- 3. Create conflict detection table (4-digit Jira IDs that approach 5-digit)
CREATE TABLE IF NOT EXISTS public.jira_id_conflict_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jira_issue_key text NOT NULL,
  project_key text NOT NULL,
  jira_sequence_number integer NOT NULL,
  catalyst_next_sequence integer NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'IGNORED')),
  notes text,
  CONSTRAINT unique_jira_key UNIQUE (jira_issue_key),
  CONSTRAINT sequence_validity CHECK (jira_sequence_number <= 9999)
);

COMMENT ON TABLE public.jira_id_conflict_alerts IS 'Tracks Jira 4-digit IDs that approach or would conflict with 5-digit Catalyst sequences. Prevents ambiguity.';

-- 4. Create monitoring function for conflict detection
CREATE OR REPLACE FUNCTION public.check_jira_id_conflict()
RETURNS TABLE (project_key text, jira_key text, jira_seq integer, catalyst_next integer, risk_level text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sq.project_key,
    ph.issue_key,
    ph.jira_sequence_number,
    sq.next_sequence,
    CASE
      WHEN ph.jira_sequence_number >= (sq.next_sequence - 100) THEN 'HIGH'
      WHEN ph.jira_sequence_number >= (sq.next_sequence - 500) THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level
  FROM public.ph_issues ph
  JOIN public.catalyst_issue_sequences sq ON sq.project_key = ph.project_key
  WHERE ph.jira_sequence_number >= (sq.next_sequence - 100)
    AND ph.source = 'jira'
  ORDER BY risk_level DESC, jira_seq DESC;
$$;

COMMENT ON FUNCTION public.check_jira_id_conflict IS 'Monitor for Jira 4-digit IDs that approach Catalyst 5-digit ranges. Prevent collisions.';

-- 5. Seed initial sequences for known projects
INSERT INTO public.catalyst_issue_sequences (project_key, next_sequence)
VALUES
  ('BAU', 10000),
  ('MWR', 10000),
  ('ICP', 10000),
  ('IRP', 10000),
  ('IN', 10000),
  ('INV', 10000),
  ('IP', 10000),
  ('TAH', 10000)
ON CONFLICT (project_key) DO NOTHING;

-- 6. Add RLS policy (admin-only access to sequences and conflicts)
ALTER TABLE public.catalyst_issue_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_id_conflict_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage sequences" ON public.catalyst_issue_sequences;
CREATE POLICY "Admins manage sequences" ON public.catalyst_issue_sequences
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

DROP POLICY IF EXISTS "Admins manage conflict alerts" ON public.jira_id_conflict_alerts;
CREATE POLICY "Admins manage conflict alerts" ON public.jira_id_conflict_alerts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

GRANT SELECT, INSERT, UPDATE ON public.catalyst_issue_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.jira_id_conflict_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_catalyst_issue_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_jira_id_conflict TO authenticated;
