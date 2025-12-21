-- Transition approval configurations (which transitions require approval)
CREATE TABLE IF NOT EXISTS transition_approval_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('feature', 'story')),
  from_status VARCHAR(30) NOT NULL,
  to_status VARCHAR(30) NOT NULL,
  approval_type VARCHAR(20) DEFAULT 'sequential' CHECK (approval_type IN ('sequential', 'parallel')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, from_status, to_status)
);

-- Approvers for each entity's transition
CREATE TABLE IF NOT EXISTS transition_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('feature', 'story')),
  entity_id UUID NOT NULL,
  from_status VARCHAR(30) NOT NULL,
  to_status VARCHAR(30) NOT NULL,
  approver_id UUID NOT NULL REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waiting', 'skipped')),
  is_veto BOOLEAN DEFAULT false,
  step_order INTEGER DEFAULT 1,
  due_date DATE,
  comment TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  requested_by UUID REFERENCES profiles(id),
  UNIQUE(entity_type, entity_id, from_status, to_status, approver_id)
);

-- Indexes
CREATE INDEX idx_transition_approvers_entity ON transition_approvers(entity_type, entity_id);
CREATE INDEX idx_transition_approvers_approver ON transition_approvers(approver_id);
CREATE INDEX idx_transition_approvers_status ON transition_approvers(status);

-- RLS
ALTER TABLE transition_approval_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transition_approvers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view approval configs"
  ON transition_approval_configs FOR SELECT USING (true);

CREATE POLICY "Everyone can view transition approvers"
  ON transition_approvers FOR SELECT USING (true);

CREATE POLICY "Users can manage transition approvers"
  ON transition_approvers FOR ALL USING (true);

-- Insert default transition configurations
INSERT INTO transition_approval_configs (entity_type, from_status, to_status, approval_type)
VALUES
  ('feature', 'in_dev', 'qa', 'sequential'),
  ('feature', 'qa', 'uat', 'sequential'),
  ('feature', 'uat', 'beta', 'parallel'),
  ('feature', 'ready_prod', 'in_prod', 'sequential'),
  ('story', 'in_dev', 'qa', 'sequential'),
  ('story', 'qa', 'uat', 'sequential')
ON CONFLICT DO NOTHING;

-- Function to check if transition is allowed
CREATE OR REPLACE FUNCTION can_transition(
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_from_status VARCHAR,
  p_to_status VARCHAR
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason VARCHAR,
  pending_count INTEGER,
  approved_count INTEGER,
  total_count INTEGER,
  veto_approved BOOLEAN
) AS $$
DECLARE
  v_pending INTEGER;
  v_approved INTEGER;
  v_total INTEGER;
  v_veto_approved BOOLEAN;
  v_has_config BOOLEAN;
BEGIN
  -- Check if this transition requires approval
  SELECT EXISTS(
    SELECT 1 FROM transition_approval_configs
    WHERE entity_type = p_entity_type
      AND from_status = p_from_status
      AND to_status = p_to_status
      AND is_active = true
  ) INTO v_has_config;
  
  IF NOT v_has_config THEN
    RETURN QUERY SELECT true, 'No approval required'::VARCHAR, 0, 0, 0, false;
    RETURN;
  END IF;
  
  -- Count approvals for this specific transition
  SELECT
    COUNT(*) FILTER (WHERE status IN ('pending', 'waiting')),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*),
    COALESCE(bool_or(is_veto AND status = 'approved'), false)
  INTO v_pending, v_approved, v_total, v_veto_approved
  FROM transition_approvers
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND from_status = p_from_status
    AND to_status = p_to_status;
  
  -- No approvers configured for this entity
  IF v_total = 0 THEN
    RETURN QUERY SELECT true, 'No approvers configured'::VARCHAR, 0, 0, 0, false;
    RETURN;
  END IF;
  
  -- Veto approved = allow immediately
  IF v_veto_approved THEN
    RETURN QUERY SELECT true, 'Veto approved'::VARCHAR, v_pending, v_approved, v_total, true;
    RETURN;
  END IF;
  
  -- Still have pending approvals
  IF v_pending > 0 THEN
    RETURN QUERY SELECT false, 'Pending approvals'::VARCHAR, v_pending, v_approved, v_total, false;
    RETURN;
  END IF;
  
  -- All approved
  RETURN QUERY SELECT true, 'All approved'::VARCHAR, 0, v_approved, v_total, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;