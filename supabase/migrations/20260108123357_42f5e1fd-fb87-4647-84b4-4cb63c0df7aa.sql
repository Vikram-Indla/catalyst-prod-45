-- AI Governance Tables for Caty (Capacity AI)

-- 1) ai_contracts - Main contract registry
CREATE TABLE public.ai_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2) ai_route_scopes - Allowed routes per contract
CREATE TABLE public.ai_route_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.ai_contracts(id) ON DELETE CASCADE NOT NULL,
  route TEXT NOT NULL,
  allowed_intents TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3) ai_table_allowlist - Allowed tables/columns
CREATE TABLE public.ai_table_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.ai_contracts(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT NOT NULL,
  allowed_columns TEXT[] DEFAULT '{}',
  join_keys JSONB DEFAULT '{}',
  pii_level TEXT DEFAULT 'none' CHECK (pii_level IN ('none', 'low', 'high')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) ai_semantic_dictionary - Concept mappings
CREATE TABLE public.ai_semantic_dictionary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.ai_contracts(id) ON DELETE CASCADE NOT NULL,
  canonical_concept TEXT NOT NULL,
  ui_label TEXT NOT NULL,
  synonyms TEXT[] DEFAULT '{}',
  resolution JSONB DEFAULT '[]',
  threshold FLOAT DEFAULT 0.78,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5) ai_policies - Policy configuration
CREATE TABLE public.ai_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.ai_contracts(id) ON DELETE CASCADE NOT NULL,
  policy_key TEXT NOT NULL,
  policy_value JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6) ai_governance_audit_log - Audit trail
CREATE TABLE public.ai_governance_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  contract_id UUID REFERENCES public.ai_contracts(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id UUID,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7) ai_feedback - User feedback on mappings
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  chosen_mapping JSONB,
  corrected_mapping JSONB,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_route_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_table_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_semantic_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_governance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Read for authenticated, write for admins
CREATE POLICY "Authenticated read ai_contracts" ON public.ai_contracts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ai_route_scopes" ON public.ai_route_scopes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ai_table_allowlist" ON public.ai_table_allowlist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ai_semantic_dictionary" ON public.ai_semantic_dictionary FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ai_policies" ON public.ai_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read ai_governance_audit_log" ON public.ai_governance_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert ai_feedback" ON public.ai_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated read ai_feedback" ON public.ai_feedback FOR SELECT TO authenticated USING (true);

-- Admin write policies using has_role function
CREATE POLICY "Admin write ai_contracts" ON public.ai_contracts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write ai_route_scopes" ON public.ai_route_scopes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write ai_table_allowlist" ON public.ai_table_allowlist FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write ai_semantic_dictionary" ON public.ai_semantic_dictionary FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write ai_policies" ON public.ai_policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write ai_governance_audit_log" ON public.ai_governance_audit_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_route_scopes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_table_allowlist;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_semantic_dictionary;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_policies;

-- Create indexes
CREATE INDEX idx_ai_route_scopes_contract ON public.ai_route_scopes(contract_id);
CREATE INDEX idx_ai_table_allowlist_contract ON public.ai_table_allowlist(contract_id);
CREATE INDEX idx_ai_semantic_dictionary_contract ON public.ai_semantic_dictionary(contract_id);
CREATE INDEX idx_ai_policies_contract ON public.ai_policies(contract_id);
CREATE INDEX idx_ai_governance_audit_log_contract ON public.ai_governance_audit_log(contract_id);