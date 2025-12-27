-- ============================================
-- EFD WIZARD SESSIONS
-- ============================================
CREATE TABLE efd_wizard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Wizard State
  current_step INTEGER DEFAULT 0 CHECK (current_step >= 0 AND current_step <= 10),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'published')),
  
  -- Configuration
  theme_id UUID REFERENCES strategic_themes(id),
  business_request_id UUID REFERENCES business_requests(id),
  
  -- Text Input
  text_input TEXT,
  text_word_count INTEGER DEFAULT 0,
  
  -- Approval
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Publishing
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  is_pushed_to_catalyst BOOLEAN DEFAULT FALSE,
  pushed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_saved_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE efd_wizard_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view sessions" ON efd_wizard_sessions
  FOR SELECT USING (true);

CREATE POLICY "Users can create sessions" ON efd_wizard_sessions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own sessions" ON efd_wizard_sessions
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own sessions" ON efd_wizard_sessions
  FOR DELETE USING (created_by = auth.uid());

-- ============================================
-- EFD DOCUMENTS
-- ============================================
CREATE TABLE efd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES efd_wizard_sessions(id) ON DELETE CASCADE,
  
  -- File Info
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
  mime_type TEXT NOT NULL,
  
  -- Parsed Content
  page_count INTEGER,
  extracted_text TEXT,
  is_parsed BOOLEAN DEFAULT FALSE,
  parsed_at TIMESTAMPTZ,
  
  -- Metadata
  upload_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_efd_documents_session ON efd_documents(session_id);

ALTER TABLE efd_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage documents through session" ON efd_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM efd_wizard_sessions WHERE id = session_id AND created_by = auth.uid())
  );

-- ============================================
-- EFD EPICS (create before atoms for FK reference)
-- ============================================
CREATE TABLE efd_epics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES efd_wizard_sessions(id) ON DELETE CASCADE,
  
  -- Epic Identity
  epic_key TEXT NOT NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  
  -- SAFe Portfolio Kanban State
  state TEXT DEFAULT 'Funnel' CHECK (state IN ('Funnel', 'Analyzing', 'Portfolio Backlog', 'Implementing', 'Done')),
  
  -- Sizing
  size TEXT CHECK (size IN ('XS', 'S', 'M', 'L', 'XL')),
  
  -- Lean Business Case
  lbc_hypothesis TEXT,
  lbc_business_outcome TEXT,
  lbc_leading_indicators TEXT,
  lbc_nfrs TEXT,
  
  -- WSJF Scoring
  wsjf_business_value INTEGER CHECK (wsjf_business_value >= 1 AND wsjf_business_value <= 21),
  wsjf_time_criticality INTEGER CHECK (wsjf_time_criticality >= 1 AND wsjf_time_criticality <= 21),
  wsjf_risk_reduction INTEGER CHECK (wsjf_risk_reduction >= 1 AND wsjf_risk_reduction <= 21),
  wsjf_job_size INTEGER CHECK (wsjf_job_size >= 1 AND wsjf_job_size <= 21),
  
  -- MVP Definition
  mvp_definition TEXT,
  
  -- Ownership
  reporter_id UUID REFERENCES auth.users(id),
  assignee_id UUID REFERENCES auth.users(id),
  
  -- Selection for Feature Generation
  is_selected_for_features BOOLEAN DEFAULT FALSE,
  
  -- Catalyst Integration
  catalyst_epic_id UUID REFERENCES epics(id),
  is_synced_to_catalyst BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, epic_key)
);

CREATE INDEX idx_efd_epics_session ON efd_epics(session_id);

ALTER TABLE efd_epics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage epics through session" ON efd_epics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM efd_wizard_sessions WHERE id = session_id AND created_by = auth.uid())
  );

-- ============================================
-- EFD FEATURES
-- ============================================
CREATE TABLE efd_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES efd_wizard_sessions(id) ON DELETE CASCADE,
  epic_id UUID NOT NULL REFERENCES efd_epics(id) ON DELETE CASCADE,
  
  -- Feature Identity
  feature_key TEXT NOT NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  
  -- SAFe Feature State
  state TEXT DEFAULT 'Defined' CHECK (state IN ('Defined', 'In Progress', 'Done')),
  
  -- Planning
  program_increment TEXT,
  target_sprint TEXT,
  
  -- Benefit Hypothesis
  benefit_hypothesis TEXT,
  
  -- Acceptance Criteria
  acceptance_criteria TEXT,
  
  -- Ownership
  assignee_id UUID REFERENCES auth.users(id),
  
  -- Catalyst Integration
  catalyst_feature_id UUID REFERENCES features(id),
  is_synced_to_catalyst BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, feature_key)
);

CREATE INDEX idx_efd_features_session ON efd_features(session_id);
CREATE INDEX idx_efd_features_epic ON efd_features(epic_id);

ALTER TABLE efd_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage features through session" ON efd_features
  FOR ALL USING (
    EXISTS (SELECT 1 FROM efd_wizard_sessions WHERE id = session_id AND created_by = auth.uid())
  );

-- ============================================
-- EFD ATOMS (Requirement Atoms)
-- ============================================
CREATE TABLE efd_atoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES efd_wizard_sessions(id) ON DELETE CASCADE,
  
  -- Atom Identity
  atom_key TEXT NOT NULL,
  
  -- Content
  text TEXT NOT NULL,
  text_ar TEXT,
  
  -- Classification
  type TEXT NOT NULL CHECK (type IN ('FR', 'NFR')),
  nfr_type TEXT CHECK (nfr_type IN ('Performance', 'Security', 'Scalability', 'Usability', 'Accessibility', 'Compliance', 'Integration', 'Other')),
  priority TEXT NOT NULL CHECK (priority IN ('Must', 'Should', 'Could', 'Wont')),
  complexity TEXT CHECK (complexity IN ('Low', 'Medium', 'High')),
  
  -- Source Tracking
  source_document_id UUID REFERENCES efd_documents(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('document', 'text_input')),
  source_page INTEGER,
  source_paragraph INTEGER,
  trace_anchor TEXT,
  
  -- AI Metadata
  ai_suggested BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_suggested_feature TEXT,
  ai_accepted BOOLEAN,
  ai_rejected BOOLEAN,
  
  -- Status
  status TEXT DEFAULT 'unmapped' CHECK (status IN ('unmapped', 'mapped', 'excluded')),
  mapped_to_feature_id UUID REFERENCES efd_features(id),
  
  -- Exclusion
  is_excluded BOOLEAN DEFAULT FALSE,
  exclude_reason TEXT CHECK (exclude_reason IN ('duplicate', 'out_of_scope', 'not_requirement', 'deferred', 'other')),
  exclude_detail TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, atom_key)
);

CREATE INDEX idx_efd_atoms_session ON efd_atoms(session_id);
CREATE INDEX idx_efd_atoms_status ON efd_atoms(status);

ALTER TABLE efd_atoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage atoms through session" ON efd_atoms
  FOR ALL USING (
    EXISTS (SELECT 1 FROM efd_wizard_sessions WHERE id = session_id AND created_by = auth.uid())
  );

-- ============================================
-- EFD TRACE LINKS
-- ============================================
CREATE TABLE efd_trace_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES efd_wizard_sessions(id) ON DELETE CASCADE,
  
  -- Source
  source_type TEXT NOT NULL CHECK (source_type IN ('theme', 'business_request', 'epic', 'feature', 'atom', 'document')),
  source_id UUID NOT NULL,
  
  -- Target
  target_type TEXT NOT NULL CHECK (target_type IN ('theme', 'business_request', 'epic', 'feature', 'atom', 'story')),
  target_id UUID NOT NULL,
  
  -- Link Metadata
  link_type TEXT DEFAULT 'derives' CHECK (link_type IN ('derives', 'implements', 'tests', 'refines', 'traces')),
  direction TEXT DEFAULT 'forward' CHECK (direction IN ('forward', 'backward', 'bidirectional')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspect', 'deleted')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(session_id, source_type, source_id, target_type, target_id)
);

CREATE INDEX idx_efd_trace_source ON efd_trace_links(source_type, source_id);
CREATE INDEX idx_efd_trace_target ON efd_trace_links(target_type, target_id);

ALTER TABLE efd_trace_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage trace links through session" ON efd_trace_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM efd_wizard_sessions WHERE id = session_id AND created_by = auth.uid())
  );

-- ============================================
-- EFD AUDIT LOG
-- ============================================
CREATE TABLE efd_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES efd_wizard_sessions(id) ON DELETE CASCADE,
  
  -- Action
  action TEXT NOT NULL,
  detail TEXT,
  
  -- Actor
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_efd_audit_session ON efd_audit_log(session_id);
CREATE INDEX idx_efd_audit_time ON efd_audit_log(created_at DESC);

ALTER TABLE efd_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs through session" ON efd_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM efd_wizard_sessions WHERE id = session_id AND created_by = auth.uid())
  );

CREATE POLICY "Users can create audit logs" ON efd_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM efd_wizard_sessions WHERE id = session_id AND created_by = auth.uid())
  );

-- ============================================
-- AUTO-UPDATE TRIGGERS
-- ============================================
CREATE TRIGGER efd_sessions_updated_at
  BEFORE UPDATE ON efd_wizard_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER efd_atoms_updated_at
  BEFORE UPDATE ON efd_atoms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER efd_epics_updated_at
  BEFORE UPDATE ON efd_epics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER efd_features_updated_at
  BEFORE UPDATE ON efd_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE efd_wizard_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE efd_atoms;
ALTER PUBLICATION supabase_realtime ADD TABLE efd_epics;
ALTER PUBLICATION supabase_realtime ADD TABLE efd_features;