-- ============================================================
-- ITSM Incident Management — Phase 1A (net-new, fully isolated)
-- Touches NO existing table. Does NOT touch generate_incident_key / incidents / sla_*.
-- Applied via apply_migration MCP 2026-06-17; this file mirrors it for git history.
-- Verified: key zero-pad+uniqueness, status/timeline triggers, 2-user RLS isolation.
-- ============================================================

-- 1. SLA policies ------------------------------------------------
CREATE TABLE public.itsm_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('Highest','High','Medium','Low','Lowest')),
  response_minutes integer NOT NULL CHECK (response_minutes > 0),
  resolve_minutes integer NOT NULL CHECK (resolve_minutes > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Key sequence (atomic row-lock counter; zero-pad -> INC-0001) -
CREATE TABLE public.itsm_incident_sequences (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  last_number integer NOT NULL DEFAULT 0
);
INSERT INTO public.itsm_incident_sequences (id, last_number) VALUES (true, 0);

-- 3. Core incidents ---------------------------------------------
CREATE TABLE public.itsm_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'triage'
    CHECK (status IN ('triage','investigating','identified','monitoring','resolved','closed')),
  severity text NOT NULL DEFAULT 'SEV3'
    CHECK (severity IN ('SEV1','SEV2','SEV3','SEV4')),
  priority text NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Highest','High','Medium','Low','Lowest')),
  affected_service text,
  assignee_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sla_policy_id uuid REFERENCES public.itsm_sla_policies(id) ON DELETE SET NULL,
  response_due_at timestamptz,
  resolve_due_at timestamptz,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Members (responders/watchers) -> RLS membership source ------
CREATE TABLE public.itsm_incident_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.itsm_incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'watcher' CHECK (role IN ('responder','watcher','commander')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incident_id, user_id)
);

-- 5. Status history ---------------------------------------------
CREATE TABLE public.itsm_incident_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.itsm_incidents(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Timeline ---------------------------------------------------
CREATE TABLE public.itsm_incident_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.itsm_incidents(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','status_changed','assigned','resolved','closed','note')),
  detail text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Indexes ----------------------------------------------------
CREATE INDEX idx_itsm_incidents_status ON public.itsm_incidents(status);
CREATE INDEX idx_itsm_incidents_priority ON public.itsm_incidents(priority);
CREATE INDEX idx_itsm_incidents_assignee ON public.itsm_incidents(assignee_id);
CREATE INDEX idx_itsm_incidents_reporter ON public.itsm_incidents(reporter_id);
CREATE INDEX idx_itsm_incidents_created ON public.itsm_incidents(created_at DESC);
CREATE INDEX idx_itsm_members_incident ON public.itsm_incident_members(incident_id);
CREATE INDEX idx_itsm_members_user ON public.itsm_incident_members(user_id);
CREATE INDEX idx_itsm_status_hist_incident ON public.itsm_incident_status_history(incident_id);
CREATE INDEX idx_itsm_timeline_incident ON public.itsm_incident_timeline(incident_id);

-- 8. Key-gen fn (separate from generate_incident_key; zero-pad) --
CREATE OR REPLACE FUNCTION public.itsm_generate_incident_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  next_num integer;
BEGIN
  UPDATE public.itsm_incident_sequences
    SET last_number = last_number + 1
    WHERE id = true
    RETURNING last_number INTO next_num;
  NEW.incident_key := 'INC-' || lpad(next_num::text, 4, '0');
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_itsm_incident_key
  BEFORE INSERT ON public.itsm_incidents
  FOR EACH ROW
  WHEN (NEW.incident_key IS NULL OR NEW.incident_key = '')
  EXECUTE FUNCTION public.itsm_generate_incident_key();

-- 9. updated_at (moddatetime) -----------------------------------
CREATE TRIGGER trg_itsm_incidents_modtime
  BEFORE UPDATE ON public.itsm_incidents
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);
CREATE TRIGGER trg_itsm_sla_modtime
  BEFORE UPDATE ON public.itsm_sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime(updated_at);

-- 10. status-history + timeline triggers ------------------------
CREATE OR REPLACE FUNCTION public.itsm_log_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.itsm_incident_timeline (incident_id, event_type, detail, actor_id)
      VALUES (NEW.id, 'created', NEW.incident_key, auth.uid());
    RETURN NEW;
  END IF;
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.itsm_incident_status_history (incident_id, from_status, to_status, changed_by)
      VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    INSERT INTO public.itsm_incident_timeline (incident_id, event_type, detail, actor_id)
      VALUES (NEW.id, 'status_changed', OLD.status || ' -> ' || NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER trg_itsm_status_change_ins
  AFTER INSERT ON public.itsm_incidents
  FOR EACH ROW EXECUTE FUNCTION public.itsm_log_status_change();
CREATE TRIGGER trg_itsm_status_change_upd
  AFTER UPDATE ON public.itsm_incidents
  FOR EACH ROW EXECUTE FUNCTION public.itsm_log_status_change();

-- 11. SECURITY DEFINER membership helper (qualified params) ------
CREATE OR REPLACE FUNCTION public.itsm_incident_is_member(p_incident uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.itsm_incident_members m
    WHERE m.incident_id = itsm_incident_is_member.p_incident
      AND m.user_id = itsm_incident_is_member.p_user
  );
$fn$;

-- 12. RLS -------------------------------------------------------
ALTER TABLE public.itsm_incidents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itsm_incident_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itsm_incident_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itsm_incident_timeline      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itsm_sla_policies           ENABLE ROW LEVEL SECURITY;

CREATE POLICY itsm_incidents_select ON public.itsm_incidents
  FOR SELECT TO authenticated USING (true);
CREATE POLICY itsm_incidents_insert ON public.itsm_incidents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY itsm_incidents_update ON public.itsm_incidents
  FOR UPDATE TO authenticated
  USING (reporter_id = auth.uid() OR assignee_id = auth.uid()
         OR public.itsm_incident_is_member(id, auth.uid()))
  WITH CHECK (reporter_id = auth.uid() OR assignee_id = auth.uid()
         OR public.itsm_incident_is_member(id, auth.uid()));
CREATE POLICY itsm_incidents_delete ON public.itsm_incidents
  FOR DELETE TO authenticated
  USING (reporter_id = auth.uid() OR public.itsm_incident_is_member(id, auth.uid()));

CREATE POLICY itsm_members_select ON public.itsm_incident_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY itsm_members_insert ON public.itsm_incident_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.itsm_incidents i
               WHERE i.id = incident_id
                 AND (i.reporter_id = auth.uid() OR i.assignee_id = auth.uid()))
  );
CREATE POLICY itsm_members_delete ON public.itsm_incident_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.itsm_incidents i
               WHERE i.id = incident_id
                 AND (i.reporter_id = auth.uid() OR i.assignee_id = auth.uid()))
  );

CREATE POLICY itsm_status_hist_select ON public.itsm_incident_status_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY itsm_timeline_select ON public.itsm_incident_timeline
  FOR SELECT TO authenticated USING (true);
CREATE POLICY itsm_sla_select ON public.itsm_sla_policies
  FOR SELECT TO authenticated USING (true);

-- 13. Seed default SLA policies ---------------------------------
INSERT INTO public.itsm_sla_policies (name, priority, response_minutes, resolve_minutes) VALUES
  ('P1 Critical',  'Highest', 15,  240),
  ('P2 High',      'High',    30,  480),
  ('P3 Medium',    'Medium',  60,  1440),
  ('P4 Low',       'Low',     240, 2880),
  ('P5 Lowest',    'Lowest',  480, 5760);
