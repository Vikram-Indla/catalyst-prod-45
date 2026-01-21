-- =====================================================
-- Module 5B-3: Stakeholder Sign-off Workflow
-- Tables and functions for release approval workflow
-- =====================================================

-- 1. Stakeholder sign-off requests
CREATE TABLE IF NOT EXISTS tm_release_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  stakeholder_id UUID NOT NULL REFERENCES profiles(id),
  stakeholder_role TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  requested_by UUID REFERENCES profiles(id),
  decision TEXT CHECK (decision IN ('pending', 'approve', 'reject', 'abstain')) DEFAULT 'pending',
  comments TEXT,
  decided_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  is_required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  UNIQUE(release_id, stakeholder_id)
);

-- 2. Sign-off templates for reuse
CREATE TABLE IF NOT EXISTS tm_signoff_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  roles JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE tm_release_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tm_signoff_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for signoffs
CREATE POLICY "Users can view signoffs" ON tm_release_signoffs
  FOR SELECT USING (true);

CREATE POLICY "Users can manage signoffs" ON tm_release_signoffs
  FOR ALL USING (true);

-- RLS Policies for templates
CREATE POLICY "Users can view templates" ON tm_signoff_templates
  FOR SELECT USING (true);

CREATE POLICY "Users can manage templates" ON tm_signoff_templates
  FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signoffs_release ON tm_release_signoffs(release_id);
CREATE INDEX IF NOT EXISTS idx_signoffs_stakeholder ON tm_release_signoffs(stakeholder_id);
CREATE INDEX IF NOT EXISTS idx_signoffs_decision ON tm_release_signoffs(decision);

-- 3. RPC: Get sign-off status for a release
CREATE OR REPLACE FUNCTION tm_get_release_signoff_status(p_release_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
  v_signoffs JSONB;
  v_summary JSONB;
BEGIN
  -- Get all signoffs with stakeholder info
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'stakeholder_id', s.stakeholder_id,
      'stakeholder_name', COALESCE(p.display_name, p.email, 'Unknown'),
      'stakeholder_email', p.email,
      'stakeholder_role', s.stakeholder_role,
      'decision', s.decision,
      'comments', s.comments,
      'requested_at', s.requested_at,
      'decided_at', s.decided_at,
      'is_required', s.is_required
    ) ORDER BY s.sort_order, s.requested_at
  ), '[]'::jsonb)
  INTO v_signoffs
  FROM tm_release_signoffs s
  LEFT JOIN profiles p ON p.id = s.stakeholder_id
  WHERE s.release_id = p_release_id;
  
  -- Calculate summary
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE decision = 'pending'),
    'approved', COUNT(*) FILTER (WHERE decision = 'approve'),
    'rejected', COUNT(*) FILTER (WHERE decision = 'reject'),
    'abstained', COUNT(*) FILTER (WHERE decision = 'abstain'),
    'required_total', COUNT(*) FILTER (WHERE is_required = true),
    'required_approved', COUNT(*) FILTER (WHERE is_required = true AND decision = 'approve'),
    'all_required_approved', 
      COUNT(*) FILTER (WHERE is_required = true) = COUNT(*) FILTER (WHERE is_required = true AND decision = 'approve'),
    'has_rejections', COUNT(*) FILTER (WHERE decision = 'reject') > 0
  )
  INTO v_summary
  FROM tm_release_signoffs
  WHERE release_id = p_release_id;
  
  RETURN jsonb_build_object(
    'release_id', p_release_id,
    'signoffs', v_signoffs,
    'summary', v_summary
  );
END;
$$;

-- 4. RPC: Request sign-off from stakeholder
CREATE OR REPLACE FUNCTION tm_request_signoff(
  p_release_id UUID,
  p_stakeholder_id UUID,
  p_stakeholder_role TEXT,
  p_requested_by UUID DEFAULT NULL,
  p_is_required BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_signoff_id UUID;
  v_sort_order INTEGER;
BEGIN
  -- Get next sort order
  SELECT COALESCE(MAX(sort_order), 0) + 1
  INTO v_sort_order
  FROM tm_release_signoffs
  WHERE release_id = p_release_id;
  
  -- Insert or update signoff request
  INSERT INTO tm_release_signoffs (
    release_id, stakeholder_id, stakeholder_role, 
    requested_by, is_required, sort_order
  )
  VALUES (
    p_release_id, p_stakeholder_id, p_stakeholder_role,
    p_requested_by, p_is_required, v_sort_order
  )
  ON CONFLICT (release_id, stakeholder_id) DO UPDATE SET
    stakeholder_role = EXCLUDED.stakeholder_role,
    is_required = EXCLUDED.is_required,
    decision = 'pending',
    decided_at = NULL,
    comments = NULL
  RETURNING id INTO v_signoff_id;
  
  RETURN v_signoff_id;
END;
$$;

-- 5. RPC: Submit sign-off decision
CREATE OR REPLACE FUNCTION tm_submit_signoff_decision(
  p_signoff_id UUID,
  p_stakeholder_id UUID,
  p_decision TEXT,
  p_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Verify stakeholder matches
  IF NOT EXISTS (
    SELECT 1 FROM tm_release_signoffs 
    WHERE id = p_signoff_id AND stakeholder_id = p_stakeholder_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to submit this sign-off';
  END IF;
  
  -- Update decision
  UPDATE tm_release_signoffs SET
    decision = p_decision,
    comments = p_comments,
    decided_at = now()
  WHERE id = p_signoff_id;
  
  RETURN true;
END;
$$;

-- 6. RPC: Apply sign-off template to release
CREATE OR REPLACE FUNCTION tm_apply_signoff_template(
  p_release_id UUID,
  p_template_id UUID,
  p_requested_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_roles JSONB;
  v_role JSONB;
  v_count INTEGER := 0;
BEGIN
  -- Get template roles
  SELECT roles INTO v_roles
  FROM tm_signoff_templates
  WHERE id = p_template_id;
  
  IF v_roles IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Create signoff requests for each role
  FOR v_role IN SELECT * FROM jsonb_array_elements(v_roles)
  LOOP
    -- Find users with matching role or create placeholder
    INSERT INTO tm_release_signoffs (
      release_id, stakeholder_id, stakeholder_role, 
      requested_by, is_required, sort_order
    )
    SELECT 
      p_release_id,
      p.id,
      v_role->>'role',
      p_requested_by,
      COALESCE((v_role->>'is_required')::boolean, true),
      COALESCE((v_role->>'sort_order')::integer, v_count)
    FROM profiles p
    WHERE p.role = v_role->>'role'
    LIMIT 1
    ON CONFLICT (release_id, stakeholder_id) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;