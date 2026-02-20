
-- ============================================================================
-- IDEATION MODULE — Schema, Triggers, Indexes, RLS, Views, Functions
-- ============================================================================

-- TABLE 1: ph_ideas
CREATE TABLE IF NOT EXISTS ph_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  idea_type TEXT NOT NULL DEFAULT 'Feature Request'
    CHECK (idea_type IN ('Problem', 'Opportunity', 'Feature Request', 'Solution', 'Improvement')),
  category TEXT,
  source TEXT NOT NULL DEFAULT 'Internal'
    CHECK (source IN ('Internal', 'Stakeholder', 'Customer Feedback', 'Research', 'Ministry Directive')),
  department TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Converted', 'Archived')),
  priority TEXT DEFAULT 'P3'
    CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  submitted_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  reach INTEGER DEFAULT 0 CHECK (reach >= 0 AND reach <= 10),
  impact INTEGER DEFAULT 0 CHECK (impact >= 0 AND impact <= 10),
  confidence NUMERIC(3,2) DEFAULT 0.50 CHECK (confidence >= 0 AND confidence <= 1.00),
  effort INTEGER DEFAULT 1 CHECK (effort >= 1 AND effort <= 10),
  rice_score NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN effort > 0 THEN (reach * impact * confidence) / effort ELSE 0 END
  ) STORED,
  business_value INTEGER DEFAULT 0 CHECK (business_value >= 0 AND business_value <= 10),
  time_criticality INTEGER DEFAULT 0 CHECK (time_criticality >= 0 AND time_criticality <= 10),
  risk_reduction INTEGER DEFAULT 0 CHECK (risk_reduction >= 0 AND risk_reduction <= 10),
  job_size INTEGER DEFAULT 1 CHECK (job_size >= 1 AND job_size <= 10),
  wsjf_score NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN job_size > 0 THEN (business_value + time_criticality + risk_reduction)::NUMERIC / job_size ELSE 0 END
  ) STORED,
  custom_score NUMERIC(10,2) DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  vote_score NUMERIC(10,2) DEFAULT 0,
  ai_summary TEXT,
  ai_category TEXT,
  ai_duplicate_ids UUID[] DEFAULT '{}',
  ai_enrichment_status TEXT DEFAULT 'pending'
    CHECK (ai_enrichment_status IN ('pending', 'processing', 'complete', 'failed')),
  ai_tags TEXT[] DEFAULT '{}',
  parent_idea_id UUID REFERENCES ph_ideas(id) ON DELETE SET NULL,
  linked_initiative_id UUID REFERENCES ph_initiatives(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  converted_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON COLUMN ph_ideas.idea_key IS 'Auto-generated sequential key in IDH-XXX format';
COMMENT ON COLUMN ph_ideas.rice_score IS 'Computed: (Reach × Impact × Confidence) / Effort';
COMMENT ON COLUMN ph_ideas.wsjf_score IS 'Computed: (Business Value + Time Criticality + Risk Reduction) / Job Size';
COMMENT ON COLUMN ph_ideas.vote_score IS 'Denormalized weighted vote sum from ph_idea_votes';
COMMENT ON COLUMN ph_ideas.ai_duplicate_ids IS 'Array of idea UUIDs flagged as potential duplicates by AI';
COMMENT ON COLUMN ph_ideas.linked_initiative_id IS 'FK to ph_initiatives — set when idea is converted or manually linked';

-- TABLE 6: ph_idea_audit_log (created before triggers that reference it)
CREATE TABLE IF NOT EXISTS ph_idea_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ph_ideas(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- AUTO-INCREMENT idea_key TRIGGER
CREATE OR REPLACE FUNCTION generate_idea_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(idea_key FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM ph_ideas;
  NEW.idea_key := 'IDH-' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_idea_key
  BEFORE INSERT ON ph_ideas
  FOR EACH ROW
  WHEN (NEW.idea_key IS NULL OR NEW.idea_key = '')
  EXECUTE FUNCTION generate_idea_key();

-- AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION update_idea_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_idea_timestamp
  BEFORE UPDATE ON ph_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_timestamp();

-- AUDIT LOG TRIGGER
CREATE OR REPLACE FUNCTION log_idea_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tracked_cols TEXT[] := ARRAY[
    'title', 'description', 'idea_type', 'category', 'source', 'department',
    'status', 'priority', 'assigned_to', 'reach', 'impact', 'confidence',
    'effort', 'business_value', 'time_criticality', 'risk_reduction', 'job_size',
    'custom_score', 'linked_initiative_id', 'parent_idea_id', 'is_deleted', 'tags'
  ];
  col TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO ph_idea_audit_log (idea_id, action, field_changed, old_value, new_value, changed_by)
    VALUES (NEW.id, 'CREATED', NULL, NULL, NEW.title, NEW.submitted_by);
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    FOREACH col IN ARRAY tracked_cols LOOP
      EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col, col)
        INTO old_val, new_val
        USING OLD, NEW;
      IF old_val IS DISTINCT FROM new_val THEN
        INSERT INTO ph_idea_audit_log (idea_id, action, field_changed, old_value, new_value, changed_by)
        VALUES (NEW.id, 'UPDATED', col, old_val, new_val, auth.uid());
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_log_idea_changes
  AFTER INSERT OR UPDATE ON ph_ideas
  FOR EACH ROW
  EXECUTE FUNCTION log_idea_changes();

-- TABLE 2: ph_idea_votes
CREATE TABLE IF NOT EXISTS ph_idea_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ph_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote_value INTEGER NOT NULL DEFAULT 1 CHECK (vote_value IN (-1, 1)),
  weight NUMERIC(3,1) DEFAULT 1.0 CHECK (weight >= 0.5 AND weight <= 3.0),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(idea_id, user_id)
);

COMMENT ON COLUMN ph_idea_votes.weight IS 'Vote weight: 1.0=standard, 2.0=senior stakeholder, 3.0=executive sponsor';

-- VOTE COUNTER TRIGGER
CREATE OR REPLACE FUNCTION update_idea_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_idea_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_idea_id := OLD.idea_id;
  ELSE
    target_idea_id := NEW.idea_id;
  END IF;
  UPDATE ph_ideas
  SET vote_count = (SELECT COUNT(*) FROM ph_idea_votes WHERE idea_id = target_idea_id),
      vote_score = (SELECT COALESCE(SUM(vote_value * weight), 0) FROM ph_idea_votes WHERE idea_id = target_idea_id)
  WHERE id = target_idea_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_idea_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON ph_idea_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_idea_vote_counts();

-- TABLE 3: ph_idea_comments
CREATE TABLE IF NOT EXISTS ph_idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ph_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  parent_comment_id UUID REFERENCES ph_idea_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON COLUMN ph_idea_comments.is_internal IS 'When true, comment is only visible to reviewers, not the original submitter';
COMMENT ON COLUMN ph_idea_comments.parent_comment_id IS 'Self-referencing FK for threaded replies';

-- TABLE 4: ph_idea_evidence
CREATE TABLE IF NOT EXISTS ph_idea_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ph_ideas(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'Research'
    CHECK (evidence_type IN (
      'Customer Quote', 'Support Ticket', 'Research', 'Analytics',
      'Ministry Directive', 'Market Data', 'Competitor Reference', 'User Interview'
    )),
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT,
  attached_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON COLUMN ph_idea_evidence.evidence_type IS 'Classification of supporting evidence attached to an idea';

-- TABLE 5: ph_idea_scores
CREATE TABLE IF NOT EXISTS ph_idea_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ph_ideas(id) ON DELETE CASCADE,
  framework TEXT NOT NULL DEFAULT 'RICE'
    CHECK (framework IN ('RICE', 'WSJF', 'Custom')),
  scored_by UUID REFERENCES auth.users(id),
  reach INTEGER DEFAULT 0,
  impact INTEGER DEFAULT 0,
  confidence NUMERIC(3,2) DEFAULT 0.50,
  effort INTEGER DEFAULT 1,
  business_value INTEGER DEFAULT 0,
  time_criticality INTEGER DEFAULT 0,
  risk_reduction INTEGER DEFAULT 0,
  job_size INTEGER DEFAULT 1,
  total_score NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON COLUMN ph_idea_scores.is_ai_generated IS 'True when score was suggested by AI Scoring Assistant (purple feature)';

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_ideas_status ON ph_ideas(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_type ON ph_ideas(idea_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_source ON ph_ideas(source) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_priority ON ph_ideas(priority) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_department ON ph_ideas(department) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_assigned_to ON ph_ideas(assigned_to) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_submitted_by ON ph_ideas(submitted_by) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_rice_score ON ph_ideas(rice_score DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_wsjf_score ON ph_ideas(wsjf_score DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_vote_score ON ph_ideas(vote_score DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_ideas_linked_initiative ON ph_ideas(linked_initiative_id) WHERE linked_initiative_id IS NOT NULL;
CREATE INDEX idx_ideas_parent ON ph_ideas(parent_idea_id) WHERE parent_idea_id IS NOT NULL;
CREATE INDEX idx_ideas_created_at ON ph_ideas(created_at DESC);
CREATE INDEX idx_ideas_key ON ph_ideas(idea_key);

CREATE INDEX idx_idea_votes_idea ON ph_idea_votes(idea_id);
CREATE INDEX idx_idea_votes_user ON ph_idea_votes(user_id);

CREATE INDEX idx_idea_comments_idea ON ph_idea_comments(idea_id);
CREATE INDEX idx_idea_comments_parent ON ph_idea_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

CREATE INDEX idx_idea_evidence_idea ON ph_idea_evidence(idea_id);
CREATE INDEX idx_idea_evidence_type ON ph_idea_evidence(evidence_type);

CREATE INDEX idx_idea_scores_idea ON ph_idea_scores(idea_id);
CREATE INDEX idx_idea_scores_framework ON ph_idea_scores(framework);

CREATE INDEX idx_idea_audit_idea ON ph_idea_audit_log(idea_id);
CREATE INDEX idx_idea_audit_action ON ph_idea_audit_log(action);
CREATE INDEX idx_idea_audit_created ON ph_idea_audit_log(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE ph_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_ideas_select" ON ph_ideas FOR SELECT TO authenticated USING (is_deleted = FALSE);
CREATE POLICY "ph_ideas_insert" ON ph_ideas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ph_ideas_update" ON ph_ideas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ph_ideas_delete" ON ph_ideas FOR DELETE TO authenticated USING (true);

ALTER TABLE ph_idea_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_idea_votes_select" ON ph_idea_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_idea_votes_insert" ON ph_idea_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ph_idea_votes_update" ON ph_idea_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ph_idea_votes_delete" ON ph_idea_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE ph_idea_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_idea_comments_select" ON ph_idea_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_idea_comments_insert" ON ph_idea_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ph_idea_comments_update" ON ph_idea_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ph_idea_comments_delete" ON ph_idea_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE ph_idea_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_idea_evidence_select" ON ph_idea_evidence FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_idea_evidence_insert" ON ph_idea_evidence FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ph_idea_evidence_update" ON ph_idea_evidence FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ph_idea_evidence_delete" ON ph_idea_evidence FOR DELETE TO authenticated USING (true);

ALTER TABLE ph_idea_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_idea_scores_select" ON ph_idea_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_idea_scores_insert" ON ph_idea_scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ph_idea_scores_update" ON ph_idea_scores FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ph_idea_scores_delete" ON ph_idea_scores FOR DELETE TO authenticated USING (true);

ALTER TABLE ph_idea_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ph_idea_audit_log_select" ON ph_idea_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "ph_idea_audit_log_insert" ON ph_idea_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- VIEWS (using profiles table instead of auth.users for security)
-- ============================================================================
CREATE OR REPLACE VIEW ph_ideas_listing AS
SELECT
  i.*,
  sp.full_name AS submitted_by_name,
  ap.full_name AS assigned_to_name,
  (SELECT COUNT(*) FROM ph_idea_comments c WHERE c.idea_id = i.id) AS comment_count,
  (SELECT COUNT(*) FROM ph_idea_evidence e WHERE e.idea_id = i.id) AS evidence_count,
  (SELECT COUNT(*) FROM ph_ideas child WHERE child.parent_idea_id = i.id AND child.is_deleted = FALSE) AS child_count,
  li.title AS linked_initiative_title,
  li.initiative_key AS linked_initiative_key
FROM ph_ideas i
LEFT JOIN profiles sp ON sp.id = i.submitted_by
LEFT JOIN profiles ap ON ap.id = i.assigned_to
LEFT JOIN ph_initiatives li ON li.id = i.linked_initiative_id
WHERE i.is_deleted = FALSE;

CREATE OR REPLACE VIEW ph_ideas_board AS
SELECT
  i.id, i.idea_key, i.title, i.description, i.idea_type, i.status, i.priority,
  i.category, i.department, i.rice_score, i.wsjf_score, i.vote_count, i.vote_score,
  i.assigned_to, ap.full_name AS assigned_to_name,
  i.ai_enrichment_status, i.tags, i.created_at, i.updated_at
FROM ph_ideas i
LEFT JOIN profiles ap ON ap.id = i.assigned_to
WHERE i.is_deleted = FALSE;

CREATE OR REPLACE VIEW ph_ideas_matrix AS
SELECT
  i.id, i.idea_key, i.title, i.idea_type, i.status, i.priority,
  i.impact, i.effort, i.confidence, i.rice_score, i.vote_score,
  i.category, i.department
FROM ph_ideas i
WHERE i.is_deleted = FALSE
  AND i.status NOT IN ('Draft', 'Archived', 'Rejected');

CREATE OR REPLACE VIEW ph_ideas_triage AS
SELECT
  i.id, i.idea_key, i.title, i.idea_type, i.source, i.priority, i.department,
  i.submitted_by, sp.full_name AS submitted_by_name,
  i.ai_category, i.ai_duplicate_ids, i.ai_summary, i.created_at,
  (SELECT COUNT(*) FROM ph_idea_evidence e WHERE e.idea_id = i.id) AS evidence_count
FROM ph_ideas i
LEFT JOIN profiles sp ON sp.id = i.submitted_by
WHERE i.status = 'Submitted' AND i.is_deleted = FALSE
ORDER BY
  CASE i.priority WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 END,
  i.created_at ASC;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================
CREATE OR REPLACE FUNCTION convert_idea_to_initiative(
  p_idea_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_idea RECORD;
  v_initiative_id UUID;
BEGIN
  SELECT * INTO v_idea FROM ph_ideas WHERE id = p_idea_id AND is_deleted = FALSE;
  IF v_idea IS NULL THEN RAISE EXCEPTION 'Idea not found or deleted: %', p_idea_id; END IF;
  IF v_idea.status = 'Converted' THEN RAISE EXCEPTION 'Idea already converted: %', p_idea_id; END IF;
  IF v_idea.status != 'Approved' THEN RAISE EXCEPTION 'Only approved ideas can be converted. Current status: %', v_idea.status; END IF;

  INSERT INTO ph_initiatives (title, description, status, department, priority, created_at)
  VALUES (
    v_idea.title,
    COALESCE(v_idea.ai_summary, v_idea.description, ''),
    'New Demand',
    v_idea.department,
    CASE v_idea.priority WHEN 'P1' THEN 5.0 WHEN 'P2' THEN 4.0 WHEN 'P3' THEN 3.0 WHEN 'P4' THEN 2.0 ELSE 3.0 END,
    now()
  )
  RETURNING id INTO v_initiative_id;

  UPDATE ph_ideas
  SET status = 'Converted', linked_initiative_id = v_initiative_id, converted_at = now(), converted_by = p_user_id
  WHERE id = p_idea_id;

  INSERT INTO ph_idea_audit_log (idea_id, action, field_changed, old_value, new_value, changed_by)
  VALUES (p_idea_id, 'CONVERTED', 'linked_initiative_id', NULL, v_initiative_id::TEXT, p_user_id);

  RETURN v_initiative_id;
END;
$$;

CREATE OR REPLACE FUNCTION merge_ideas(
  p_target_id UUID,
  p_source_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ph_idea_evidence SET idea_id = p_target_id WHERE idea_id = p_source_id;
  UPDATE ph_idea_comments SET idea_id = p_target_id WHERE idea_id = p_source_id;
  UPDATE ph_ideas SET parent_idea_id = p_target_id WHERE parent_idea_id = p_source_id;
  DELETE FROM ph_idea_votes WHERE idea_id = p_source_id AND user_id IN (SELECT user_id FROM ph_idea_votes WHERE idea_id = p_target_id);
  UPDATE ph_idea_votes SET idea_id = p_target_id WHERE idea_id = p_source_id;
  UPDATE ph_ideas SET status = 'Archived', is_deleted = TRUE, updated_at = now() WHERE id = p_source_id;
  INSERT INTO ph_idea_audit_log (idea_id, action, field_changed, old_value, new_value, changed_by)
  VALUES
    (p_target_id, 'MERGED', 'merged_from', NULL, p_source_id::TEXT, p_user_id),
    (p_source_id, 'MERGED', 'merged_into', NULL, p_target_id::TEXT, p_user_id);
END;
$$;
