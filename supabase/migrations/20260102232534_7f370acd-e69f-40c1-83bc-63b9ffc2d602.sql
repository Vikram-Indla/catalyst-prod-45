-- =============================================================
-- TEST MANAGEMENT: NOTIFICATIONS, AI AUDIT, AND GOVERNANCE
-- =============================================================

-- 1. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.test_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- Event preferences
  notify_on_assignment BOOLEAN DEFAULT true,
  notify_on_mentions BOOLEAN DEFAULT true,
  notify_on_execution_updates BOOLEAN DEFAULT true,
  notify_on_automation_ownership BOOLEAN DEFAULT true,
  notify_on_cycle_complete BOOLEAN DEFAULT true,
  notify_on_defect_linked BOOLEAN DEFAULT true,
  
  -- Delivery preferences
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  digest_mode VARCHAR(20) DEFAULT 'instant' CHECK (digest_mode IN ('instant', 'hourly', 'daily', 'weekly')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, program_id)
);

-- 2. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.test_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- Notification content
  event_type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Entity reference
  entity_type VARCHAR(50),
  entity_id UUID,
  entity_key VARCHAR(100),
  
  -- Actor
  actor_id UUID,
  actor_name VARCHAR(255),
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_test_notifications_user ON public.test_notifications(user_id, is_read);
CREATE INDEX idx_test_notifications_created ON public.test_notifications(created_at DESC);

-- 3. NOTIFICATION EMAIL QUEUE (for batching)
CREATE TABLE IF NOT EXISTS public.test_notification_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  notification_ids UUID[] NOT NULL,
  batch_type VARCHAR(20) DEFAULT 'instant',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_queue_status ON public.test_notification_email_queue(status, scheduled_at);

-- 4. AI ACTIONS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.test_ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Action details
  action_type VARCHAR(50) NOT NULL,
  action_subtype VARCHAR(50),
  
  -- Input/Output
  input_data JSONB NOT NULL,
  output_data JSONB,
  
  -- Source entity
  source_entity_type VARCHAR(50),
  source_entity_id UUID,
  
  -- Generated entities (drafts)
  generated_entities JSONB DEFAULT '[]',
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'rejected')),
  error_message TEXT,
  
  -- User acceptance
  user_accepted BOOLEAN,
  accepted_at TIMESTAMPTZ,
  acceptance_notes TEXT,
  
  -- Metrics
  tokens_used INTEGER,
  response_time_ms INTEGER,
  model_used VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_audit_program ON public.test_ai_audit_log(program_id, created_at DESC);
CREATE INDEX idx_ai_audit_user ON public.test_ai_audit_log(user_id, created_at DESC);

-- 5. AI GENERATED DRAFTS TABLE
CREATE TABLE IF NOT EXISTS public.test_ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID REFERENCES public.test_ai_audit_log(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- Draft details
  draft_type VARCHAR(50) NOT NULL,
  draft_data JSONB NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'modified')),
  
  -- Target entity (if accepted)
  target_entity_type VARCHAR(50),
  target_entity_id UUID,
  
  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  modifications JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_drafts_status ON public.test_ai_drafts(program_id, status);

-- 6. ACTIVITY TIMELINE TABLE (for governance)
CREATE TABLE IF NOT EXISTS public.test_activity_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- Entity
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  entity_key VARCHAR(100),
  
  -- Actor
  actor_id UUID,
  actor_name VARCHAR(255),
  
  -- Action
  action VARCHAR(100) NOT NULL,
  action_category VARCHAR(50),
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_activity_timeline_entity ON public.test_activity_timeline(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_activity_timeline_actor ON public.test_activity_timeline(actor_id, created_at DESC);
CREATE INDEX idx_activity_timeline_program ON public.test_activity_timeline(program_id, created_at DESC);

-- 7. PERMISSION DENIAL LOG
CREATE TABLE IF NOT EXISTS public.test_permission_denials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID,
  
  -- Attempted action
  attempted_action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  
  -- Denial reason
  denial_reason TEXT,
  required_permission VARCHAR(100),
  
  -- Context
  request_path TEXT,
  request_method VARCHAR(10),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_permission_denials_user ON public.test_permission_denials(user_id, created_at DESC);

-- 8. FAILURE CLUSTERS TABLE (AI-generated)
CREATE TABLE IF NOT EXISTS public.test_failure_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  
  -- Cluster details
  cluster_name VARCHAR(255) NOT NULL,
  pattern_description TEXT,
  root_cause_hypothesis TEXT,
  
  -- Affected executions
  execution_ids UUID[] DEFAULT '{}',
  failure_count INTEGER DEFAULT 0,
  
  -- Risk assessment
  impact_score INTEGER CHECK (impact_score BETWEEN 1 AND 10),
  confidence_score DECIMAL(3,2),
  
  -- Status
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- AI metadata
  ai_generated BOOLEAN DEFAULT true,
  model_used VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_failure_clusters_cycle ON public.test_failure_clusters(cycle_id);

-- 9. CYCLE RISK PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS public.test_cycle_risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES public.test_cycles(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- Risk scores
  overall_risk_score DECIMAL(3,2) CHECK (overall_risk_score BETWEEN 0 AND 1),
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Risk factors
  risk_factors JSONB DEFAULT '[]',
  
  -- Predictions
  predicted_pass_rate DECIMAL(5,2),
  predicted_completion_date DATE,
  predicted_blocker_count INTEGER,
  
  -- Recommendations
  recommendations JSONB DEFAULT '[]',
  
  -- AI metadata
  model_used VARCHAR(100),
  confidence_score DECIMAL(3,2),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_risk_predictions_cycle ON public.test_cycle_risk_predictions(cycle_id);

-- Enable RLS on all new tables
ALTER TABLE public.test_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_notification_email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_ai_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_ai_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_permission_denials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_failure_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cycle_risk_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view own preferences" ON public.test_notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences" ON public.test_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.test_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.test_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for AI audit log (view all in program for transparency)
CREATE POLICY "Authenticated users can view AI audit" ON public.test_ai_audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create AI audit entries" ON public.test_ai_audit_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- RLS Policies for AI drafts
CREATE POLICY "Authenticated users can view drafts" ON public.test_ai_drafts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage drafts" ON public.test_ai_drafts
  FOR ALL TO authenticated USING (true);

-- RLS Policies for activity timeline (read for all authenticated)
CREATE POLICY "Authenticated users can view activity" ON public.test_activity_timeline
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create activity" ON public.test_activity_timeline
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for permission denials (users see own, admins see all)
CREATE POLICY "Users can view own denials" ON public.test_permission_denials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create denials" ON public.test_permission_denials
  FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for failure clusters
CREATE POLICY "Authenticated users can view clusters" ON public.test_failure_clusters
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage clusters" ON public.test_failure_clusters
  FOR ALL TO authenticated USING (true);

-- RLS Policies for risk predictions
CREATE POLICY "Authenticated users can view predictions" ON public.test_cycle_risk_predictions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage predictions" ON public.test_cycle_risk_predictions
  FOR ALL TO authenticated USING (true);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION public.update_test_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_timestamp
  BEFORE UPDATE ON public.test_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_test_timestamp();

CREATE TRIGGER update_ai_drafts_timestamp
  BEFORE UPDATE ON public.test_ai_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_test_timestamp();

CREATE TRIGGER update_failure_clusters_timestamp
  BEFORE UPDATE ON public.test_failure_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_test_timestamp();

CREATE TRIGGER update_risk_predictions_timestamp
  BEFORE UPDATE ON public.test_cycle_risk_predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_test_timestamp();