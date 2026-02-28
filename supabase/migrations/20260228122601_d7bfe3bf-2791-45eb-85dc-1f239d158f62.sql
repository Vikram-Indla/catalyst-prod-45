
-- Drop Phase 1A policies
DROP POLICY IF EXISTS "Authenticated users can read kb_sources" ON public.kb_sources;
DROP POLICY IF EXISTS "Authenticated users can manage kb_sources" ON public.kb_sources;
DROP POLICY IF EXISTS "Authenticated users can read kb_training_questions" ON public.kb_training_questions;
DROP POLICY IF EXISTS "Authenticated users can manage kb_training_questions" ON public.kb_training_questions;
DROP POLICY IF EXISTS "Authenticated users can read kb_embeddings" ON public.kb_embeddings;
DROP POLICY IF EXISTS "Authenticated users can manage kb_embeddings" ON public.kb_embeddings;
DROP POLICY IF EXISTS "Authenticated users can read kb_cache" ON public.kb_cache;
DROP POLICY IF EXISTS "Authenticated users can manage kb_cache" ON public.kb_cache;
DROP POLICY IF EXISTS "Users can read own query logs" ON public.kb_query_log;
DROP POLICY IF EXISTS "Users can insert own query logs" ON public.kb_query_log;
DROP POLICY IF EXISTS "Users can update own query logs" ON public.kb_query_log;
DROP POLICY IF EXISTS "Authenticated users can read kb_access_matrix" ON public.kb_access_matrix;
DROP POLICY IF EXISTS "Authenticated users can manage kb_access_matrix" ON public.kb_access_matrix;

-- Helper: KB admin check
CREATE OR REPLACE FUNCTION public.kb_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'program_manager')
  );
END;
$$;

-- Helper: team lead or above
CREATE OR REPLACE FUNCTION public.kb_is_lead_or_above()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'program_manager', 'team_lead')
  );
END;
$$;

-- Helper: product role check
CREATE OR REPLACE FUNCTION public.kb_has_product_role(required_codes TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_product_roles upr
    JOIN public.product_roles pr ON pr.id = upr.product_role_id
    WHERE upr.user_id = auth.uid()
      AND pr.code = ANY(required_codes)
  );
END;
$$;

-- kb_sources: all read, admin write
CREATE POLICY "kb_sources_select" ON public.kb_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_sources_insert" ON public.kb_sources FOR INSERT TO authenticated WITH CHECK (public.kb_is_admin());
CREATE POLICY "kb_sources_update" ON public.kb_sources FOR UPDATE TO authenticated USING (public.kb_is_admin());
CREATE POLICY "kb_sources_delete" ON public.kb_sources FOR DELETE TO authenticated USING (public.kb_is_admin());

-- kb_training_questions: all read, admin write
CREATE POLICY "kb_training_select" ON public.kb_training_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_training_insert" ON public.kb_training_questions FOR INSERT TO authenticated WITH CHECK (public.kb_is_admin());
CREATE POLICY "kb_training_update" ON public.kb_training_questions FOR UPDATE TO authenticated USING (public.kb_is_admin());
CREATE POLICY "kb_training_delete" ON public.kb_training_questions FOR DELETE TO authenticated USING (public.kb_is_admin());

-- kb_embeddings: all read, admin write
CREATE POLICY "kb_embeddings_select" ON public.kb_embeddings FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_embeddings_insert" ON public.kb_embeddings FOR INSERT TO authenticated WITH CHECK (public.kb_is_admin());
CREATE POLICY "kb_embeddings_update" ON public.kb_embeddings FOR UPDATE TO authenticated USING (public.kb_is_admin());

-- kb_cache: all read/write, admin delete
CREATE POLICY "kb_cache_select" ON public.kb_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_cache_insert" ON public.kb_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kb_cache_update" ON public.kb_cache FOR UPDATE TO authenticated USING (true);
CREATE POLICY "kb_cache_delete" ON public.kb_cache FOR DELETE TO authenticated USING (public.kb_is_admin());

-- kb_query_log: own logs + leads see all, anyone inserts
CREATE POLICY "kb_query_log_select" ON public.kb_query_log FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.kb_is_lead_or_above());
CREATE POLICY "kb_query_log_insert" ON public.kb_query_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kb_query_log_update" ON public.kb_query_log FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- kb_access_matrix: all read, admin write
CREATE POLICY "kb_access_matrix_select" ON public.kb_access_matrix FOR SELECT TO authenticated USING (true);
CREATE POLICY "kb_access_matrix_insert" ON public.kb_access_matrix FOR INSERT TO authenticated WITH CHECK (public.kb_is_admin());
CREATE POLICY "kb_access_matrix_update" ON public.kb_access_matrix FOR UPDATE TO authenticated USING (public.kb_is_admin());
CREATE POLICY "kb_access_matrix_delete" ON public.kb_access_matrix FOR DELETE TO authenticated USING (public.kb_is_admin());
