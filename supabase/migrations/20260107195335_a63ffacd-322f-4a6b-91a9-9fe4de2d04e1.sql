-- Block UPDATE on ai_assist_audit_events (immutable audit log)
CREATE POLICY "Block update on audit events" 
ON public.ai_assist_audit_events 
FOR UPDATE 
USING (false);

-- Block DELETE on ai_assist_audit_events (immutable audit log)
CREATE POLICY "Block delete on audit events" 
ON public.ai_assist_audit_events 
FOR DELETE 
USING (false);

-- Block UPDATE on ai_assist_artifacts (immutable artifacts)
CREATE POLICY "Block update on artifacts" 
ON public.ai_assist_artifacts 
FOR UPDATE 
USING (false);

-- Block DELETE on ai_assist_artifacts (immutable artifacts)
CREATE POLICY "Block delete on artifacts" 
ON public.ai_assist_artifacts 
FOR DELETE 
USING (false);