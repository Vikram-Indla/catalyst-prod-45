-- ============================================================
-- IMPROVEMENT IDEAS MODULE - COMPLETE SCHEMA
-- Using unique enum names to avoid conflicts with existing types
-- ============================================================

-- ENUMS (with unique names)
DO $$ BEGIN CREATE TYPE improvement_initiative_status AS ENUM ('draft', 'active', 'collecting', 'evaluating', 'closed', 'archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE improvement_visibility AS ENUM ('internal', 'external', 'both'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE improvement_voting_type AS ENUM ('simple', 'weighted', 'token'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE improvement_idea_status AS ENUM ('draft', 'submitted', 'under_review', 'scoring', 'approved', 'rejected', 'deferred', 'converted', 'archived'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE improvement_submitter_type AS ENUM ('employee', 'investor', 'partner', 'public'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE improvement_vote_type AS ENUM ('for', 'against'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE improvement_idea_category AS ENUM ('licensing_improvement', 'compliance_automation', 'investor_experience', 'process_optimization', 'digital_service', 'integration', 'data_quality', 'accessibility', 'security_enhancement', 'reporting_analytics', 'mobile_capability', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================
-- IMPROVEMENT INITIATIVES (Campaigns)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.improvement_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE,
  title VARCHAR(200) NOT NULL,
  title_ar VARCHAR(200),
  description TEXT,
  description_ar TEXT,
  status improvement_initiative_status DEFAULT 'draft',
  visibility improvement_visibility DEFAULT 'internal',
  voting_type improvement_voting_type DEFAULT 'simple',
  start_date DATE,
  end_date DATE,
  owner_id UUID REFERENCES auth.users(id),
  product_id UUID REFERENCES products(id),
  settings JSONB DEFAULT '{"require_arabic": true, "allow_anonymous": false, "moderation_required": true, "max_ideas_per_user": 10, "voting_enabled": true, "comments_enabled": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- IMPROVEMENT IDEAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.improvement_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE,
  initiative_id UUID REFERENCES improvement_initiatives(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  title_ar VARCHAR(200),
  description TEXT NOT NULL,
  description_ar TEXT,
  category improvement_idea_category NOT NULL DEFAULT 'other',
  status improvement_idea_status DEFAULT 'draft',
  submitter_id UUID REFERENCES auth.users(id),
  submitter_type improvement_submitter_type DEFAULT 'employee',
  submitter_name VARCHAR(100),
  submitter_email VARCHAR(255),
  is_anonymous BOOLEAN DEFAULT false,
  for_votes INTEGER DEFAULT 0,
  against_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  ai_category improvement_idea_category,
  ai_compliance_tags TEXT[] DEFAULT '{}',
  ai_v2030_mapping UUID[] DEFAULT '{}',
  ai_duplicate_ids UUID[] DEFAULT '{}',
  ai_summary TEXT,
  ai_summary_ar TEXT,
  converted_to_br_id UUID,
  converted_at TIMESTAMPTZ,
  converted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- IMPACT SCORES (IMPACT Framework)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.impact_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  imperative INTEGER CHECK (imperative BETWEEN 1 AND 5),
  ministry_efficiency INTEGER CHECK (ministry_efficiency BETWEEN 1 AND 5),
  pain_severity INTEGER CHECK (pain_severity BETWEEN 1 AND 5),
  alignment INTEGER CHECK (alignment BETWEEN 1 AND 5),
  complexity INTEGER CHECK (complexity BETWEEN 1 AND 5),
  timeframe INTEGER CHECK (timeframe BETWEEN 1 AND 5),
  calculated_score DECIMAL(3,2),
  justification TEXT,
  scored_by UUID REFERENCES auth.users(id),
  ai_assisted BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IMPACT calculation function
CREATE OR REPLACE FUNCTION public.calculate_impact_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.calculated_score := ROUND(
    (COALESCE(NEW.imperative, 0) * 0.25) +
    (COALESCE(NEW.ministry_efficiency, 0) * 0.15) +
    (COALESCE(NEW.pain_severity, 0) * 0.20) +
    (COALESCE(NEW.alignment, 0) * 0.20) +
    (COALESCE(NEW.complexity, 0) * 0.10) +
    (COALESCE(NEW.timeframe, 0) * 0.10)
  , 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_impact ON public.impact_scores;
CREATE TRIGGER auto_calculate_impact
  BEFORE INSERT OR UPDATE ON public.impact_scores
  FOR EACH ROW EXECUTE FUNCTION calculate_impact_score();

-- ============================================================
-- IDEA VOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.idea_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  vote_type improvement_vote_type NOT NULL,
  importance_rating INTEGER CHECK (importance_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(idea_id, user_id)
);

-- Update vote tallies trigger
CREATE OR REPLACE FUNCTION public.update_idea_vote_tallies()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE improvement_ideas SET
    for_votes = (SELECT COUNT(*) FROM idea_votes WHERE idea_id = COALESCE(NEW.idea_id, OLD.idea_id) AND vote_type = 'for'),
    against_votes = (SELECT COUNT(*) FROM idea_votes WHERE idea_id = COALESCE(NEW.idea_id, OLD.idea_id) AND vote_type = 'against'),
    total_votes = (SELECT COUNT(*) FROM idea_votes WHERE idea_id = COALESCE(NEW.idea_id, OLD.idea_id))
  WHERE id = COALESCE(NEW.idea_id, OLD.idea_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vote_tallies ON public.idea_votes;
CREATE TRIGGER trigger_update_vote_tallies
  AFTER INSERT OR UPDATE OR DELETE ON public.idea_votes
  FOR EACH ROW EXECUTE FUNCTION update_idea_vote_tallies();

-- ============================================================
-- IDEA COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  parent_id UUID REFERENCES idea_comments(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.idea_tags_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  name_ar VARCHAR(50),
  color VARCHAR(7) DEFAULT '#6b7280',
  usage_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.idea_tag_links (
  idea_id UUID REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES idea_tags_master(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, tag_id)
);

-- ============================================================
-- IDEA ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.idea_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- IDEA DUPLICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.idea_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_idea_id UUID REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  duplicate_idea_id UUID REFERENCES improvement_ideas(id) ON DELETE CASCADE,
  similarity_score DECIMAL(3,2),
  is_confirmed BOOLEAN,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(source_idea_id, duplicate_idea_id)
);

-- ============================================================
-- INITIATIVE MODERATORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.initiative_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID REFERENCES improvement_initiatives(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role VARCHAR(20) DEFAULT 'moderator' CHECK (role IN ('owner', 'moderator', 'scorer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(initiative_id, user_id)
);

-- ============================================================
-- CODE GENERATION FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_improvement_initiative_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 10 FOR 3) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM improvement_initiatives
  WHERE code LIKE 'INIT-' || year_str || '-%';
  NEW.code := 'INIT-' || year_str || '-' || LPAD(seq_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_improvement_initiative_code ON improvement_initiatives;
CREATE TRIGGER trigger_generate_improvement_initiative_code
  BEFORE INSERT ON improvement_initiatives
  FOR EACH ROW WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION generate_improvement_initiative_code();

CREATE OR REPLACE FUNCTION public.generate_improvement_idea_code()
RETURNS TRIGGER AS $$
DECLARE
  year_str VARCHAR(4);
  seq_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 10 FOR 5) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM improvement_ideas
  WHERE code LIKE 'IDEA-' || year_str || '-%';
  NEW.code := 'IDEA-' || year_str || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_improvement_idea_code ON improvement_ideas;
CREATE TRIGGER trigger_generate_improvement_idea_code
  BEFORE INSERT ON improvement_ideas
  FOR EACH ROW WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION generate_improvement_idea_code();

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE improvement_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE improvement_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_tags_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_moderators ENABLE ROW LEVEL SECURITY;

-- Policies for improvement_initiatives
DROP POLICY IF EXISTS "View active improvement initiatives" ON improvement_initiatives;
CREATE POLICY "View active improvement initiatives" ON improvement_initiatives
  FOR SELECT USING (status IN ('active', 'collecting', 'evaluating') OR owner_id = auth.uid());

DROP POLICY IF EXISTS "Manage own improvement initiatives" ON improvement_initiatives;
CREATE POLICY "Manage own improvement initiatives" ON improvement_initiatives
  FOR ALL USING (owner_id = auth.uid());

-- Policies for improvement_ideas
DROP POLICY IF EXISTS "View improvement ideas" ON improvement_ideas;
CREATE POLICY "View improvement ideas" ON improvement_ideas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM improvement_initiatives i WHERE i.id = initiative_id AND i.status != 'draft')
    OR submitter_id = auth.uid()
  );

DROP POLICY IF EXISTS "Submit improvement ideas" ON improvement_ideas;
CREATE POLICY "Submit improvement ideas" ON improvement_ideas
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM improvement_initiatives i WHERE i.id = initiative_id AND i.status = 'collecting')
    OR submitter_id = auth.uid()
  );

DROP POLICY IF EXISTS "Update own improvement ideas" ON improvement_ideas;
CREATE POLICY "Update own improvement ideas" ON improvement_ideas
  FOR UPDATE USING (submitter_id = auth.uid());

-- Impact scores policies
DROP POLICY IF EXISTS "View impact scores" ON impact_scores;
CREATE POLICY "View impact scores" ON impact_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Create impact scores" ON impact_scores;
CREATE POLICY "Create impact scores" ON impact_scores FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Update own scores" ON impact_scores;
CREATE POLICY "Update own scores" ON impact_scores FOR UPDATE USING (scored_by = auth.uid());

-- Vote policies
DROP POLICY IF EXISTS "Cast idea votes" ON idea_votes;
CREATE POLICY "Cast idea votes" ON idea_votes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "View idea votes" ON idea_votes;
CREATE POLICY "View idea votes" ON idea_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Update own idea votes" ON idea_votes;
CREATE POLICY "Update own idea votes" ON idea_votes FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Delete own idea votes" ON idea_votes;
CREATE POLICY "Delete own idea votes" ON idea_votes FOR DELETE USING (user_id = auth.uid());

-- Comment policies
DROP POLICY IF EXISTS "View idea comments" ON idea_comments;
CREATE POLICY "View idea comments" ON idea_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Create idea comments" ON idea_comments;
CREATE POLICY "Create idea comments" ON idea_comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Update own idea comments" ON idea_comments;
CREATE POLICY "Update own idea comments" ON idea_comments FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Delete own idea comments" ON idea_comments;
CREATE POLICY "Delete own idea comments" ON idea_comments FOR DELETE USING (user_id = auth.uid());

-- Tags policies
DROP POLICY IF EXISTS "View idea tags" ON idea_tags_master;
CREATE POLICY "View idea tags" ON idea_tags_master FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage idea tags" ON idea_tags_master;
CREATE POLICY "Manage idea tags" ON idea_tags_master FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "View idea tag links" ON idea_tag_links;
CREATE POLICY "View idea tag links" ON idea_tag_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage idea tag links" ON idea_tag_links;
CREATE POLICY "Manage idea tag links" ON idea_tag_links FOR ALL USING (auth.uid() IS NOT NULL);

-- Attachments policies
DROP POLICY IF EXISTS "View idea attachments" ON idea_attachments;
CREATE POLICY "View idea attachments" ON idea_attachments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Upload idea attachments" ON idea_attachments;
CREATE POLICY "Upload idea attachments" ON idea_attachments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Delete own idea attachments" ON idea_attachments;
CREATE POLICY "Delete own idea attachments" ON idea_attachments FOR DELETE USING (uploaded_by = auth.uid());

-- Duplicates policies
DROP POLICY IF EXISTS "View idea duplicates" ON idea_duplicates;
CREATE POLICY "View idea duplicates" ON idea_duplicates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage idea duplicates" ON idea_duplicates;
CREATE POLICY "Manage idea duplicates" ON idea_duplicates FOR ALL USING (auth.uid() IS NOT NULL);

-- Moderators policies
DROP POLICY IF EXISTS "View initiative moderators" ON initiative_moderators;
CREATE POLICY "View initiative moderators" ON initiative_moderators FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage initiative moderators" ON initiative_moderators;
CREATE POLICY "Manage initiative moderators" ON initiative_moderators FOR ALL USING (
  EXISTS (SELECT 1 FROM improvement_initiatives i WHERE i.id = initiative_id AND i.owner_id = auth.uid())
);

-- ============================================================
-- REALTIME
-- ============================================================
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE improvement_ideas;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE idea_votes;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE idea_comments;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE impact_scores;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_improvement_ideas_initiative ON improvement_ideas(initiative_id);
CREATE INDEX IF NOT EXISTS idx_improvement_ideas_status ON improvement_ideas(status);
CREATE INDEX IF NOT EXISTS idx_improvement_ideas_category ON improvement_ideas(category);
CREATE INDEX IF NOT EXISTS idx_improvement_ideas_submitter ON improvement_ideas(submitter_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea ON idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_idea ON idea_comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_impact_scores_idea ON impact_scores(idea_id);
CREATE INDEX IF NOT EXISTS idx_improvement_initiatives_status ON improvement_initiatives(status);