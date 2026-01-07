-- ═══════════════════════════════════════════════════════════════════════════
-- DEFECTS MODULE: COMMENTS, ATTACHMENTS, HISTORY, LINKS TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Table: defect_comments
CREATE TABLE IF NOT EXISTS defect_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES tm_defects(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defect_comments_defect ON defect_comments(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_comments_created ON defect_comments(created_at DESC);

-- Auto-update timestamps for comments
CREATE TRIGGER update_defect_comments_updated_at
  BEFORE UPDATE ON defect_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE defect_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view defect comments" 
  ON defect_comments FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create comments" 
  ON defect_comments FOR INSERT 
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own comments" 
  ON defect_comments FOR UPDATE 
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own comments" 
  ON defect_comments FOR DELETE 
  USING (auth.uid() = author_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- Table: defect_attachments
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS defect_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES tm_defects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defect_attachments_defect ON defect_attachments(defect_id);

-- Enable RLS
ALTER TABLE defect_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view defect attachments" 
  ON defect_attachments FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can upload attachments" 
  ON defect_attachments FOR INSERT 
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders can delete their attachments" 
  ON defect_attachments FOR DELETE 
  USING (auth.uid() = uploaded_by);

-- ═══════════════════════════════════════════════════════════════════════════
-- Table: defect_history
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS defect_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES tm_defects(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_defect_history_defect ON defect_history(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_history_created ON defect_history(created_at DESC);

-- Enable RLS
ALTER TABLE defect_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view defect history" 
  ON defect_history FOR SELECT 
  USING (true);

CREATE POLICY "System can insert history" 
  ON defect_history FOR INSERT 
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- Table: defect_links
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS defect_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defect_id UUID NOT NULL REFERENCES tm_defects(id) ON DELETE CASCADE,
  linked_type VARCHAR(20) NOT NULL,
  linked_id UUID NOT NULL,
  link_type VARCHAR(30) NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(defect_id, linked_type, linked_id)
);

CREATE INDEX IF NOT EXISTS idx_defect_links_defect ON defect_links(defect_id);
CREATE INDEX IF NOT EXISTS idx_defect_links_linked ON defect_links(linked_type, linked_id);

-- Enable RLS
ALTER TABLE defect_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view defect links" 
  ON defect_links FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create links" 
  ON defect_links FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can delete links" 
  ON defect_links FOR DELETE 
  USING (auth.uid() = created_by);