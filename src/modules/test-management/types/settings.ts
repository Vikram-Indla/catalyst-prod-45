/**
 * Settings & Admin - Type Definitions
 * Module 5: Complete type system for settings management
 */

// ─────────────────────────────────────────────────────────────────────────────
// Project Settings
// ─────────────────────────────────────────────────────────────────────────────

export interface ProjectSettings {
  default_test_case_prefix: string;
  default_defect_prefix: string;
  default_cycle_prefix: string;
  timezone: string;
  date_format: string;
  language: 'en' | 'ar';
  require_test_case_review: boolean;
  auto_close_defects_on_pass: boolean;
  default_priority: string;
  default_severity: string;
}

export interface TMProject {
  id: string;
  name: string;
  key: string;
  description: string | null;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Team Members
// ─────────────────────────────────────────────────────────────────────────────

export type MemberRole = 'admin' | 'lead' | 'member' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'inactive' | 'removed';
export type OnlineStatus = 'online' | 'away' | 'offline';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string | null;
  role: MemberRole;
  email: string | null;
  invitation_token: string | null;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  status: MemberStatus;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  invited_by_profile?: {
    id: string;
    full_name: string | null;
  };
}

export interface MemberInvite {
  email: string;
  role: MemberRole;
  message?: string;
}

export interface MemberUpdate {
  role?: MemberRole;
  status?: MemberStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Roles & Permissions
// ─────────────────────────────────────────────────────────────────────────────

export interface Permission {
  key: string;
  label: string;
  description: string;
  category: string;
}

export interface RolePermissions {
  'project.settings': boolean;
  'project.members.invite': boolean;
  'project.members.remove': boolean;
  'project.members.edit_role': boolean;
  'project.delete': boolean;
  'test_cases.create': boolean;
  'test_cases.edit': boolean;
  'test_cases.delete': boolean;
  'test_cases.execute': boolean;
  'cycles.create': boolean;
  'cycles.manage': boolean;
  'defects.create': boolean;
  'defects.edit': boolean;
  'defects.resolve': boolean;
  'defects.delete': boolean;
  'reports.view': boolean;
  'reports.export': boolean;
  'integrations.manage': boolean;
  'custom_fields.manage': boolean;
  'audit_log.view': boolean;
}

export interface ProjectRole {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_system: boolean;
  permissions: RolePermissions;
  created_at: string;
  updated_at: string;
}

export interface RoleCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions: RolePermissions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Fields
// ─────────────────────────────────────────────────────────────────────────────

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multi_select'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'user';

export type FieldEntity = 'test_case' | 'test_cycle' | 'defect' | 'test_run';

export interface FieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface CustomFieldDefinition {
  id: string;
  project_id: string;
  name: string;
  field_key: string;
  description: string | null;
  field_type: FieldType;
  entity_type: FieldEntity;
  options: FieldOption[];
  is_required: boolean;
  default_value: string | null;
  validation_regex: string | null;
  min_value: number | null;
  max_value: number | null;
  sort_order: number;
  is_visible: boolean;
  show_in_list: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CustomFieldCreate {
  name: string;
  field_key: string;
  description?: string;
  field_type: FieldType;
  entity_type: FieldEntity;
  options?: FieldOption[];
  is_required?: boolean;
  default_value?: string;
  validation_regex?: string;
  min_value?: number;
  max_value?: number;
  sort_order?: number;
  is_visible?: boolean;
  show_in_list?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Integrations
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrationType = 
  | 'jira'
  | 'slack'
  | 'github'
  | 'azure_devops'
  | 'jenkins'
  | 'microsoft_teams'
  | 'gitlab'
  | 'bitbucket';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface JiraConfig {
  base_url: string;
  project_key: string;
  api_token: string;
  email: string;
  sync_settings: {
    import_issues: boolean;
    sync_defects: boolean;
    link_test_cases: boolean;
  };
}

export interface SlackConfig {
  webhook_url: string;
  channel: string;
  notifications: {
    test_failures: boolean;
    cycle_completed: boolean;
    defects_created: boolean;
  };
}

export interface ProjectIntegration {
  id: string;
  project_id: string;
  integration_type: IntegrationType;
  name: string | null;
  status: IntegrationStatus;
  config: JiraConfig | SlackConfig | Record<string, unknown>;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  connected_at: string | null;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
  connected_by_profile?: { id: string; full_name: string };
}

export interface IntegrationMetadata {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export type EmailDigest = 'instant' | 'daily' | 'weekly' | 'none';

export interface NotificationTypes {
  test_assigned: boolean;
  test_completed: boolean;
  test_failed: boolean;
  cycle_started: boolean;
  cycle_completed: boolean;
  defect_assigned: boolean;
  defect_resolved: boolean;
  defect_commented: boolean;
  mentioned: boolean;
  member_joined: boolean;
  member_left: boolean;
  weekly_digest: boolean;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  project_id: string | null;
  email_enabled: boolean;
  email_digest: EmailDigest;
  in_app_enabled: boolean;
  slack_enabled: boolean;
  slack_dm: boolean;
  preferences: NotificationTypes;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'invite'
  | 'join'
  | 'leave'
  | 'archive'
  | 'restore'
  | 'export'
  | 'import'
  | 'connect'
  | 'disconnect';

export interface AuditLogChange {
  field: string;
  old: unknown;
  new: unknown;
}

export interface AuditLogEntry {
  id: string;
  project_id: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  changes: AuditLogChange[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditLogFilters {
  action?: AuditAction;
  entity_type?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Keys & Webhooks
// ─────────────────────────────────────────────────────────────────────────────

export type ApiScope = 'read' | 'write' | 'execute' | 'admin';

export interface ApiKey {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  scopes: ApiScope[];
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  expires_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ApiKeyCreate {
  name: string;
  scopes: ApiScope[];
  expires_at?: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export type WebhookEvent = 
  | 'test_case.created'
  | 'test_case.updated'
  | 'test_case.deleted'
  | 'cycle.started'
  | 'cycle.completed'
  | 'run.completed'
  | 'defect.created'
  | 'defect.resolved'
  | 'member.joined'
  | 'member.left';

export interface Webhook {
  id: string;
  project_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: WebhookEvent[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_response_code: number | null;
  failure_count: number;
  created_at: string;
  created_by: string | null;
}

export interface WebhookCreate {
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings Tab Navigation
// ─────────────────────────────────────────────────────────────────────────────

export type SettingsTab = 
  | 'general'
  | 'team'
  | 'roles'
  | 'security'
  | 'custom-fields'
  | 'workflows'
  | 'templates'
  | 'integrations'
  | 'notifications'
  | 'api'
  | 'audit-log'
  | 'usage-billing';

// ─────────────────────────────────────────────────────────────────────────────
// Security Settings
// ─────────────────────────────────────────────────────────────────────────────

export interface SecuritySettings {
  two_factor_required: boolean;
  session_timeout_minutes: number;
  ip_whitelist_enabled: boolean;
  ip_whitelist: string[];
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_numbers: boolean;
    require_symbols: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage & Billing
// ─────────────────────────────────────────────────────────────────────────────

export interface UsageStats {
  test_cases_count: number;
  test_runs_count: number;
  defects_count: number;
  storage_used_mb: number;
  api_calls_this_month: number;
}

export interface BillingInfo {
  plan: 'free' | 'pro' | 'enterprise';
  billing_cycle: 'monthly' | 'annual';
  next_billing_date: string | null;
  seats_used: number;
  seats_available: number;
}
