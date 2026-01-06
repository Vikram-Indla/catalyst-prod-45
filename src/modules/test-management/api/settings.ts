/**
 * Settings & Admin API
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ProjectMember,
  ProjectRole,
  CustomFieldDefinition,
  ProjectIntegration,
  NotificationPreferences,
  AuditLogEntry,
  ApiKey,
  Webhook,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

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

export interface Project {
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

export const projectSettingsApi = {
  async get(projectId: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return data as unknown as Project;
  },
  
  async updateSettings(projectId: string, settings: Partial<ProjectSettings>): Promise<Project> {
    const { data: current } = await supabase
      .from('projects')
      .select('settings')
      .eq('id', projectId)
      .single();
    
    const currentSettings = (current?.settings as Record<string, unknown>) || {};
    const mergedSettings = { ...currentSettings, ...settings };
    
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        settings: mergedSettings
      } as any)
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as Project;
  },
  
  async archive(projectId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('projects')
      .update({ 
        archived_at: new Date().toISOString(),
        archived_by: user?.id
      })
      .eq('id', projectId);
    
    if (error) throw error;
  },
  
  async restore(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ 
        archived_at: null,
        archived_by: null
      })
      .eq('id', projectId);
    
    if (error) throw error;
  },
  
  async delete(projectId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (error) throw error;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM MEMBERS
// ═══════════════════════════════════════════════════════════════════════════════

export type MemberRole = 'admin' | 'lead' | 'member' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'inactive' | 'removed';

export interface MemberInvite {
  email: string;
  role: MemberRole;
  message?: string;
}

export interface MemberUpdate {
  role?: MemberRole;
  status?: MemberStatus;
}

export const membersApi = {
  async list(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profile:profiles(id, full_name, email, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data as unknown as ProjectMember[];
  },
  
  async invite(projectId: string, invite: MemberInvite): Promise<ProjectMember> {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', invite.email)
      .single();
    
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: existingUser?.id || null,
        email: invite.email,
        role: invite.role,
        status: existingUser ? 'active' : 'pending',
        invited_by: user?.id,
        accepted_at: existingUser ? new Date().toISOString() : null,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as ProjectMember;
  },
  
  async update(memberId: string, updates: MemberUpdate): Promise<ProjectMember> {
    const { data, error } = await supabase
      .from('project_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as ProjectMember;
  },
  
  async remove(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);
    
    if (error) throw error;
  },
  
  async resendInvitation(memberId: string): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .update({ 
        invitation_token: crypto.randomUUID(),
        invited_at: new Date().toISOString()
      })
      .eq('id', memberId);
    
    if (error) throw error;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RolePermissions {
  [key: string]: boolean;
}

export interface RoleCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  permissions: RolePermissions;
}

export const rolesApi = {
  async list(projectId: string): Promise<ProjectRole[]> {
    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data as unknown as ProjectRole[];
  },
  
  async create(projectId: string, role: RoleCreate): Promise<ProjectRole> {
    const { data, error } = await supabase
      .from('project_roles')
      .insert({
        project_id: projectId,
        ...role,
        is_system: false
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as ProjectRole;
  },
  
  async update(roleId: string, updates: Partial<RoleCreate>): Promise<ProjectRole> {
    const { data, error } = await supabase
      .from('project_roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as ProjectRole;
  },
  
  async delete(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('project_roles')
      .delete()
      .eq('id', roleId)
      .eq('is_system', false);
    
    if (error) throw error;
  },
  
  async initializeDefaultRoles(projectId: string): Promise<void> {
    await supabase.rpc('create_default_project_roles', {
      p_project_id: projectId
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM FIELDS
// ═══════════════════════════════════════════════════════════════════════════════

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

export const customFieldsApi = {
  async list(projectId: string, entityType?: string): Promise<CustomFieldDefinition[]> {
    let query = supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });
    
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data as unknown as CustomFieldDefinition[];
  },
  
  async create(projectId: string, field: CustomFieldCreate): Promise<CustomFieldDefinition> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const insertData = {
      project_id: projectId,
      name: field.name,
      field_key: field.field_key,
      description: field.description,
      field_type: field.field_type,
      entity_type: field.entity_type,
      options: field.options as unknown as Record<string, unknown>[],
      is_required: field.is_required,
      default_value: field.default_value,
      validation_regex: field.validation_regex,
      min_value: field.min_value,
      max_value: field.max_value,
      sort_order: field.sort_order,
      is_visible: field.is_visible,
      show_in_list: field.show_in_list,
      created_by: user?.id
    };
    
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .insert(insertData as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as CustomFieldDefinition;
  },
  
  async update(fieldId: string, updates: Partial<CustomFieldCreate>): Promise<CustomFieldDefinition> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.field_key !== undefined) updateData.field_key = updates.field_key;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.field_type !== undefined) updateData.field_type = updates.field_type;
    if (updates.entity_type !== undefined) updateData.entity_type = updates.entity_type;
    if (updates.options !== undefined) updateData.options = updates.options as unknown as Record<string, unknown>[];
    if (updates.is_required !== undefined) updateData.is_required = updates.is_required;
    if (updates.default_value !== undefined) updateData.default_value = updates.default_value;
    if (updates.validation_regex !== undefined) updateData.validation_regex = updates.validation_regex;
    if (updates.min_value !== undefined) updateData.min_value = updates.min_value;
    if (updates.max_value !== undefined) updateData.max_value = updates.max_value;
    if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
    if (updates.is_visible !== undefined) updateData.is_visible = updates.is_visible;
    if (updates.show_in_list !== undefined) updateData.show_in_list = updates.show_in_list;
    
    const { data, error } = await supabase
      .from('custom_field_definitions')
      .update(updateData)
      .eq('id', fieldId)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as CustomFieldDefinition;
  },
  
  async delete(fieldId: string): Promise<void> {
    const { error } = await supabase
      .from('custom_field_definitions')
      .delete()
      .eq('id', fieldId);
    
    if (error) throw error;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS
// ═══════════════════════════════════════════════════════════════════════════════

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

export const integrationsApi = {
  async list(projectId: string): Promise<ProjectIntegration[]> {
    const { data, error } = await supabase
      .from('project_integrations')
      .select(`
        *,
        connected_by_profile:profiles(id, full_name)
      `)
      .eq('project_id', projectId);
    
    if (error) throw error;
    return data as unknown as ProjectIntegration[];
  },
  
  async connect(
    projectId: string, 
    integrationType: string, 
    config: Record<string, unknown>
  ): Promise<ProjectIntegration> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('project_integrations')
      .upsert({
        project_id: projectId,
        integration_type: integrationType,
        config,
        status: 'connected',
        connected_at: new Date().toISOString(),
        connected_by: user?.id
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as ProjectIntegration;
  },
  
  async disconnect(integrationId: string): Promise<void> {
    const { error } = await supabase
      .from('project_integrations')
      .update({ 
        status: 'disconnected',
        config: {}
      })
      .eq('id', integrationId);
    
    if (error) throw error;
  },
  
  async testConnection(integrationId: string): Promise<{ success: boolean; error?: string }> {
    // Placeholder - implement actual connection test
    return { success: true };
  },
  
  async sync(integrationId: string): Promise<void> {
    await supabase
      .from('project_integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success'
      })
      .eq('id', integrationId);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type EmailDigest = 'instant' | 'daily' | 'weekly' | 'none';

export const notificationsApi = {
  async getPreferences(projectId?: string): Promise<NotificationPreferences | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id);
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    } else {
      query = query.is('project_id', null);
    }
    
    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data as unknown as NotificationPreferences | null;
  },
  
  async updatePreferences(
    preferences: Partial<NotificationPreferences>,
    projectId?: string
  ): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        project_id: projectId || null,
        ...preferences
      } as any)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as NotificationPreferences;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

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

export interface AuditLogFilters {
  action?: AuditAction;
  entity_type?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export const auditLogApi = {
  async list(
    projectId: string,
    filters?: AuditLogFilters,
    limit = 50,
    offset = 0
  ): Promise<{ entries: AuditLogEntry[]; total: number }> {
    let query = supabase
      .from('project_audit_logs')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type);
    }
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    return { entries: (data || []) as unknown as AuditLogEntry[], total: count || 0 };
  },
  
  async export(projectId: string, filters?: AuditLogFilters): Promise<Blob> {
    const { entries } = await this.list(projectId, filters, 10000, 0);
    
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity Name', 'Changes'].join(','),
      ...entries.map(e => [
        e.created_at,
        e.actor_name || 'System',
        e.action,
        e.entity_type,
        e.field_changed || '',
        JSON.stringify({ old: e.old_value, new: e.new_value })
      ].join(','))
    ].join('\n');
    
    return new Blob([csv], { type: 'text/csv' });
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════════════════════════════════════

export type ApiScope = 'read' | 'write' | 'execute' | 'admin';

export interface ApiKeyCreate {
  name: string;
  scopes: ApiScope[];
  expires_at?: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export const apiKeysApi = {
  async list(projectId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as unknown as ApiKey[];
  },
  
  async create(projectId: string, apiKey: ApiKeyCreate): Promise<ApiKeyCreated> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const fullKey = `ctm_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyPrefix = fullKey.substring(0, 10);
    const keyHash = await hashKey(fullKey);
    
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        project_id: projectId,
        ...apiKey,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return { ...(data as unknown as ApiKey), key: fullKey };
  },
  
  async revoke(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId);
    
    if (error) throw error;
  },
  
  async delete(keyId: string): Promise<void> {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);
    
    if (error) throw error;
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

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

export interface WebhookCreate {
  name: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
}

export const webhooksApi = {
  async list(projectId: string): Promise<Webhook[]> {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as unknown as Webhook[];
  },
  
  async create(projectId: string, webhook: WebhookCreate): Promise<Webhook> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        project_id: projectId,
        ...webhook,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as Webhook;
  },
  
  async update(webhookId: string, updates: Partial<WebhookCreate>): Promise<Webhook> {
    const { data, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('id', webhookId)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as Webhook;
  },
  
  async delete(webhookId: string): Promise<void> {
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);
    
    if (error) throw error;
  },
  
  async test(webhookId: string): Promise<{ success: boolean; response_code: number }> {
    // Placeholder - implement actual webhook test
    return { success: true, response_code: 200 };
  },
};
