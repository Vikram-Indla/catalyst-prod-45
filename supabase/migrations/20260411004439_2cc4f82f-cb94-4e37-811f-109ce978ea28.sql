CREATE POLICY "Users delete own digest"
ON public.ai_digest_cache
FOR DELETE
USING (true);

CREATE POLICY "Users update own digest"
ON public.ai_digest_cache
FOR UPDATE
USING (true)
WITH CHECK (true);