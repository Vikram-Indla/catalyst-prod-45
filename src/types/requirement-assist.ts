// =====================================================
// REQUIREMENT ASSIST™ - TypeScript Type Definitions
// Matches Supabase ra_* tables
// =====================================================

export type GenerationStatus = 'draft' | 'processing' | 'published' | 'failed';
export type ItemType = 'prd' | 'epic' | 'feature' | 'story';
export type TemplateType = 'prd' | 'epic' | 'feature' | 'story';
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';
export type ComplianceFramework = 'dga' | 'nca' | 'babok';

export interface RAGeneration {
  id: string;
  generation_number: number;
  display_id: string;
  title: string;
  status: GenerationStatus;
  program_id?: string;
  project_id?: string;
  user_id?: string;
  input_text?: string;
  input_file_url?: string;
  input_file_name?: string;
  input_word_count: number;
  ai_model: string;
  temperature: number;
  max_tokens: number;
  tokens_used: number;
  processing_time_ms?: number;
  output_prd: boolean;
  output_epics: boolean;
  output_features: boolean;
  output_stories: boolean;
  output_test_cases: boolean;
  output_acceptance_criteria: boolean;
  compliance_dga: boolean;
  compliance_nca: boolean;
  compliance_babok: boolean;
  created_at: string;
  updated_at: string;
  published_at?: string;
  deleted_at?: string;
}

export interface RAGeneratedItem {
  id: string;
  generation_id: string;
  item_type: ItemType;
  item_number: number;
  display_id: string;
  title: string;
  description?: string;
  acceptance_criteria?: string;
  parent_id?: string;
  sort_order: number;
  confidence_score?: number;
  confidence_breakdown?: Record<string, number>;
  compliance_results?: Record<string, any>;
  is_published: boolean;
  is_linked: boolean;
  external_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RATemplate {
  id: string;
  name: string;
  template_type: TemplateType;
  description?: string;
  template_content: string;
  version: string;
  is_default: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RAGlossaryTerm {
  id: string;
  english_term: string;
  arabic_translation: string;
  category: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RAAISettings {
  id: string;
  ai_model: string;
  temperature: number;
  max_tokens: number;
  system_prompt?: string;
  auto_translation: boolean;
  compliance_validation: boolean;
  confidence_scoring: boolean;
  draft_auto_save: boolean;
  primary_language: string;
  secondary_language: string;
  auto_detect_language: boolean;
  created_at: string;
  updated_at: string;
}

export interface RAComplianceRule {
  id: string;
  framework: ComplianceFramework;
  rule_code: string;
  rule_name: string;
  rule_description?: string;
  validation_prompt?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RAUserRole {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface RAAnalyticsDaily {
  id: string;
  date: string;
  generations_count: number;
  items_generated: number;
  avg_confidence?: number;
  avg_processing_time_ms?: number;
  total_tokens_used: number;
  created_at: string;
}

// Generation with related items (for detail views)
export interface RAGenerationWithItems extends RAGeneration {
  items: RAGeneratedItem[];
}

// Stats for dashboard
export interface RAGenerationStats {
  total: number;
  published: number;
  draft: number;
  failed: number;
  processing: number;
}

// Create/Update DTOs
export type CreateRAGeneration = Omit<RAGeneration, 'id' | 'generation_number' | 'display_id' | 'created_at' | 'updated_at'>;
export type UpdateRAGeneration = Partial<Omit<RAGeneration, 'id' | 'generation_number' | 'display_id' | 'created_at'>>;

export type CreateRAGeneratedItem = Omit<RAGeneratedItem, 'id' | 'item_number' | 'display_id' | 'created_at' | 'updated_at'>;
export type UpdateRAGeneratedItem = Partial<Omit<RAGeneratedItem, 'id' | 'item_number' | 'display_id' | 'created_at'>>;

export type CreateRATemplate = Omit<RATemplate, 'id' | 'created_at' | 'updated_at'>;
export type UpdateRATemplate = Partial<Omit<RATemplate, 'id' | 'created_at'>>;

export type CreateRAGlossaryTerm = Omit<RAGlossaryTerm, 'id' | 'created_at' | 'updated_at'>;
export type UpdateRAGlossaryTerm = Partial<Omit<RAGlossaryTerm, 'id' | 'created_at'>>;

export type UpdateRAAISettings = Partial<Omit<RAAISettings, 'id' | 'created_at'>>;

export type UpdateRAComplianceRule = Partial<Omit<RAComplianceRule, 'id' | 'created_at'>>;
