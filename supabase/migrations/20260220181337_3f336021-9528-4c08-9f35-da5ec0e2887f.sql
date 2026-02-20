
-- ═══════════════════════════════════════════════════
-- AI BRIEFS — Single table for all AI panels
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ai_briefs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scope           TEXT NOT NULL,
  scope_entity_id UUID DEFAULT NULL,
  brief_json      JSONB NOT NULL DEFAULT '{}',
  metrics_json    JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft',
  version         INTEGER NOT NULL DEFAULT 1,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by    TEXT DEFAULT 'system',
  published_at    TIMESTAMPTZ DEFAULT NULL,
  published_by    UUID DEFAULT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_briefs_scope_status 
  ON public.ai_briefs (scope, status) 
  WHERE status = 'published';

CREATE INDEX idx_ai_briefs_scope_entity 
  ON public.ai_briefs (scope, scope_entity_id, status)
  WHERE status = 'published';

CREATE INDEX idx_ai_briefs_scope_history 
  ON public.ai_briefs (scope, created_at DESC);

-- ═══ RLS ═══
ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin (user_roles.role = 'admin') OR has super_admin product role
CREATE OR REPLACE FUNCTION public.is_ai_brief_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.role_id
    WHERE upr.user_id = _user_id AND pr.code = 'super_admin'
  )
$$;

-- All authenticated users can read published briefs
CREATE POLICY "Anyone can read published briefs"
  ON public.ai_briefs FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Admins can read all briefs (drafts, archived, discarded)
CREATE POLICY "Admins can read all briefs"
  ON public.ai_briefs FOR SELECT
  TO authenticated
  USING (public.is_ai_brief_admin(auth.uid()));

-- Admins can insert briefs
CREATE POLICY "Admins can insert briefs"
  ON public.ai_briefs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_ai_brief_admin(auth.uid()));

-- Admins can update briefs
CREATE POLICY "Admins can update briefs"
  ON public.ai_briefs FOR UPDATE
  TO authenticated
  USING (public.is_ai_brief_admin(auth.uid()));

-- Service role can insert (for cron/edge function generation)
CREATE POLICY "Service role can insert briefs"
  ON public.ai_briefs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update briefs"
  ON public.ai_briefs FOR UPDATE
  TO service_role
  USING (true);

-- ═══ HELPER FUNCTION: Publish a brief ═══
CREATE OR REPLACE FUNCTION public.publish_ai_brief(brief_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope TEXT;
  v_entity_id UUID;
  v_next_version INTEGER;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_ai_brief_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can publish briefs';
  END IF;

  -- Get the scope of the brief being published
  SELECT scope, scope_entity_id INTO v_scope, v_entity_id
  FROM public.ai_briefs WHERE id = brief_id AND status = 'draft';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brief not found or not in draft status';
  END IF;
  
  -- Archive the current published brief for this scope
  UPDATE public.ai_briefs 
  SET status = 'archived', updated_at = NOW()
  WHERE scope = v_scope 
    AND (scope_entity_id IS NOT DISTINCT FROM v_entity_id)
    AND status = 'published';
  
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.ai_briefs 
  WHERE scope = v_scope 
    AND (scope_entity_id IS NOT DISTINCT FROM v_entity_id);
  
  -- Publish the new brief
  UPDATE public.ai_briefs 
  SET 
    status = 'published',
    version = v_next_version,
    published_at = NOW(),
    published_by = auth.uid(),
    updated_at = NOW()
  WHERE id = brief_id;
END;
$$;
