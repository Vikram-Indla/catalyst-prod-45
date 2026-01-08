/**
 * AI Governance Types
 * Caty (Capacity AI) - Governed AI System
 */

export interface AiContract {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiRouteScope {
  id: string;
  contract_id: string;
  route: string;
  allowed_intents: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiTableAllowlist {
  id: string;
  contract_id: string;
  table_name: string;
  allowed_columns: string[];
  join_keys: Record<string, string>;
  pii_level: 'none' | 'low' | 'high';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SemanticResolution {
  table: string;
  column: string;
  priority: number;
}

export interface AiSemanticDictionary {
  id: string;
  contract_id: string;
  canonical_concept: string;
  ui_label: string;
  synonyms: string[];
  resolution: SemanticResolution[];
  threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiPolicy {
  id: string;
  contract_id: string;
  policy_key: string;
  policy_value: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiGovernanceAuditLog {
  id: string;
  actor_id: string | null;
  contract_id: string | null;
  action: string;
  object_type: string;
  object_id: string | null;
  diff: Record<string, any> | null;
  created_at: string;
}

export interface AiFeedback {
  id: string;
  question: string;
  chosen_mapping: Record<string, any> | null;
  corrected_mapping: Record<string, any> | null;
  user_id: string | null;
  created_at: string;
}

// Query Planner Types
export interface SemanticMatch {
  concept: string;
  ui_label: string;
  confidence: number;
  resolution: SemanticResolution[];
}

export interface QueryPlanResult {
  authorized: boolean;
  refusalReason?: string;
  semanticMatch?: SemanticMatch;
  didYouMean?: string;
  allowedTable?: string;
  allowedColumn?: string;
}

export interface GovernedAiResponse {
  didYouMean?: string;
  directAnswer: string;
  source: string;
  notes: string[];
  confidence?: number;
  error?: boolean;
}
