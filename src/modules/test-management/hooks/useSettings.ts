/**
 * Settings & Admin React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  projectSettingsApi,
  membersApi,
  rolesApi,
  customFieldsApi,
  integrationsApi,
  notificationsApi,
  auditLogApi,
  apiKeysApi,
  webhooksApi,
  type ProjectSettings,
  type MemberInvite,
  type MemberUpdate,
  type RoleCreate,
  type CustomFieldCreate,
  type AuditLogFilters,
  type ApiKeyCreate,
  type WebhookCreate,
} from '../api/settings';

// Query Keys
export const settingsKeys = {
  all: ['settings'] as const,
  project: (id: string) => [...settingsKeys.all, 'project', id] as const,
  members: (projectId: string) => [...settingsKeys.all, 'members', projectId] as const,
  roles: (projectId: string) => [...settingsKeys.all, 'roles', projectId] as const,
  customFields: (projectId: string, entity?: string) => 
    [...settingsKeys.all, 'custom-fields', projectId, entity] as const,
  integrations: (projectId: string) => [...settingsKeys.all, 'integrations', projectId] as const,
  notifications: (projectId?: string) => [...settingsKeys.all, 'notifications', projectId] as const,
  auditLog: (projectId: string, filters?: AuditLogFilters) => 
    [...settingsKeys.all, 'audit-log', projectId, filters] as const,
  apiKeys: (projectId: string) => [...settingsKeys.all, 'api-keys', projectId] as const,
  webhooks: (projectId: string) => [...settingsKeys.all, 'webhooks', projectId] as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROJECT SETTINGS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useProjectSettings(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.project(projectId),
    queryFn: () => projectSettingsApi.get(projectId),
    enabled: !!projectId,
  });
}

export function useUpdateProjectSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, settings }: { projectId: string; settings: Partial<ProjectSettings> }) =>
      projectSettingsApi.updateSettings(projectId, settings),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.project(data.id) });
      toast.success('Settings saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (projectId: string) => projectSettingsApi.archive(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.project(projectId) });
      toast.success('Project archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive project: ${error.message}`);
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (projectId: string) => projectSettingsApi.restore(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.project(projectId) });
      toast.success('Project restored');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore project: ${error.message}`);
    },
  });
}

export function useDeleteProject() {
  return useMutation({
    mutationFn: (projectId: string) => projectSettingsApi.delete(projectId),
    onSuccess: () => {
      toast.success('Project deleted');
      window.location.href = '/tests';
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM MEMBERS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.members(projectId),
    queryFn: () => membersApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, invite }: { projectId: string; invite: MemberInvite }) =>
      membersApi.invite(projectId, invite),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(projectId) });
      toast.success('Invitation sent');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invitation: ${error.message}`);
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memberId, updates, projectId }: { memberId: string; updates: MemberUpdate; projectId: string }) =>
      membersApi.update(memberId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(projectId) });
      toast.success('Member updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update member: ${error.message}`);
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memberId, projectId }: { memberId: string; projectId: string }) =>
      membersApi.remove(memberId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.members(projectId) });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove member: ${error.message}`);
    },
  });
}

export function useResendInvitation() {
  return useMutation({
    mutationFn: (memberId: string) => membersApi.resendInvitation(memberId),
    onSuccess: () => {
      toast.success('Invitation resent');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend invitation: ${error.message}`);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLES HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useProjectRoles(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.roles(projectId),
    queryFn: () => rolesApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, role }: { projectId: string; role: RoleCreate }) =>
      rolesApi.create(projectId, role),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.roles(projectId) });
      toast.success('Role created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, updates, projectId }: { roleId: string; updates: Partial<RoleCreate>; projectId: string }) =>
      rolesApi.update(roleId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.roles(projectId) });
      toast.success('Role updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, projectId }: { roleId: string; projectId: string }) =>
      rolesApi.delete(roleId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.roles(projectId) });
      toast.success('Role deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM FIELDS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useCustomFields(projectId: string, entityType?: string) {
  return useQuery({
    queryKey: settingsKeys.customFields(projectId, entityType),
    queryFn: () => customFieldsApi.list(projectId, entityType),
    enabled: !!projectId,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, field }: { projectId: string; field: CustomFieldCreate }) =>
      customFieldsApi.create(projectId, field),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.customFields(projectId) });
      toast.success('Custom field created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create field: ${error.message}`);
    },
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fieldId, updates, projectId }: { fieldId: string; updates: Partial<CustomFieldCreate>; projectId: string }) =>
      customFieldsApi.update(fieldId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.customFields(projectId) });
      toast.success('Field updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update field: ${error.message}`);
    },
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fieldId, projectId }: { fieldId: string; projectId: string }) =>
      customFieldsApi.delete(fieldId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.customFields(projectId) });
      toast.success('Field deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete field: ${error.message}`);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATIONS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useIntegrations(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.integrations(projectId),
    queryFn: () => integrationsApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      projectId, 
      integrationType, 
      config 
    }: { 
      projectId: string; 
      integrationType: string; 
      config: Record<string, unknown>;
    }) => integrationsApi.connect(projectId, integrationType, config),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.integrations(projectId) });
      toast.success('Integration connected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect integration: ${error.message}`);
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ integrationId, projectId }: { integrationId: string; projectId: string }) =>
      integrationsApi.disconnect(integrationId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.integrations(projectId) });
      toast.success('Integration disconnected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useNotificationPreferences(projectId?: string) {
  return useQuery({
    queryKey: settingsKeys.notifications(projectId),
    queryFn: () => notificationsApi.getPreferences(projectId),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      preferences, 
      projectId 
    }: { 
      preferences: Record<string, unknown>; 
      projectId?: string;
    }) => notificationsApi.updatePreferences(preferences as any, projectId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.notifications(projectId) });
      toast.success('Preferences saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save preferences: ${error.message}`);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useAuditLog(projectId: string, filters?: AuditLogFilters, limit = 50, offset = 0) {
  return useQuery({
    queryKey: settingsKeys.auditLog(projectId, filters),
    queryFn: () => auditLogApi.list(projectId, filters, limit, offset),
    enabled: !!projectId,
  });
}

export function useExportAuditLog() {
  return useMutation({
    mutationFn: ({ projectId, filters }: { projectId: string; filters?: AuditLogFilters }) =>
      auditLogApi.export(projectId, filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Audit log exported');
    },
    onError: (error: Error) => {
      toast.error(`Failed to export: ${error.message}`);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// API KEYS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useApiKeys(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.apiKeys(projectId),
    queryFn: () => apiKeysApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, apiKey }: { projectId: string; apiKey: ApiKeyCreate }) =>
      apiKeysApi.create(projectId, apiKey),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys(projectId) });
      toast.success('API key created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create API key: ${error.message}`);
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ keyId, projectId }: { keyId: string; projectId: string }) =>
      apiKeysApi.revoke(keyId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys(projectId) });
      toast.success('API key revoked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke key: ${error.message}`);
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ keyId, projectId }: { keyId: string; projectId: string }) =>
      apiKeysApi.delete(keyId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.apiKeys(projectId) });
      toast.success('API key deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete key: ${error.message}`);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOKS HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

export function useWebhooks(projectId: string) {
  return useQuery({
    queryKey: settingsKeys.webhooks(projectId),
    queryFn: () => webhooksApi.list(projectId),
    enabled: !!projectId,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, webhook }: { projectId: string; webhook: WebhookCreate }) =>
      webhooksApi.create(projectId, webhook),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks(projectId) });
      toast.success('Webhook created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create webhook: ${error.message}`);
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ webhookId, updates, projectId }: { webhookId: string; updates: Partial<WebhookCreate>; projectId: string }) =>
      webhooksApi.update(webhookId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks(projectId) });
      toast.success('Webhook updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update webhook: ${error.message}`);
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ webhookId, projectId }: { webhookId: string; projectId: string }) =>
      webhooksApi.delete(webhookId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks(projectId) });
      toast.success('Webhook deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete webhook: ${error.message}`);
    },
  });
}
