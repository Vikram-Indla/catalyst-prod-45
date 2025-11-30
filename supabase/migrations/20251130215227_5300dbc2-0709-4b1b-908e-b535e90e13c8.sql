-- Jira Integration Tables - Phase 1: Foundation

-- Table: jira_connections (stores Jira instance connections)
CREATE TABLE IF NOT EXISTS public.jira_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  jira_url TEXT NOT NULL,
  instance_type TEXT NOT NULL CHECK (instance_type IN ('cloud', 'server', 'data_center')),
  auth_method TEXT NOT NULL CHECK (auth_method IN ('oauth1', 'pat', 'api_token')),
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_test_status TEXT CHECK (last_test_status IN ('success', 'failed', 'pending')),
  last_test_message TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: jira_auth_credentials (encrypted storage for authentication)
CREATE TABLE IF NOT EXISTS public.jira_auth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  auth_data JSONB NOT NULL, -- Encrypted OAuth tokens, PAT, or API tokens
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: jira_field_mappings (field mapping configuration)
CREATE TABLE IF NOT EXISTS public.jira_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  catalyst_entity TEXT NOT NULL, -- 'story', 'feature', 'epic', 'capability', 'theme'
  catalyst_field TEXT NOT NULL,
  jira_field TEXT NOT NULL,
  jira_field_type TEXT, -- 'standard', 'custom'
  sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('catalyst_to_jira', 'jira_to_catalyst', 'bidirectional')),
  transformation_rules JSONB, -- Value mapping rules
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: jira_project_mappings (Jira Project to Catalyst Program mapping)
CREATE TABLE IF NOT EXISTS public.jira_project_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  jira_project_id TEXT NOT NULL,
  jira_project_key TEXT NOT NULL,
  jira_project_name TEXT NOT NULL,
  catalyst_program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: jira_board_mappings (Jira Board to Catalyst Team mapping)
CREATE TABLE IF NOT EXISTS public.jira_board_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  jira_board_id TEXT NOT NULL,
  jira_board_name TEXT NOT NULL,
  jira_project_key TEXT NOT NULL,
  catalyst_team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: jira_sync_logs (audit trail for sync operations)
CREATE TABLE IF NOT EXISTS public.jira_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'manual')),
  entity_type TEXT, -- 'story', 'feature', 'epic', etc.
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  items_processed INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: jira_work_item_links (linkage between Catalyst and Jira work items)
CREATE TABLE IF NOT EXISTS public.jira_work_item_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.jira_connections(id) ON DELETE CASCADE,
  catalyst_entity_type TEXT NOT NULL, -- 'story', 'feature', 'epic', 'capability', 'theme'
  catalyst_entity_id UUID NOT NULL,
  jira_issue_id TEXT NOT NULL,
  jira_issue_key TEXT NOT NULL,
  jira_issue_type TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  conflict_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(connection_id, catalyst_entity_type, catalyst_entity_id)
);

-- Enable Row Level Security
ALTER TABLE public.jira_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_project_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_board_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_work_item_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only access for configuration
CREATE POLICY "Admins can manage jira_connections" ON public.jira_connections
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage jira_auth_credentials" ON public.jira_auth_credentials
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage jira_field_mappings" ON public.jira_field_mappings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage jira_project_mappings" ON public.jira_project_mappings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage jira_board_mappings" ON public.jira_board_mappings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: Users can view sync logs
CREATE POLICY "Users can view jira_sync_logs" ON public.jira_sync_logs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage jira_sync_logs" ON public.jira_sync_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: Users can view work item links
CREATE POLICY "Users can view jira_work_item_links" ON public.jira_work_item_links
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage jira_work_item_links" ON public.jira_work_item_links
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_jira_connections_active ON public.jira_connections(is_active);
CREATE INDEX idx_jira_project_mappings_program ON public.jira_project_mappings(catalyst_program_id);
CREATE INDEX idx_jira_board_mappings_team ON public.jira_board_mappings(catalyst_team_id);
CREATE INDEX idx_jira_work_item_links_entity ON public.jira_work_item_links(catalyst_entity_type, catalyst_entity_id);
CREATE INDEX idx_jira_work_item_links_issue ON public.jira_work_item_links(jira_issue_key);
CREATE INDEX idx_jira_sync_logs_connection ON public.jira_sync_logs(connection_id, created_at DESC);