-- Create incident_watchers table for watch/unwatch functionality
CREATE TABLE IF NOT EXISTS public.incident_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(incident_id, user_id)
);

-- Enable RLS
ALTER TABLE public.incident_watchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view watchers" ON public.incident_watchers
  FOR SELECT USING (public.current_user_is_approved());

CREATE POLICY "Users can add themselves as watcher" ON public.incident_watchers
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.current_user_is_approved());

CREATE POLICY "Users can remove themselves as watcher" ON public.incident_watchers
  FOR DELETE USING (auth.uid() = user_id AND public.current_user_is_approved());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_incident_watchers_incident_id ON public.incident_watchers(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_watchers_user_id ON public.incident_watchers(user_id);