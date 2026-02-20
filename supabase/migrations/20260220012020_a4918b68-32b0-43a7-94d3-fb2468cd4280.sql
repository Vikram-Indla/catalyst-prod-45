
-- ============================================================
-- ProjectHub Work Items — Schema Only Migration (v4)
-- ============================================================

-- Utility timestamp function
CREATE OR REPLACE FUNCTION ph_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Extend ph_work_items with new columns
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES ph_projects(id) ON DELETE CASCADE;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES ph_work_types(id);
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS status_id UUID REFERENCES ph_workflow_statuses(id);
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS sequence_num INTEGER;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS reporter_id UUID;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS sort_order REAL DEFAULT 0;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS time_estimate INTEGER;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0;
ALTER TABLE ph_work_items ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wi_project ON ph_work_items(project_id);
CREATE INDEX IF NOT EXISTS idx_wi_parent ON ph_work_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_wi_assignee ON ph_work_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_wi_status ON ph_work_items(status_id);
CREATE INDEX IF NOT EXISTS idx_wi_type ON ph_work_items(type_id);
CREATE INDEX IF NOT EXISTS idx_wi_priority ON ph_work_items(priority);
CREATE INDEX IF NOT EXISTS idx_wi_sort ON ph_work_items(project_id, sort_order);

-- Item key auto-gen trigger
CREATE OR REPLACE FUNCTION ph_generate_item_key()
RETURNS TRIGGER AS $$
DECLARE proj_key TEXT; next_seq INTEGER;
BEGIN
  IF NEW.project_id IS NULL THEN RETURN NEW; END IF;
  SELECT key INTO proj_key FROM ph_projects WHERE id = NEW.project_id;
  SELECT COALESCE(MAX(sequence_num), 0) + 1 INTO next_seq FROM ph_work_items WHERE project_id = NEW.project_id;
  NEW.sequence_num := next_seq;
  NEW.item_key := proj_key || '-' || next_seq;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_item_key ON ph_work_items;
CREATE TRIGGER trg_item_key BEFORE INSERT ON ph_work_items
  FOR EACH ROW WHEN (NEW.item_key IS NULL OR NEW.sequence_num IS NULL)
  EXECUTE FUNCTION ph_generate_item_key();

DROP TRIGGER IF EXISTS trg_wi_updated ON ph_work_items;
CREATE TRIGGER trg_wi_updated BEFORE UPDATE ON ph_work_items FOR EACH ROW EXECUTE FUNCTION ph_update_timestamp();

-- RLS for ph_work_items
ALTER TABLE ph_work_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view work items" ON ph_work_items;
CREATE POLICY "Members can view work items" ON ph_work_items FOR SELECT USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()) OR project_id IS NULL);
DROP POLICY IF EXISTS "Members can create work items" ON ph_work_items;
CREATE POLICY "Members can create work items" ON ph_work_items FOR INSERT WITH CHECK (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()) OR project_id IS NULL);
DROP POLICY IF EXISTS "Members can update work items" ON ph_work_items;
CREATE POLICY "Members can update work items" ON ph_work_items FOR UPDATE USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()) OR project_id IS NULL);
DROP POLICY IF EXISTS "Admins can delete work items" ON ph_work_items;
CREATE POLICY "Admins can delete work items" ON ph_work_items FOR DELETE USING (project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid() AND role = 'admin') OR project_id IS NULL);

-- ph_work_item_labels
CREATE TABLE IF NOT EXISTS ph_work_item_labels (
  work_item_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES ph_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (work_item_id, label_id)
);
ALTER TABLE ph_work_item_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage labels" ON ph_work_item_labels FOR ALL USING (work_item_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())));

-- ph_work_item_components
CREATE TABLE IF NOT EXISTS ph_work_item_components (
  work_item_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES ph_components(id) ON DELETE CASCADE,
  PRIMARY KEY (work_item_id, component_id)
);
ALTER TABLE ph_work_item_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage components" ON ph_work_item_components FOR ALL USING (work_item_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())));

-- Extend ph_comments (rename user_id → author_id)
ALTER TABLE ph_comments RENAME COLUMN user_id TO author_id;
DROP TRIGGER IF EXISTS trg_comment_updated ON ph_comments;
CREATE TRIGGER trg_comment_updated BEFORE UPDATE ON ph_comments FOR EACH ROW EXECUTE FUNCTION ph_update_timestamp();
CREATE INDEX IF NOT EXISTS idx_comments_wi ON ph_comments(work_item_id, created_at DESC);
ALTER TABLE ph_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view comments" ON ph_comments;
CREATE POLICY "Members can view comments" ON ph_comments FOR SELECT USING (work_item_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())));
DROP POLICY IF EXISTS "Members can create comments" ON ph_comments;
CREATE POLICY "Members can create comments" ON ph_comments FOR INSERT WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS "Authors can edit own comments" ON ph_comments;
CREATE POLICY "Authors can edit own comments" ON ph_comments FOR UPDATE USING (author_id = auth.uid());
DROP POLICY IF EXISTS "Authors can delete own comments" ON ph_comments;
CREATE POLICY "Authors can delete own comments" ON ph_comments FOR DELETE USING (author_id = auth.uid());

-- ph_comment_reactions
CREATE TABLE IF NOT EXISTS ph_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES ph_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_reaction UNIQUE (comment_id, user_id, emoji)
);
ALTER TABLE ph_comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage reactions" ON ph_comment_reactions FOR ALL USING (comment_id IN (SELECT id FROM ph_comments WHERE work_item_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid()))));

-- ph_activity_log
CREATE TABLE IF NOT EXISTS ph_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_wi ON ph_activity_log(work_item_id, created_at DESC);
ALTER TABLE ph_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view activity" ON ph_activity_log FOR SELECT USING (work_item_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())));
CREATE POLICY "System inserts activity" ON ph_activity_log FOR INSERT WITH CHECK (user_id = auth.uid());

-- ph_issue_links
CREATE TABLE IF NOT EXISTS ph_issue_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('blocks','is_blocked_by','relates_to','duplicates','is_duplicated_by','clones')),
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_link CHECK (source_id != target_id),
  CONSTRAINT unique_link UNIQUE (source_id, target_id, link_type)
);
ALTER TABLE ph_issue_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage links" ON ph_issue_links FOR ALL USING (source_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())));

-- ph_watchers
CREATE TABLE IF NOT EXISTS ph_watchers (
  work_item_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (work_item_id, user_id)
);
ALTER TABLE ph_watchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage watchers" ON ph_watchers FOR ALL USING (work_item_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())));

-- ph_attachments
CREATE TABLE IF NOT EXISTS ph_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL DEFAULT auth.uid(),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ph_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage attachments" ON ph_attachments FOR ALL USING (work_item_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())));

-- ph_acceptance_criteria
CREATE TABLE IF NOT EXISTS ph_acceptance_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES ph_work_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  sort_order REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ac_wi ON ph_acceptance_criteria(work_item_id, sort_order);
ALTER TABLE ph_acceptance_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage AC" ON ph_acceptance_criteria FOR ALL USING (work_item_id IN (SELECT id FROM ph_work_items WHERE project_id IN (SELECT project_id FROM ph_project_members WHERE user_id = auth.uid())));

-- ph_list_view_configs
CREATE TABLE IF NOT EXISTS ph_list_view_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES ph_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  columns JSONB NOT NULL DEFAULT '["type","key","summary","status","assignee","priority","due_date"]',
  sort_by TEXT DEFAULT 'created_at',
  sort_dir TEXT DEFAULT 'desc' CHECK (sort_dir IN ('asc','desc')),
  group_by TEXT,
  filters JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE ph_list_view_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own configs" ON ph_list_view_configs FOR ALL USING (user_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('work-item-attachments', 'work-item-attachments', false) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Members can upload attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'work-item-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Members can view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'work-item-attachments' AND auth.uid() IS NOT NULL);
CREATE POLICY "Uploaders can delete attachments" ON storage.objects FOR DELETE USING (bucket_id = 'work-item-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
