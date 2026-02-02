// ═══════════════════════════════════════════════════════════════════════════════
// PLANHUB™ TYPESCRIPT TYPES v1.0.0
// ═══════════════════════════════════════════════════════════════════════════════

// ENUMS
export type PlanStatus = 'draft' | 'active' | 'review' | 'archived';
export type PlanHealth = 'ontrack' | 'atrisk' | 'critical';
export type TaskType = 'phase' | 'task' | 'milestone';
export type Sentiment = 'conservative' | 'moderate' | 'aggressive';
export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'access';
export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer';
export type PlanHubView = 'library' | 'editor' | 'compare' | 'master' | 'resources' | 'ai' | 'reports';

// DATABASE ROW TYPES
export interface PlanRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: PlanStatus;
  health: PlanHealth;
  lead_id: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  confidence: number;
  sentiment: Sentiment;
  is_master: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TaskRow {
  id: string;
  plan_id: string;
  parent_id: string | null;
  wbs: string;
  name: string;
  type: TaskType;
  days: number;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  is_flagged: boolean;
  is_expanded: boolean;
  assignee_id: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ResourceRow {
  id: string;
  plan_id: string;
  profile_id: string | null;
  name: string;
  role: string;
  assignment: string | null;
  utilization: number;
  start_date: string | null;
  end_date: string | null;
  vendor: string | null;
  skills: string[];
  is_skeleton: boolean;
  created_at: string;
  updated_at: string;
}

export interface VersionRow {
  id: string;
  plan_id: string;
  tag: string;
  notes: string | null;
  is_baseline: boolean;
  snapshot: PlanSnapshot;
  created_at: string;
  created_by: string;
}

export interface CommentRow {
  id: string;
  plan_id: string;
  task_id: string | null;
  content: string;
  created_at: string;
  created_by: string;
}

export interface ActivityLogRow {
  id: string;
  plan_id: string | null;
  action: AuditAction;
  details: Record<string, unknown>;
  user_id: string;
  created_at: string;
}

export interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration_days: number;
  phases: TemplatePhase[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIConfigRow {
  id: string;
  api_key_encrypted: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  features_enabled: AIFeatures;
  updated_at: string;
  updated_by: string | null;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

// INSERT/UPDATE TYPES
export interface PlanInsert {
  name: string;
  description?: string;
  status?: PlanStatus;
  health?: PlanHealth;
  lead_id?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  currency?: string;
  confidence?: number;
  sentiment?: Sentiment;
}

export type PlanUpdate = Partial<PlanInsert>;

export interface TaskInsert {
  plan_id: string;
  parent_id?: string;
  wbs: string;
  name: string;
  type?: TaskType;
  days?: number;
  start_date?: string;
  end_date?: string;
  progress?: number;
  is_flagged?: boolean;
  assignee_id?: string;
  notes?: string;
  position?: number;
}

export type TaskUpdate = Partial<Omit<TaskInsert, 'plan_id'>>;

export interface ResourceInsert {
  plan_id: string;
  profile_id?: string;
  name: string;
  role: string;
  assignment?: string;
  utilization?: number;
  start_date?: string;
  end_date?: string;
  vendor?: string;
  skills?: string[];
  is_skeleton?: boolean;
}

export type ResourceUpdate = Partial<Omit<ResourceInsert, 'plan_id'>>;

// COMPOSITE TYPES
export interface PlanWithLead extends PlanRow {
  lead?: ProfileRow | null;
}

export interface TaskWithAssignee extends TaskRow {
  assignee?: ProfileRow | null;
}

export interface TaskTreeNode extends TaskWithAssignee {
  children: TaskTreeNode[];
  depth: number;
}

export interface PlanSnapshot {
  plan: PlanRow;
  tasks: TaskRow[];
  resources: ResourceRow[];
}

// SETTINGS TYPES
export interface GeneralSettings {
  module_name: string;
  default_duration_days: number;
  max_tasks_per_plan: number;
  auto_save_interval_seconds: number;
  default_sentiment: Sentiment;
}

export interface FeatureSettings {
  version_control: boolean;
  auto_save: boolean;
  require_approval_delete: boolean;
  presentation_mode: boolean;
  scenario_compare: boolean;
  master_plan_view: boolean;
  resource_management: boolean;
  report_center: boolean;
}

export interface AIFeatures {
  assistant_enabled: boolean;
  suggestions_enabled: boolean;
  risk_analysis_enabled: boolean;
  critical_path_enabled: boolean;
  report_generation_enabled: boolean;
}

export interface PlanHubSettings {
  general: GeneralSettings;
  features: FeatureSettings;
}

export interface TemplatePhase {
  name: string;
  duration_days: number;
  tasks?: { name: string; type: TaskType; days: number }[];
}

// AI TYPES
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIRequest {
  plan_id: string;
  message: string;
  context?: {
    include_tasks?: boolean;
    include_resources?: boolean;
    structured_query?: string;
  };
}

export interface AIResponse {
  message: string;
  suggestions: string[];
}

// FILTER TYPES
export interface PlanFilters {
  search?: string;
  status?: PlanStatus;
  health?: PlanHealth;
  lead_id?: string;
}
