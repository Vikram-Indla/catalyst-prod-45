
-- Drop defaults
ALTER TABLE public.releases ALTER COLUMN health DROP DEFAULT;
ALTER TABLE public.milestones ALTER COLUMN milestone_type DROP DEFAULT;

-- Create enums
CREATE TYPE public.release_health AS ENUM ('healthy', 'at_risk', 'critical');
CREATE TYPE public.milestone_type AS ENUM ('code_freeze', 'feature_complete', 'qa_start', 'qa_complete', 'uat_start', 'uat_complete', 'go_live', 'custom');

-- Convert columns
ALTER TABLE public.releases
ALTER COLUMN health TYPE public.release_health USING health::public.release_health;

ALTER TABLE public.milestones
ALTER COLUMN milestone_type TYPE public.milestone_type USING milestone_type::public.milestone_type;

-- Set new defaults
ALTER TABLE public.releases ALTER COLUMN health SET DEFAULT 'healthy'::public.release_health;
ALTER TABLE public.milestones ALTER COLUMN milestone_type SET DEFAULT 'custom'::public.milestone_type;

-- Add release_id FK
ALTER TABLE public.milestones
ADD COLUMN release_id uuid REFERENCES public.releases(id) ON DELETE CASCADE;

CREATE INDEX idx_milestones_release_id ON public.milestones(release_id);
