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

// =====================================================
// REQUIREMENT ASSIST V3 - Extended Types
// =====================================================

export type GenerationStatusV3 = 
  | 'draft' 
  | 'analyzing' 
  | 'generating' 
  | 'validating' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type WorkItemTypeV3 = 
  | 'prd' 
  | 'epic' 
  | 'feature' 
  | 'story' 
  | 'task' 
  | 'test_case';

export type Complexity = 'low' | 'medium' | 'high';

// =====================
// ANALYSIS INTERFACES
// =====================

export interface Analysis {
  title?: string;
  actors: Actor[];
  functions: FunctionItem[];
  nfrs: NFR[];
  integrations: Integration[];
  complexity: Complexity;
  warnings: string[];
  suggestions: string[];
}

export interface Actor {
  name: string;
  type: 'human' | 'system' | 'external';
  description?: string;
}

export interface FunctionItem {
  name: string;
  description: string;
  actor?: string;
  priority: 'must' | 'should' | 'could';
}

export interface NFR {
  category: 'performance' | 'security' | 'usability' | 'compliance' | 'reliability';
  requirement: string;
}

export interface Integration {
  system: string;
  type: 'internal' | 'external' | 'government';
  purpose: string;
}

export interface OutputConfig {
  prd: boolean;
  epics: boolean;
  features: boolean;
  stories: boolean;
  tasks: boolean;
  testCases: boolean;
}

// =====================
// UI STATE INTERFACES
// =====================

export interface GenerationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress?: number;
}

export interface TreeNode {
  id: string;
  parentId: string | null;
  type: WorkItemTypeV3;
  displayId: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string[];
  confidenceScore: number;
  isSelected: boolean;
  isExpanded: boolean;
  children: TreeNode[];
  level: number;
  sortOrder: number;
}

// =====================
// API INTERFACES
// =====================

export interface GenerateRequest {
  generationId: string;
  inputText: string;
  config: {
    programId: string | null;
    projectId: string | null;
    outputs: OutputConfig;
    compliance: string[];
  };
}

export interface GenerateResponse {
  success: boolean;
  generationId: string;
  itemCount?: number;
  error?: string;
}

// =====================
// COMPONENT PROPS
// =====================

export interface WorkItemTreeProps {
  items: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export interface DetailPanelProps {
  isOpen: boolean;
  item: TreeNode | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onRegenerate: (id: string) => void;
}

// =====================================================
// REQUIREMENT ASSIST V4 — New ra_documents Schema Types
// =====================================================

export type RaDocumentType = 'brd' | 'translation' | 'epic' | 'uat';
export type RaMethodology = 'kpmg' | 'mckinsey' | 'deloitte';
export type RaLanguage = 'en' | 'ar' | 'mixed';
export type RaStatus = 'pending' | 'generating' | 'complete' | 'failed';
export type RaVerdict = 'pass' | 'review' | null;

export interface QualityBreakdown {
  typography: number;
  dataDensity: number;
  completeness: number;
  traceability: number;
}

export interface RaDocument {
  id: string;
  type: RaDocumentType;
  title: string;
  brd_number: string | null;
  methodology: RaMethodology | null;
  language: RaLanguage;
  content: Record<string, unknown> | null;
  quality_score: number | null;
  quality_breakdown: QualityBreakdown | null;
  status: RaStatus;
  verdict: RaVerdict;
  source_doc_id: string | null;
  project_id: string | null;
  category_id: string | null;
  version: number;
  parent_version_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type RaAgentName =
  | 'REC-PARSE' | 'REC-TRANSLATE' | 'REC-CONTEXT'
  | 'REC-BRD-ARCH' | 'REC-EXTRACT' | 'REC-QA-VALID'
  | 'REC-EPIC-DECOMPOSE' | 'REC-UAT-GENERATE';

export type RaAgentStatus = 'running' | 'complete' | 'failed';

export interface RaAgentRun {
  id: string;
  document_id: string;
  agent_name: RaAgentName;
  agent_order: number;
  status: RaAgentStatus;
  started_at: string;
  completed_at: string | null;
  input_tokens: number;
  output_tokens: number;
  retry_count: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

export interface RaCategory {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  children?: RaCategory[];
}

export interface CapabilityConfig {
  key: RaDocumentType;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  bgColor: string;
  showMethodology: boolean;
  showSourceBrd: boolean;
  showTextInput: boolean;
  showUpload: boolean;
  textLabel: string;
  textPlaceholder: string;
  pipeline: RaAgentName[];
  estimatedTime: string;
  pipelineDisplay: string;
}

export const CAPABILITY_CONFIGS: Record<RaDocumentType, CapabilityConfig> = {
  brd: {
    key: 'brd',
    title: 'Generate BRD',
    description: 'Create business requirements from text or documents using KPMG, McKinsey, or Deloitte frameworks',
    icon: '📄',
    accentColor: 'var(--cap-brd)',
    bgColor: 'var(--primary-50)',
    showMethodology: true,
    showSourceBrd: false,
    showTextInput: true,
    showUpload: true,
    textLabel: 'Input Text',
    textPlaceholder: 'Paste your requirements, brief, or scope document…',
    pipeline: ['REC-PARSE', 'REC-CONTEXT', 'REC-BRD-ARCH', 'REC-EXTRACT', 'REC-QA-VALID'],
    estimatedTime: '~35s',
    pipelineDisplay: 'PARSE → CONTEXT → BRD-ARCH → EXTRACT → QA',
  },
  translation: {
    key: 'translation',
    title: 'Translate BRD',
    description: 'Translate Arabic BRDs to English with MIM domain glossary matching',
    icon: '🌐',
    accentColor: 'var(--cap-translate)',
    bgColor: 'var(--teal-50)',
    showMethodology: false,
    showSourceBrd: false,
    showTextInput: true,
    showUpload: true,
    textLabel: 'Arabic Input',
    textPlaceholder: 'الصق نص متطلبات العمل بالعربية هنا…',
    pipeline: ['REC-PARSE', 'REC-TRANSLATE', 'REC-QA-VALID'],
    estimatedTime: '~25s',
    pipelineDisplay: 'PARSE → TRANSLATE → QA-VALID',
  },
  epic: {
    key: 'epic',
    title: 'Generate Epics',
    description: 'Decompose BRDs into epics with user stories, Given/When/Then, and INVEST validation',
    icon: '🧩',
    accentColor: 'var(--cap-epic)',
    bgColor: 'var(--violet-50)',
    showMethodology: false,
    showSourceBrd: true,
    showTextInput: false,
    showUpload: false,
    textLabel: '',
    textPlaceholder: '',
    pipeline: ['REC-CONTEXT', 'REC-EPIC-DECOMPOSE', 'REC-QA-VALID'],
    estimatedTime: '~20s',
    pipelineDisplay: 'CONTEXT → EPIC-DECOMPOSE → QA-VALID',
  },
  uat: {
    key: 'uat',
    title: 'Generate UAT',
    description: 'Generate UAT test scenarios with coverage matrix and traceability',
    icon: '🧪',
    accentColor: 'var(--cap-uat)',
    bgColor: 'var(--warning-50)',
    showMethodology: false,
    showSourceBrd: true,
    showTextInput: false,
    showUpload: false,
    textLabel: '',
    textPlaceholder: '',
    pipeline: ['REC-CONTEXT', 'REC-UAT-GENERATE', 'REC-QA-VALID'],
    estimatedTime: '~20s',
    pipelineDisplay: 'CONTEXT → UAT-GENERATE → QA-VALID',
  },
};
