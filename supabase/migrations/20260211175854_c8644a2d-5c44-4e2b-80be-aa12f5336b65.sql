
-- G23-01: CATY AI Database Schema

-- Step 1: Create Enums
CREATE TYPE caty_message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE caty_message_status AS ENUM ('pending', 'streaming', 'complete', 'error');
CREATE TYPE caty_suggestion_type AS ENUM ('test_case', 'test_step', 'test_data', 'coverage_gap', 'risk_area', 'query_result');
CREATE TYPE caty_suggestion_status AS ENUM ('pending', 'accepted', 'rejected', 'modified');
CREATE TYPE caty_conversation_type AS ENUM ('chat', 'generation', 'analysis', 'query');

-- Step 2: Conversations Table
CREATE TABLE caty_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255),
  conversation_type caty_conversation_type DEFAULT 'chat',
  context_type VARCHAR(50),
  context_id UUID,
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caty_conv_user ON caty_conversations(user_id);
CREATE INDEX idx_caty_conv_project ON caty_conversations(project_id);
CREATE INDEX idx_caty_conv_updated ON caty_conversations(updated_at DESC);

-- Step 3: Messages Table
CREATE TABLE caty_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES caty_conversations(id) ON DELETE CASCADE,
  role caty_message_role NOT NULL,
  content TEXT NOT NULL,
  structured_content JSONB,
  status caty_message_status DEFAULT 'complete',
  error_message TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  response_time_ms INTEGER,
  model_used VARCHAR(100),
  feedback_rating SMALLINT CHECK (feedback_rating BETWEEN -1 AND 1),
  feedback_comment TEXT,
  feedback_at TIMESTAMPTZ,
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caty_msg_conv ON caty_messages(conversation_id);
CREATE INDEX idx_caty_msg_conv_seq ON caty_messages(conversation_id, sequence_number);

-- Step 4: Suggestions Table
CREATE TABLE caty_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES caty_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES caty_conversations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  suggestion_type caty_suggestion_type NOT NULL,
  content JSONB NOT NULL,
  display_order INTEGER DEFAULT 0,
  status caty_suggestion_status DEFAULT 'pending',
  created_entity_type VARCHAR(50),
  created_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_caty_sugg_conv ON caty_suggestions(conversation_id);
CREATE INDEX idx_caty_sugg_status ON caty_suggestions(status);

-- Step 5: Prompt Templates Table
CREATE TABLE caty_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT,
  model VARCHAR(100) DEFAULT 'google/gemini-3-flash-preview',
  temperature DECIMAL(3,2) DEFAULT 0.70,
  max_tokens INTEGER DEFAULT 4096,
  category VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caty_templates_key ON caty_prompt_templates(template_key);
CREATE INDEX idx_caty_templates_category ON caty_prompt_templates(category);

-- Step 6: Analytics Table
CREATE TABLE caty_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES caty_conversations(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_caty_analytics_project ON caty_analytics(project_id);
CREATE INDEX idx_caty_analytics_event ON caty_analytics(event_type);

-- Step 7: Helper Functions
CREATE OR REPLACE FUNCTION update_caty_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE caty_conversations 
    SET message_count = message_count + 1, updated_at = NOW()
    WHERE id = NEW.conversation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE caty_conversations 
    SET message_count = GREATEST(message_count - 1, 0), updated_at = NOW()
    WHERE id = OLD.conversation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_caty_message_stats
  AFTER INSERT OR DELETE ON caty_messages
  FOR EACH ROW EXECUTE FUNCTION update_caty_conversation_stats();

CREATE OR REPLACE FUNCTION get_next_caty_message_sequence(p_conversation_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM caty_messages WHERE conversation_id = p_conversation_id;
$$ LANGUAGE sql;

-- Step 8: RLS Policies
ALTER TABLE caty_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE caty_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE caty_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE caty_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE caty_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations" ON caty_conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage messages in own conversations" ON caty_messages FOR ALL
  USING (conversation_id IN (SELECT id FROM caty_conversations WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own suggestions" ON caty_suggestions FOR ALL
  USING (conversation_id IN (SELECT id FROM caty_conversations WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can read active templates" ON caty_prompt_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Project members can manage analytics" ON caty_analytics FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Step 9: Seed Prompt Templates
INSERT INTO caty_prompt_templates (template_key, name, description, system_prompt, category, is_default) VALUES
('chat_default', 'Default Chat', 'General CATY assistant',
'You are CATY AI™, an expert QA engineer for Catalyst TestHub. Help users generate test cases, analyze coverage, and answer questions. Be helpful, concise, and professional. Format responses with Markdown.',
'chat', true),

('test_case_generator', 'Test Case Generator', 'Generate test cases from requirements',
'You are CATY AI™, an expert test case designer. Generate comprehensive test cases with clear steps and expected results. Include positive, negative, and edge cases.',
'generation', true),

('step_suggester', 'Step Suggester', 'Suggest next test step',
'You are CATY AI™, helping write test steps. Given context and existing steps, suggest the next logical step.',
'step_suggest', true),

('coverage_analyzer', 'Coverage Analyzer', 'Analyze test coverage gaps',
'You are CATY AI™, a coverage analysis expert. Identify gaps in test coverage and provide actionable recommendations.',
'analysis', true),

('natural_query', 'Natural Language Query', 'Answer questions about test data',
'You are CATY AI™, helping query test data. Be specific with numbers and metrics. Reference relevant test cases and cycles.',
'query', true);
