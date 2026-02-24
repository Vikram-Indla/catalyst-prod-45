
-- ============================================
-- Production Events (pc_*) Schema
-- ============================================

-- pc_events: Core event table
CREATE TABLE public.pc_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_number SERIAL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  investor_impact TEXT,
  event_type TEXT NOT NULL DEFAULT 'feature' CHECK (event_type IN ('feature','incident','improvement','security','performance')),
  source_epic_key TEXT,
  source_epic_summary TEXT,
  linked_release_versions TEXT[] DEFAULT '{}',
  linked_change_numbers TEXT[] DEFAULT '{}',
  deployment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_type TEXT NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('weekly','monthly','quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','rolled_back')),
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  narrative_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- pc_event_tickets: Individual ticket details per event
CREATE TABLE public.pc_event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.pc_events(id) ON DELETE CASCADE,
  ticket_key TEXT NOT NULL,
  summary TEXT,
  type TEXT,
  fix_version TEXT,
  change_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- pc_period_summaries: AI-generated period summaries
CREATE TABLE public.pc_period_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly','monthly','quarterly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary_text TEXT NOT NULL,
  event_count INT NOT NULL DEFAULT 0,
  feature_count INT NOT NULL DEFAULT 0,
  incident_count INT NOT NULL DEFAULT 0,
  improvement_count INT NOT NULL DEFAULT 0,
  security_count INT NOT NULL DEFAULT 0,
  performance_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(period_type, period_start)
);

-- pc_audit_log: Narrative regeneration audit trail
CREATE TABLE public.pc_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.pc_events(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  old_narrative TEXT,
  new_narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_pc_events_period ON public.pc_events(period_type, period_start, period_end);
CREATE INDEX idx_pc_events_deployment ON public.pc_events(deployment_date);
CREATE INDEX idx_pc_events_type ON public.pc_events(event_type);
CREATE INDEX idx_pc_event_tickets_event ON public.pc_event_tickets(event_id);
CREATE INDEX idx_pc_period_summaries_period ON public.pc_period_summaries(period_type, period_start);

-- View: pc_events_list_view — Aggregates events with ticket details as JSONB
CREATE OR REPLACE VIEW public.pc_events_list_view AS
SELECT
  e.*,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'ticketKey', t.ticket_key,
      'summary', t.summary,
      'type', t.type,
      'fixVersion', t.fix_version,
      'changeNumber', t.change_number
    ) ORDER BY t.ticket_key)
    FROM public.pc_event_tickets t WHERE t.event_id = e.id),
    '[]'::jsonb
  ) AS ticket_details,
  (SELECT COUNT(*) FROM public.pc_event_tickets t WHERE t.event_id = e.id)::int AS linked_ticket_count
FROM public.pc_events e;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.pc_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER pc_events_updated_at
  BEFORE UPDATE ON public.pc_events
  FOR EACH ROW EXECUTE FUNCTION public.pc_update_timestamp();

CREATE TRIGGER pc_period_summaries_updated_at
  BEFORE UPDATE ON public.pc_period_summaries
  FOR EACH ROW EXECUTE FUNCTION public.pc_update_timestamp();

-- RLS
ALTER TABLE public.pc_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_period_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pc_audit_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated users can read pc_events"
  ON public.pc_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read pc_event_tickets"
  ON public.pc_event_tickets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read pc_period_summaries"
  ON public.pc_period_summaries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read pc_audit_log"
  ON public.pc_audit_log FOR SELECT TO authenticated USING (true);

-- For now, allow authenticated users to insert/update (super_admin check can be added via app logic)
CREATE POLICY "Authenticated users can insert pc_events"
  ON public.pc_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update pc_events"
  ON public.pc_events FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pc_event_tickets"
  ON public.pc_event_tickets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can insert pc_period_summaries"
  ON public.pc_period_summaries FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update pc_period_summaries"
  ON public.pc_period_summaries FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pc_audit_log"
  ON public.pc_audit_log FOR INSERT TO authenticated WITH CHECK (true);
