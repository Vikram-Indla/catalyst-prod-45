-- =====================================================
-- WORK ITEM RANKINGS - Multi-Level Context System
-- Based on Jira Align Specification & Technical Guide
-- =====================================================

-- Create work_item_rankings table for multi-context ranking
CREATE TABLE IF NOT EXISTS public.work_item_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL,
  work_item_type TEXT NOT NULL CHECK (work_item_type IN ('epic', 'capability', 'feature', 'story', 'theme')),
  context_type TEXT NOT NULL CHECK (context_type IN ('global', 'portfolio', 'program', 'team')),
  context_id UUID,  -- NULL for global, FK to portfolio/program/team otherwise
  pi_id UUID,       -- NULL for all-PI rankings, FK to program_increments for PI-specific
  rank INTEGER NOT NULL CHECK (rank > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partial unique indexes for different context scenarios
-- Global context (no context_id, no pi_id)
CREATE UNIQUE INDEX idx_rankings_global_unique 
  ON public.work_item_rankings(work_item_id, work_item_type, context_type)
  WHERE context_id IS NULL AND pi_id IS NULL;

-- Portfolio/Program/Team context (has context_id, no pi_id)
CREATE UNIQUE INDEX idx_rankings_context_unique 
  ON public.work_item_rankings(work_item_id, work_item_type, context_type, context_id)
  WHERE context_id IS NOT NULL AND pi_id IS NULL;

-- Global with PI (no context_id, has pi_id)
CREATE UNIQUE INDEX idx_rankings_global_pi_unique 
  ON public.work_item_rankings(work_item_id, work_item_type, context_type, pi_id)
  WHERE context_id IS NULL AND pi_id IS NOT NULL;

-- Context with PI (has both context_id and pi_id)
CREATE UNIQUE INDEX idx_rankings_context_pi_unique 
  ON public.work_item_rankings(work_item_id, work_item_type, context_type, context_id, pi_id)
  WHERE context_id IS NOT NULL AND pi_id IS NOT NULL;

-- Performance indexes
CREATE INDEX idx_rankings_work_item ON public.work_item_rankings(work_item_id, work_item_type);
CREATE INDEX idx_rankings_context ON public.work_item_rankings(context_type, context_id, pi_id);
CREATE INDEX idx_rankings_rank ON public.work_item_rankings(rank);

-- Enable RLS
ALTER TABLE public.work_item_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view work item rankings"
  ON public.work_item_rankings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create work item rankings"
  ON public.work_item_rankings
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'program_manager') OR
      has_role(auth.uid(), 'team_lead')
    )
  );

CREATE POLICY "Users can update work item rankings"
  ON public.work_item_rankings
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'program_manager') OR
      has_role(auth.uid(), 'team_lead')
    )
  );

CREATE POLICY "Users can delete work item rankings"
  ON public.work_item_rankings
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'program_manager')
    )
  );

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_work_item_rankings_updated_at
  BEFORE UPDATE ON public.work_item_rankings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- MIGRATE EXISTING EPIC RANKS
-- =====================================================

-- Migrate global ranks
INSERT INTO public.work_item_rankings (work_item_id, work_item_type, context_type, context_id, pi_id, rank)
SELECT id, 'epic'::text, 'global'::text, NULL, NULL, global_rank
FROM public.epics
WHERE global_rank IS NOT NULL AND global_rank > 0
ON CONFLICT DO NOTHING;

-- Migrate portfolio ranks
INSERT INTO public.work_item_rankings (work_item_id, work_item_type, context_type, context_id, pi_id, rank)
SELECT e.id, 'epic'::text, 'portfolio'::text, e.portfolio_id, NULL, e.portfolio_rank
FROM public.epics e
WHERE e.portfolio_rank IS NOT NULL AND e.portfolio_rank > 0 AND e.portfolio_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate program ranks
INSERT INTO public.work_item_rankings (work_item_id, work_item_type, context_type, context_id, pi_id, rank)
SELECT e.id, 'epic'::text, 'program'::text, e.primary_program_id, NULL, e.program_rank
FROM public.epics e
WHERE e.program_rank IS NOT NULL AND e.program_rank > 0 AND e.primary_program_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate feature global ranks
INSERT INTO public.work_item_rankings (work_item_id, work_item_type, context_type, context_id, pi_id, rank)
SELECT id, 'feature'::text, 'global'::text, NULL, NULL, global_rank
FROM public.features
WHERE global_rank IS NOT NULL AND global_rank > 0
ON CONFLICT DO NOTHING;

-- =====================================================
-- STORY LINKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.story_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  to_story_id UUID NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('blocks', 'blocked_by', 'relates_to', 'duplicates', 'duplicated_by', 'parent_feature')),
  external_url TEXT,
  external_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_story_links_from ON public.story_links(from_story_id);
CREATE INDEX idx_story_links_to ON public.story_links(to_story_id);
CREATE INDEX idx_story_links_type ON public.story_links(link_type);

ALTER TABLE public.story_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view story links"
  ON public.story_links FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create story links"
  ON public.story_links FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update story links"
  ON public.story_links FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'program_manager'));

CREATE POLICY "Users can delete story links"
  ON public.story_links FOR DELETE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'program_manager'));

CREATE TRIGGER update_story_links_updated_at
  BEFORE UPDATE ON public.story_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.work_item_rankings IS 'Multi-level contextual ranking system for all work item types per Jira Align specification';
COMMENT ON TABLE public.story_links IS 'Story relationships including blocking links for Pull Rank feature';