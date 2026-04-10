-- Index for fast governance lock lookups during sync
CREATE INDEX IF NOT EXISTS idx_governance_closure_active_locks
ON public.governance_closure_log (item_key)
WHERE restored_at IS NULL;

-- Also index by issue_id for UUID-based lookups
CREATE INDEX IF NOT EXISTS idx_governance_closure_issue_active
ON public.governance_closure_log (issue_id)
WHERE restored_at IS NULL;