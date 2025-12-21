-- =====================================================
-- RELEASE CALENDAR MODULE - Forward Schedule of Change
-- =====================================================

-- Create change card status enum
CREATE TYPE change_card_status AS ENUM (
  'new_awaiting_approval',
  'approved_scheduled',
  'in_progress',
  'ready_for_production',
  'in_production',
  'closed'
);

-- Create compliance state enum
CREATE TYPE compliance_state AS ENUM (
  'compliant',
  'exception_recorded'
);

-- Create exception reason enum
CREATE TYPE exception_reason_code AS ENUM (
  'moved_to_prod_not_approved',
  'committee_pending_override',
  'emergency_change',
  'business_critical',
  'other'
);

-- Create work item type enum for links
CREATE TYPE change_work_item_type AS ENUM (
  'incident',
  'story',
  'feature',
  'task',
  'other'
);

-- Create committee status enum
CREATE TYPE change_committee_status AS ENUM (
  'pending',
  'approved',
  'not_required'
);

-- Create audit event type enum
CREATE TYPE change_audit_event_type AS ENUM (
  'created',
  'updated',
  'status_changed',
  'approval_toggled',
  'ticket_linked',
  'ticket_unlinked',
  'exception_recorded'
);

-- =====================================================
-- TABLE: change_cards
-- =====================================================
CREATE TABLE IF NOT EXISTS change_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  planned_prod_date DATE NOT NULL,
  release_version_id UUID REFERENCES release_versions(id),
  change_manager_user_id UUID NOT NULL,
  status change_card_status NOT NULL DEFAULT 'new_awaiting_approval',
  
  -- Approval
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  
  -- Compliance
  compliance_state compliance_state NOT NULL DEFAULT 'compliant',
  exception_reason_code exception_reason_code,
  exception_notes TEXT,
  exception_recorded_by_user_id UUID,
  exception_recorded_at TIMESTAMPTZ,
  
  -- Audit
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_user_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- TABLE: change_card_links
-- =====================================================
CREATE TABLE IF NOT EXISTS change_card_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_card_id UUID NOT NULL REFERENCES change_cards(id) ON DELETE CASCADE,
  work_item_type change_work_item_type NOT NULL,
  work_item_id TEXT NOT NULL,
  work_item_key TEXT,
  committee_status change_committee_status NOT NULL DEFAULT 'pending',
  
  -- Cached data
  cached_title TEXT,
  cached_status TEXT,
  cached_priority_or_severity TEXT,
  
  -- Audit
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one ticket can only be linked to one change
  UNIQUE(work_item_type, work_item_id)
);

-- =====================================================
-- TABLE: change_card_audit_events
-- =====================================================
CREATE TABLE IF NOT EXISTS change_card_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_card_id UUID NOT NULL REFERENCES change_cards(id) ON DELETE CASCADE,
  event_type change_audit_event_type NOT NULL,
  from_value TEXT,
  to_value TEXT,
  reason_code exception_reason_code,
  notes TEXT,
  actor_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata_json JSONB DEFAULT '{}'::jsonb
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_change_cards_planned_date ON change_cards(planned_prod_date);
CREATE INDEX idx_change_cards_status ON change_cards(status);
CREATE INDEX idx_change_cards_release_version ON change_cards(release_version_id);
CREATE INDEX idx_change_cards_change_manager ON change_cards(change_manager_user_id);
CREATE INDEX idx_change_card_links_change_card ON change_card_links(change_card_id);
CREATE INDEX idx_change_card_audit_change_card ON change_card_audit_events(change_card_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE change_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_card_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_card_audit_events ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "change_cards_select" ON change_cards
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "change_card_links_select" ON change_card_links
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "change_card_audit_select" ON change_card_audit_events
  FOR SELECT TO authenticated USING (true);

-- All authenticated users can insert/update change cards
CREATE POLICY "change_cards_insert" ON change_cards
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "change_cards_update" ON change_cards
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "change_cards_delete" ON change_cards
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- All authenticated can manage links
CREATE POLICY "change_card_links_insert" ON change_card_links
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "change_card_links_delete" ON change_card_links
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- All authenticated can create audit events
CREATE POLICY "change_card_audit_insert" ON change_card_audit_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- UPDATE TRIGGER for updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_change_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_change_cards_updated_at
  BEFORE UPDATE ON change_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_change_cards_updated_at();