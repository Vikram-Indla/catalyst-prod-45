/**
 * Settings & Admin - API Service
 * Module 5: Supabase API layer for settings management
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  TMProject,
  ProjectSettings,
  ProjectMember,
  MemberInvite,
  MemberUpdate,
  ProjectRole,
  RoleCreate,
  CustomFieldDefinition,
  CustomFieldCreate,
  ProjectIntegration,
  NotificationPreferences,
  AuditLogEntry,
  AuditLogFilters,
  ApiKey,
  ApiKeyCreate,
  Webhook,
  WebhookCreate,
} from '../types/settings';

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT SETTINGS API
// ─────────────────────────────────────────────────────────────────────────────

export const projectSettingsApi = {
  async get(projectId: string): Promise<TMProject> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (error) throw error;
    return data as unknown as TMProject;
  },
  
  async update(projectId: string, updates: Partial<TMProject>): Promise<TMProject> {
    const { name, description, key } = updates;
    const { data, error } = await supabase
      .from('projects')
      .update({ name, description, key })
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as TMProject;
  },
  
  async updateSettings(projectId: string, settings: Partial<ProjectSettings>): Promise<TMProject> {
    const { data: current } = await supabase
      .from('projects')
      .select('settings')
      .eq('id', projectId)
      .single();
    
    const currentSettings = (current?.settings || {}) as Record<string, unknown>;
    const newSettings = { ...currentSettings, ...settings };
    
    const { data, error } = await supabase
      .from('projects')
      .update({ settings: newSettings })
      .eq('id', projectId)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as TMProject;
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

// ─────────────────────────────────────────────────────────────────────────────
// TEAM MEMBERS API
// ─────────────────────────────────────────────────────────────────────────────

export const membersApi = {
  async list(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return (data || []) as unknown as ProjectMember[];
  },
  
  async invite(projectId: string, invite: MemberInvite): Promise<ProjectMember> {
    const { data: { user } } = await supabase.auth.getUser();
    
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

// ─────────────────────────────────────────────────────────────────────────────
// ROLES API
// ─────────────────────────────────────────────────────────────────────────────

export const rolesApi = {
  async list(projectId: string): Promise<ProjectRole[]> {
    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });
    
    if (error) throw error;
    return (data || []) as unknown as ProjectRole[];
  },
  
  async create(projectId: string, role: RoleCreate): Promise<ProjectRole> {
    const insertData = {
      project_id: projectId,
      name: role.name,
      description: role.description,
      color: role.color,
      icon: role.icon,
      permissions: role.permissions as unknown as Record<string, unknown>,
      is_system: false
    };
    
    const { data, error } = await supabase
      .from('project_roles')
      .insert(insertData as never)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as ProjectRole;
  },
  
  async update(roleId: string, updates: Partial<RoleCreate>): Promise<ProjectRole> {
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
    
    const { data, error } = await supabase
      .from('project_roles')
      .update(updateData)
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
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM FIELDS API
// ─────────────────────────────────────────────────────────────────────────────

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
    return (data || []) as unknown as CustomFieldDefinition[];
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
      .insert(insertData as never)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as CustomFieldDefinition;
  },
  
  async update(fieldId: string, updates: Partial<CustomFieldCreate>): Promise<CustomFieldDefinition> {
    const updateData: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) updateData[key] = value;
    });
    
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

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATIONS API
// ─────────────────────────────────────────────────────────────────────────────

export const integrationsApi = {
  async list(projectId: string): Promise<ProjectIntegration[]> {
    const { data, error } = await supabase
      .from('project_integrations')
      .select('*')
      .eq('project_id', projectId);
    
    if (error) throw error;
    return (data || []) as unknown as ProjectIntegration[];
  },
  
  async connect(projectId: string, integrationType: string, config: Record<string, unknown>): Promise<ProjectIntegration> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const upsertData = {
      project_id: projectId,
      integration_type: integrationType,
      config,
      status: 'connected',
      connected_at: new Date().toISOString(),
      connected_by: user?.id
    };
    
    const { data, error } = await supabase
      .from('project_integrations')
      .upsert(upsertData as never)
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
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS API
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsApi = {
  async get(projectId?: string): Promise<NotificationPreferences | null> {
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
  
  async update(preferences: Partial<NotificationPreferences>, projectId?: string): Promise<NotificationPreferences> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const upsertData = {
      user_id: user.id,
      project_id: projectId || null,
      email_enabled: preferences.email_enabled,
      email_digest: preferences.email_digest,
      in_app_enabled: preferences.in_app_enabled,
      slack_enabled: preferences.slack_enabled,
      slack_dm: preferences.slack_dm,
      preferences: preferences.preferences as unknown as Record<string, unknown>,
      quiet_hours_enabled: preferences.quiet_hours_enabled,
      quiet_hours_start: preferences.quiet_hours_start,
      quiet_hours_end: preferences.quiet_hours_end,
    };
    
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(upsertData as never)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as NotificationPreferences;
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG API
// ─────────────────────────────────────────────────────────────────────────────

export const auditLogApi = {
  async list(projectId: string, filters?: AuditLogFilters, limit = 50): Promise<AuditLogEntry[]> {
    let query = supabase
      .from('tm_audit_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
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
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as AuditLogEntry[];
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// API KEYS API
// ─────────────────────────────────────────────────────────────────────────────

export const apiKeysApi = {
  async list(projectId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as unknown as ApiKey[];
  },
  
  async create(projectId: string, keyData: ApiKeyCreate): Promise<ApiKey> {
    const { data: { user } } = await supabase.auth.getUser();
    const fullKey = `tm_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyPrefix = fullKey.substring(0, 10);
    
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        project_id: projectId,
        name: keyData.name,
        key_prefix: keyPrefix,
        key_hash: fullKey,
        scopes: keyData.scopes,
        expires_at: keyData.expires_at,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return { ...(data as unknown as ApiKey), key: fullKey } as ApiKey & { key: string };
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

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOKS API
// ─────────────────────────────────────────────────────────────────────────────

export const webhooksApi = {
  async list(projectId: string): Promise<Webhook[]> {
    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as unknown as Webhook[];
  },
  
  async create(projectId: string, webhook: WebhookCreate): Promise<Webhook> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        project_id: projectId,
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret,
        events: webhook.events,
        created_by: user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as Webhook;
  },
  
  async update(webhookId: string, updates: Partial<WebhookCreate>): Promise<Webhook> {
    const updateData: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) updateData[key] = value;
    });
    
    const { data, error } = await supabase
      .from('webhooks')
      .update(updateData)
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
  
  async toggle(webhookId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('webhooks')
      .update({ is_active: isActive })
      .eq('id', webhookId);
    
    if (error) throw error;
  },
};
