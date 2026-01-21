-- ============================================================
-- MODULE 4A-3: CYCLE EXECUTION TRACKER
-- Real-time progress monitoring, workload distribution, audit trail
-- ============================================================

-- Create execution audit trail table for cycle-level tracking
CREATE TABLE IF NOT EXISTS tm_cycle_execution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES tm_test_cycles(id) ON DELETE CASCADE,
  scope_id UUID REFERENCES tm_cycle_scope(id) ON DELETE SET NULL,
  test_run_id UUID REFERENCES tm_test_runs(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'status_changed', 'assigned', 'unassigned', 'defect_created', 
    'defect_linked', 'comment_added', 'evidence_uploaded', 
    'retested', 'bulk_update', 'execution_started', 'execution_completed'
  )),
  actor_id UUID,
  actor_name TEXT,
  test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
  test_case_key TEXT,
  test_case_title TEXT,
  from_status TEXT,
  to_status TEXT,
  defect_key TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cycle_execution_audit_cycle ON tm_cycle_execution_audit(cycle_id);
CREATE INDEX idx_cycle_execution_audit_created ON tm_cycle_execution_audit(created_at DESC);
CREATE INDEX idx_cycle_execution_audit_actor ON tm_cycle_execution_audit(actor_id);
CREATE INDEX idx_cycle_execution_audit_action ON tm_cycle_execution_audit(action_type);

-- Enable RLS
ALTER TABLE tm_cycle_execution_audit ENABLE ROW LEVEL SECURITY;

-- Allow reading audit records
CREATE POLICY "Users can view cycle execution audit"
ON tm_cycle_execution_audit FOR SELECT
USING (true);

-- Allow inserting audit records
CREATE POLICY "Users can insert cycle execution audit"
ON tm_cycle_execution_audit FOR INSERT
WITH CHECK (true);

-- ============================================================
-- RPC: Get team workload for a cycle
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_cycle_team_workload(p_cycle_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_initials TEXT,
  avatar_url TEXT,
  total_tests BIGINT,
  passed BIGINT,
  failed BIGINT,
  blocked BIGINT,
  in_progress BIGINT,
  not_started BIGINT,
  workload_status TEXT,
  avg_completion_rate NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_avg_tests_per_user NUMERIC;
BEGIN
  -- Calculate average tests per user for workload status
  SELECT AVG(test_count)::NUMERIC INTO v_avg_tests_per_user
  FROM (
    SELECT COUNT(*) as test_count
    FROM tm_cycle_scope
    WHERE cycle_id = p_cycle_id AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  ) counts;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    COALESCE(p.full_name, p.email, 'Unknown')::TEXT as user_name,
    UPPER(SUBSTRING(COALESCE(p.full_name, p.email, 'U') FROM 1 FOR 1) || 
          COALESCE(SUBSTRING(COALESCE(p.full_name, '') FROM POSITION(' ' IN COALESCE(p.full_name, '') || ' ') + 1 FOR 1), ''))::TEXT as user_initials,
    p.avatar_url::TEXT,
    COUNT(cs.id)::BIGINT as total_tests,
    COUNT(*) FILTER (WHERE cs.status = 'passed')::BIGINT as passed,
    COUNT(*) FILTER (WHERE cs.status = 'failed')::BIGINT as failed,
    COUNT(*) FILTER (WHERE cs.status = 'blocked')::BIGINT as blocked,
    COUNT(*) FILTER (WHERE cs.status = 'in_progress')::BIGINT as in_progress,
    COUNT(*) FILTER (WHERE cs.status IN ('not_run', 'pending'))::BIGINT as not_started,
    CASE 
      WHEN v_avg_tests_per_user IS NULL OR v_avg_tests_per_user = 0 THEN 'normal'
      WHEN COUNT(cs.id) > v_avg_tests_per_user * 1.5 THEN 'overloaded'
      WHEN COUNT(cs.id) > v_avg_tests_per_user * 1.2 THEN 'high'
      ELSE 'normal'
    END::TEXT as workload_status,
    CASE 
      WHEN COUNT(cs.id) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE cs.status IN ('passed', 'failed', 'blocked', 'skipped'))::NUMERIC / COUNT(cs.id)) * 100, 1)
    END as avg_completion_rate
  FROM tm_cycle_scope cs
  JOIN profiles p ON cs.assigned_to = p.id
  WHERE cs.cycle_id = p_cycle_id AND cs.assigned_to IS NOT NULL
  GROUP BY p.id, p.full_name, p.email, p.avatar_url
  ORDER BY total_tests DESC;
END;
$$;

-- ============================================================
-- RPC: Get recent activity feed for a cycle
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_cycle_activity_feed(p_cycle_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  action_type TEXT,
  actor_id UUID,
  actor_name TEXT,
  actor_initials TEXT,
  test_case_key TEXT,
  test_case_title TEXT,
  from_status TEXT,
  to_status TEXT,
  defect_key TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  time_ago TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.action_type,
    a.actor_id,
    COALESCE(a.actor_name, 'System')::TEXT as actor_name,
    UPPER(SUBSTRING(COALESCE(a.actor_name, 'S') FROM 1 FOR 1) || 
          COALESCE(SUBSTRING(COALESCE(a.actor_name, '') FROM POSITION(' ' IN COALESCE(a.actor_name, '') || ' ') + 1 FOR 1), ''))::TEXT as actor_initials,
    a.test_case_key,
    a.test_case_title,
    a.from_status,
    a.to_status,
    a.defect_key,
    a.metadata,
    a.created_at,
    CASE 
      WHEN a.created_at > NOW() - INTERVAL '1 minute' THEN 'just now'
      WHEN a.created_at > NOW() - INTERVAL '1 hour' THEN EXTRACT(MINUTE FROM NOW() - a.created_at)::TEXT || 'm ago'
      WHEN a.created_at > NOW() - INTERVAL '1 day' THEN EXTRACT(HOUR FROM NOW() - a.created_at)::TEXT || 'h ago'
      ELSE TO_CHAR(a.created_at, 'Mon DD')
    END::TEXT as time_ago
  FROM tm_cycle_execution_audit a
  WHERE a.cycle_id = p_cycle_id
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- RPC: Get execution velocity and trends for a cycle
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_cycle_execution_velocity(p_cycle_id UUID, p_days INTEGER DEFAULT 14)
RETURNS TABLE (
  date_key DATE,
  date_label TEXT,
  executed_count BIGINT,
  passed_count BIGINT,
  failed_count BIGINT,
  blocked_count BIGINT,
  cumulative_executed BIGINT,
  velocity_per_day NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_start_date DATE;
  v_running_total BIGINT := 0;
BEGIN
  v_start_date := CURRENT_DATE - p_days;
  
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, CURRENT_DATE, '1 day'::INTERVAL)::DATE as d
  ),
  daily_counts AS (
    SELECT 
      tr.completed_at::DATE as run_date,
      COUNT(*) as executed,
      COUNT(*) FILTER (WHERE tr.status = 'passed') as passed,
      COUNT(*) FILTER (WHERE tr.status = 'failed') as failed,
      COUNT(*) FILTER (WHERE tr.status = 'blocked') as blocked
    FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    WHERE cs.cycle_id = p_cycle_id
      AND tr.completed_at IS NOT NULL
      AND tr.completed_at::DATE >= v_start_date
    GROUP BY tr.completed_at::DATE
  ),
  joined AS (
    SELECT 
      ds.d as date_key,
      TO_CHAR(ds.d, 'Mon DD')::TEXT as date_label,
      COALESCE(dc.executed, 0)::BIGINT as executed_count,
      COALESCE(dc.passed, 0)::BIGINT as passed_count,
      COALESCE(dc.failed, 0)::BIGINT as failed_count,
      COALESCE(dc.blocked, 0)::BIGINT as blocked_count
    FROM date_series ds
    LEFT JOIN daily_counts dc ON ds.d = dc.run_date
    ORDER BY ds.d
  )
  SELECT 
    j.date_key,
    j.date_label,
    j.executed_count,
    j.passed_count,
    j.failed_count,
    j.blocked_count,
    SUM(j.executed_count) OVER (ORDER BY j.date_key) as cumulative_executed,
    CASE 
      WHEN ROW_NUMBER() OVER (ORDER BY j.date_key) <= 3 THEN j.executed_count::NUMERIC
      ELSE ROUND(AVG(j.executed_count) OVER (ORDER BY j.date_key ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1)
    END as velocity_per_day
  FROM joined j;
END;
$$;

-- ============================================================
-- RPC: Get cycle execution summary with real-time metrics
-- ============================================================
CREATE OR REPLACE FUNCTION tm_get_cycle_execution_summary(p_cycle_id UUID)
RETURNS TABLE (
  total_cases BIGINT,
  passed BIGINT,
  failed BIGINT,
  blocked BIGINT,
  in_progress BIGINT,
  not_started BIGINT,
  skipped BIGINT,
  execution_rate NUMERIC,
  pass_rate NUMERIC,
  avg_duration_seconds NUMERIC,
  total_duration_hours NUMERIC,
  active_testers BIGINT,
  defects_found BIGINT,
  tests_with_evidence BIGINT,
  velocity_today BIGINT,
  velocity_avg_7d NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_7d_ago DATE := CURRENT_DATE - 7;
BEGIN
  RETURN QUERY
  WITH scope_stats AS (
    SELECT 
      COUNT(*)::BIGINT as total,
      COUNT(*) FILTER (WHERE cs.status = 'passed')::BIGINT as passed,
      COUNT(*) FILTER (WHERE cs.status = 'failed')::BIGINT as failed,
      COUNT(*) FILTER (WHERE cs.status = 'blocked')::BIGINT as blocked,
      COUNT(*) FILTER (WHERE cs.status = 'in_progress')::BIGINT as in_progress,
      COUNT(*) FILTER (WHERE cs.status IN ('not_run', 'pending'))::BIGINT as not_started,
      COUNT(*) FILTER (WHERE cs.status = 'skipped')::BIGINT as skipped,
      COUNT(DISTINCT cs.assigned_to) FILTER (WHERE cs.assigned_to IS NOT NULL)::BIGINT as active_testers
    FROM tm_cycle_scope cs
    WHERE cs.cycle_id = p_cycle_id
  ),
  run_stats AS (
    SELECT 
      AVG(tr.duration_seconds)::NUMERIC as avg_duration,
      SUM(tr.duration_seconds)::NUMERIC / 3600 as total_hours,
      SUM(tr.defects_found)::BIGINT as defects,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM tm_cycle_execution_audit cea 
        WHERE cea.test_run_id = tr.id AND cea.action_type = 'evidence_uploaded'
      ))::BIGINT as with_evidence
    FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    WHERE cs.cycle_id = p_cycle_id
  ),
  velocity_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE tr.completed_at::DATE = v_today)::BIGINT as today,
      ROUND(COUNT(*) FILTER (WHERE tr.completed_at::DATE >= v_7d_ago)::NUMERIC / 7, 1) as avg_7d
    FROM tm_test_runs tr
    JOIN tm_cycle_scope cs ON tr.cycle_scope_id = cs.id
    WHERE cs.cycle_id = p_cycle_id AND tr.completed_at IS NOT NULL
  )
  SELECT 
    ss.total as total_cases,
    ss.passed,
    ss.failed,
    ss.blocked,
    ss.in_progress,
    ss.not_started,
    ss.skipped,
    CASE WHEN ss.total = 0 THEN 0 ELSE ROUND((ss.passed + ss.failed + ss.blocked + ss.skipped)::NUMERIC / ss.total * 100, 1) END as execution_rate,
    CASE WHEN (ss.passed + ss.failed + ss.blocked) = 0 THEN 0 ELSE ROUND(ss.passed::NUMERIC / (ss.passed + ss.failed + ss.blocked) * 100, 1) END as pass_rate,
    COALESCE(rs.avg_duration, 0) as avg_duration_seconds,
    COALESCE(rs.total_hours, 0) as total_duration_hours,
    ss.active_testers,
    COALESCE(rs.defects, 0) as defects_found,
    COALESCE(rs.with_evidence, 0) as tests_with_evidence,
    vs.today as velocity_today,
    vs.avg_7d as velocity_avg_7d
  FROM scope_stats ss
  CROSS JOIN run_stats rs
  CROSS JOIN velocity_stats vs;
END;
$$;

-- ============================================================
-- Trigger: Auto-log status changes to audit trail
-- ============================================================
CREATE OR REPLACE FUNCTION tm_log_cycle_scope_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tm_cycle_execution_audit (
      cycle_id, scope_id, test_case_id, test_case_key,
      action_type, from_status, to_status, actor_id
    )
    SELECT 
      NEW.cycle_id,
      NEW.id,
      NEW.test_case_id,
      tc.test_key,
      'status_changed',
      OLD.status,
      NEW.status,
      auth.uid()
    FROM test_cases tc WHERE tc.id = NEW.test_case_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_cycle_scope_status ON tm_cycle_scope;
CREATE TRIGGER trg_log_cycle_scope_status
  AFTER UPDATE ON tm_cycle_scope
  FOR EACH ROW
  EXECUTE FUNCTION tm_log_cycle_scope_status_change();

-- ============================================================
-- Trigger: Auto-log assignment changes
-- ============================================================
CREATE OR REPLACE FUNCTION tm_log_cycle_assignment_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor_name TEXT;
  v_tc_key TEXT;
  v_tc_title TEXT;
BEGIN
  -- Get actor name
  SELECT full_name INTO v_actor_name FROM profiles WHERE id = auth.uid();
  
  -- Get test case info
  SELECT test_key, title INTO v_tc_key, v_tc_title 
  FROM test_cases WHERE id = NEW.test_case_id;

  IF OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL THEN
    -- New assignment
    INSERT INTO tm_cycle_execution_audit (
      cycle_id, scope_id, test_case_id, test_case_key, test_case_title,
      action_type, actor_id, actor_name, metadata
    ) VALUES (
      NEW.cycle_id, NEW.id, NEW.test_case_id, v_tc_key, v_tc_title,
      'assigned', auth.uid(), v_actor_name,
      jsonb_build_object('assigned_to', NEW.assigned_to)
    );
  ELSIF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL THEN
    -- Unassignment
    INSERT INTO tm_cycle_execution_audit (
      cycle_id, scope_id, test_case_id, test_case_key, test_case_title,
      action_type, actor_id, actor_name, metadata
    ) VALUES (
      NEW.cycle_id, NEW.id, NEW.test_case_id, v_tc_key, v_tc_title,
      'unassigned', auth.uid(), v_actor_name,
      jsonb_build_object('unassigned_from', OLD.assigned_to)
    );
  ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    -- Reassignment
    INSERT INTO tm_cycle_execution_audit (
      cycle_id, scope_id, test_case_id, test_case_key, test_case_title,
      action_type, actor_id, actor_name, metadata
    ) VALUES (
      NEW.cycle_id, NEW.id, NEW.test_case_id, v_tc_key, v_tc_title,
      'assigned', auth.uid(), v_actor_name,
      jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_cycle_assignment ON tm_cycle_scope;
CREATE TRIGGER trg_log_cycle_assignment
  AFTER UPDATE ON tm_cycle_scope
  FOR EACH ROW
  EXECUTE FUNCTION tm_log_cycle_assignment_change();

-- Enable realtime for audit table
ALTER PUBLICATION supabase_realtime ADD TABLE tm_cycle_execution_audit;