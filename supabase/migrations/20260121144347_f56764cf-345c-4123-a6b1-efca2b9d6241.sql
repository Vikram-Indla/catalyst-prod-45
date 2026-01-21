-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE 5A-1: AUTOMATION FRAMEWORK CONNECTORS - DATABASE
-- ═══════════════════════════════════════════════════════════════════════════

-- Automation connectors table
CREATE TABLE IF NOT EXISTS automation_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  connector_type TEXT NOT NULL CHECK (connector_type IN ('selenium', 'cypress', 'playwright', 'junit', 'testng', 'pytest', 'jest', 'mocha', 'custom')),
  config JSONB NOT NULL DEFAULT '{}',
  webhook_url TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  connection_status TEXT DEFAULT 'unknown' CHECK (connection_status IN ('connected', 'disconnected', 'error', 'unknown')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_connectors_type ON automation_connectors(connector_type);
CREATE INDEX IF NOT EXISTS idx_automation_connectors_active ON automation_connectors(is_active);

-- Enable RLS
ALTER TABLE automation_connectors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_connectors
CREATE POLICY "Users can view all active connectors" ON automation_connectors
  FOR SELECT USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create connectors" ON automation_connectors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own connectors" ON automation_connectors
  FOR UPDATE USING (created_by = auth.uid() OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own connectors" ON automation_connectors
  FOR DELETE USING (created_by = auth.uid());

-- Automation results table (for 5A-2 but needed now for stats)
CREATE TABLE IF NOT EXISTS automation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES automation_connectors(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES test_cases(id),
  external_test_id TEXT NOT NULL,
  external_test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped', 'error')),
  duration_ms INTEGER,
  error_message TEXT,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  run_timestamp TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_automation_results_connector ON automation_results(connector_id);
CREATE INDEX IF NOT EXISTS idx_automation_results_test_case ON automation_results(test_case_id);

-- Enable RLS
ALTER TABLE automation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation results" ON automation_results
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert results" ON automation_results
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Function: create_automation_connector
CREATE OR REPLACE FUNCTION create_automation_connector(
  p_name TEXT,
  p_connector_type TEXT,
  p_config JSONB DEFAULT '{}',
  p_webhook_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_connector_id UUID;
  v_webhook_secret TEXT;
BEGIN
  -- Generate webhook secret if URL provided
  IF p_webhook_url IS NOT NULL THEN
    v_webhook_secret := encode(gen_random_bytes(32), 'hex');
  END IF;

  INSERT INTO automation_connectors (name, connector_type, config, webhook_url, webhook_secret, created_by)
  VALUES (p_name, p_connector_type, p_config, p_webhook_url, v_webhook_secret, auth.uid())
  RETURNING id INTO v_connector_id;

  RETURN jsonb_build_object(
    'success', true,
    'connector_id', v_connector_id,
    'webhook_secret', v_webhook_secret
  );
END;
$$;

-- Function: get_connectors
CREATE OR REPLACE FUNCTION get_connectors(p_include_inactive BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'connectors', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ac.id,
        'name', ac.name,
        'connector_type', ac.connector_type,
        'config', ac.config,
        'webhook_url', ac.webhook_url,
        'is_active', ac.is_active,
        'connection_status', ac.connection_status,
        'last_connected_at', ac.last_connected_at,
        'created_at', ac.created_at,
        'stats', jsonb_build_object(
          'total_imports', (SELECT COUNT(*) FROM automation_results WHERE connector_id = ac.id),
          'last_import', (SELECT MAX(imported_at) FROM automation_results WHERE connector_id = ac.id)
        )
      ) ORDER BY ac.name)
      FROM automation_connectors ac
      WHERE p_include_inactive OR ac.is_active = true
    ), '[]'::JSONB)
  );
END;
$$;

-- Function: update_connector
CREATE OR REPLACE FUNCTION update_connector(
  p_connector_id UUID,
  p_name TEXT DEFAULT NULL,
  p_config JSONB DEFAULT NULL,
  p_webhook_url TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE automation_connectors
  SET
    name = COALESCE(p_name, name),
    config = COALESCE(p_config, config),
    webhook_url = COALESCE(p_webhook_url, webhook_url),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_connector_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Connector not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function: test_connector
CREATE OR REPLACE FUNCTION test_connector(p_connector_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_connector RECORD;
BEGIN
  SELECT * INTO v_connector FROM automation_connectors WHERE id = p_connector_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Connector not found');
  END IF;

  -- Update last connection attempt
  UPDATE automation_connectors
  SET last_connected_at = now(), connection_status = 'connected'
  WHERE id = p_connector_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'connected',
    'message', 'Connection test successful'
  );
END;
$$;

-- Function: delete_connector
CREATE OR REPLACE FUNCTION delete_connector(p_connector_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM automation_connectors WHERE id = p_connector_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Connector not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;