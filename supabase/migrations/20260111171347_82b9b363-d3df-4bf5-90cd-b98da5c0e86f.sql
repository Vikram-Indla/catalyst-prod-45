-- =====================================================
-- IMPROVEMENT IDEAS MODULE - SCHEMA FIXES
-- Based on QA Audit Checklist
-- =====================================================

-- 1. Add missing enum values to improvement_idea_status
ALTER TYPE improvement_idea_status ADD VALUE IF NOT EXISTS 'triaged';
ALTER TYPE improvement_idea_status ADD VALUE IF NOT EXISTS 'quick_win_approved';
ALTER TYPE improvement_idea_status ADD VALUE IF NOT EXISTS 'linked';

-- 2. Add missing enum values to improvement_initiative_status
ALTER TYPE improvement_initiative_status ADD VALUE IF NOT EXISTS 'validated';
ALTER TYPE improvement_initiative_status ADD VALUE IF NOT EXISTS 'converted';

-- 3. Create idea_type enum if not exists
DO $$ BEGIN
  CREATE TYPE improvement_idea_type AS ENUM ('standard', 'quick_win', 'strategic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Add missing columns to improvement_ideas table
ALTER TABLE improvement_ideas 
  ADD COLUMN IF NOT EXISTS idea_type improvement_idea_type DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS triaged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS triaged_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS triage_notes TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_type improvement_idea_type,
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS business_request_id UUID REFERENCES business_requests(id);

-- 5. Add missing columns to improvement_initiatives table
ALTER TABLE improvement_initiatives
  ADD COLUMN IF NOT EXISTS business_request_id UUID REFERENCES business_requests(id),
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS conversion_notes TEXT,
  ADD COLUMN IF NOT EXISTS ideas_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_impact_score DECIMAL(5,2) DEFAULT 0;

-- 6. Create idea_status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS idea_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  from_status improvement_idea_status,
  to_status improvement_idea_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on idea_status_history
ALTER TABLE idea_status_history ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing status history
CREATE POLICY "View idea status history" ON idea_status_history
  FOR SELECT USING (true);

-- Create policy for inserting status history
CREATE POLICY "Insert idea status history" ON idea_status_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Create tags table if not exists
CREATE TABLE IF NOT EXISTS idea_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  name_ar VARCHAR(50),
  color VARCHAR(20) DEFAULT '#6B7280',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name)
);

-- Enable RLS on idea_tags
ALTER TABLE idea_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View idea tags" ON idea_tags
  FOR SELECT USING (true);

CREATE POLICY "Manage idea tags" ON idea_tags
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. Create idea_tag_assignments junction table if not exists
CREATE TABLE IF NOT EXISTS idea_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES idea_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(idea_id, tag_id)
);

-- Enable RLS on idea_tag_assignments
ALTER TABLE idea_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View idea tag assignments" ON idea_tag_assignments
  FOR SELECT USING (true);

CREATE POLICY "Manage idea tag assignments" ON idea_tag_assignments
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 9. Create function to track status changes
CREATE OR REPLACE FUNCTION track_idea_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO idea_status_history (idea_id, from_status, to_status, changed_by, metadata)
    VALUES (
      NEW.id, 
      OLD.status, 
      NEW.status, 
      auth.uid(),
      jsonb_build_object(
        'idea_type', NEW.idea_type,
        'initiative_id', NEW.initiative_id,
        'business_request_id', NEW.business_request_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status tracking
DROP TRIGGER IF EXISTS track_idea_status_change_trigger ON improvement_ideas;
CREATE TRIGGER track_idea_status_change_trigger
  AFTER UPDATE ON improvement_ideas
  FOR EACH ROW
  EXECUTE FUNCTION track_idea_status_change();

-- 10. Create function to update initiative stats
CREATE OR REPLACE FUNCTION update_initiative_stats()
RETURNS TRIGGER AS $$
DECLARE
  init_id UUID;
BEGIN
  -- Get the initiative ID from the appropriate row
  init_id := COALESCE(NEW.initiative_id, OLD.initiative_id);
  
  IF init_id IS NOT NULL THEN
    UPDATE improvement_initiatives
    SET 
      ideas_count = (SELECT COUNT(*) FROM improvement_ideas WHERE initiative_id = init_id AND deleted_at IS NULL),
      total_votes = (SELECT COALESCE(SUM(total_votes), 0) FROM improvement_ideas WHERE initiative_id = init_id AND deleted_at IS NULL),
      avg_impact_score = (
        SELECT COALESCE(AVG(is2.calculated_score), 0)
        FROM improvement_ideas ii
        LEFT JOIN impact_scores is2 ON is2.idea_id = ii.id AND is2.is_current = true
        WHERE ii.initiative_id = init_id AND ii.deleted_at IS NULL
      ),
      updated_at = now()
    WHERE id = init_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for initiative stats
DROP TRIGGER IF EXISTS update_initiative_stats_on_idea_change ON improvement_ideas;
CREATE TRIGGER update_initiative_stats_on_idea_change
  AFTER INSERT OR UPDATE OR DELETE ON improvement_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_initiative_stats();

-- 11. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE idea_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE idea_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE idea_tag_assignments;

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_idea_status_history_idea_id ON idea_status_history(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_tag_assignments_idea_id ON idea_tag_assignments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_tag_assignments_tag_id ON idea_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_improvement_ideas_idea_type ON improvement_ideas(idea_type);
CREATE INDEX IF NOT EXISTS idx_improvement_ideas_status ON improvement_ideas(status);
CREATE INDEX IF NOT EXISTS idx_improvement_ideas_initiative_id ON improvement_ideas(initiative_id);