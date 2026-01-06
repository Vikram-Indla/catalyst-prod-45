/**
 * Settings & Admin - React Query Hooks
 * Module 5: Data fetching and mutation hooks
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
} from '../api/settingsApi';
import type {
  ProjectSettings,
  MemberInvite,
  MemberUpdate,
  RoleCreate,
  CustomFieldCreate,
  AuditLogFilters,
  ApiKeyCreate,
  WebhookCreate,
  TMProject,
} from '../types/settings';

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT SETTINGS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useProjectSettings(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-project-settings', projectId],
    queryFn: () => projectSettingsApi.get(projectId!),
    enabled: !!projectId,
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, updates }: { projectId: string; updates: Partial<TMProject> }) =>
      projectSettingsApi.update(projectId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-settings', projectId] });
      toast.success('Project updated successfully');
    },
    onError: () => {
      toast.error('Failed to update project');
    },
  });
}

export function useUpdateProjectSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, settings }: { projectId: string; settings: Partial<ProjectSettings> }) =>
      projectSettingsApi.updateSettings(projectId, settings),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-settings', projectId] });
      toast.success('Settings updated successfully');
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (projectId: string) => projectSettingsApi.archive(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-settings', projectId] });
      toast.success('Project archived');
    },
    onError: () => {
      toast.error('Failed to archive project');
    },
  });
}

export function useDeleteProject() {
  return useMutation({
    mutationFn: (projectId: string) => projectSettingsApi.delete(projectId),
    onSuccess: () => {
      toast.success('Project deleted');
    },
    onError: () => {
      toast.error('Failed to delete project');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM MEMBERS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-project-members', projectId],
    queryFn: () => membersApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, invite }: { projectId: string; invite: MemberInvite }) =>
      membersApi.invite(projectId, invite),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-members', projectId] });
      toast.success('Invitation sent successfully');
    },
    onError: () => {
      toast.error('Failed to send invitation');
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memberId, updates, projectId }: { memberId: string; updates: MemberUpdate; projectId: string }) =>
      membersApi.update(memberId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-members', projectId] });
      toast.success('Member updated');
    },
    onError: () => {
      toast.error('Failed to update member');
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memberId, projectId }: { memberId: string; projectId: string }) =>
      membersApi.remove(memberId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-members', projectId] });
      toast.success('Member removed');
    },
    onError: () => {
      toast.error('Failed to remove member');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLES HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useProjectRoles(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-project-roles', projectId],
    queryFn: () => rolesApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, role }: { projectId: string; role: RoleCreate }) =>
      rolesApi.create(projectId, role),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-roles', projectId] });
      toast.success('Role created');
    },
    onError: () => {
      toast.error('Failed to create role');
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, updates, projectId }: { roleId: string; updates: Partial<RoleCreate>; projectId: string }) =>
      rolesApi.update(roleId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-roles', projectId] });
      toast.success('Role updated');
    },
    onError: () => {
      toast.error('Failed to update role');
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roleId, projectId }: { roleId: string; projectId: string }) =>
      rolesApi.delete(roleId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-project-roles', projectId] });
      toast.success('Role deleted');
    },
    onError: () => {
      toast.error('Failed to delete role');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM FIELDS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useCustomFields(projectId: string | undefined, entityType?: string) {
  return useQuery({
    queryKey: ['tm-custom-fields', projectId, entityType],
    queryFn: () => customFieldsApi.list(projectId!, entityType),
    enabled: !!projectId,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, field }: { projectId: string; field: CustomFieldCreate }) =>
      customFieldsApi.create(projectId, field),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-custom-fields', projectId] });
      toast.success('Custom field created');
    },
    onError: () => {
      toast.error('Failed to create custom field');
    },
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fieldId, updates, projectId }: { fieldId: string; updates: Partial<CustomFieldCreate>; projectId: string }) =>
      customFieldsApi.update(fieldId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-custom-fields', projectId] });
      toast.success('Custom field updated');
    },
    onError: () => {
      toast.error('Failed to update custom field');
    },
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fieldId, projectId }: { fieldId: string; projectId: string }) =>
      customFieldsApi.delete(fieldId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-custom-fields', projectId] });
      toast.success('Custom field deleted');
    },
    onError: () => {
      toast.error('Failed to delete custom field');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATIONS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useProjectIntegrations(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-integrations', projectId],
    queryFn: () => integrationsApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, integrationType, config }: { projectId: string; integrationType: string; config: Record<string, unknown> }) =>
      integrationsApi.connect(projectId, integrationType, config),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-integrations', projectId] });
      toast.success('Integration connected');
    },
    onError: () => {
      toast.error('Failed to connect integration');
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ integrationId, projectId }: { integrationId: string; projectId: string }) =>
      integrationsApi.disconnect(integrationId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-integrations', projectId] });
      toast.success('Integration disconnected');
    },
    onError: () => {
      toast.error('Failed to disconnect integration');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useNotificationPreferences(projectId?: string) {
  return useQuery({
    queryKey: ['tm-notification-prefs', projectId],
    queryFn: () => notificationsApi.get(projectId),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ preferences, projectId }: { preferences: Record<string, unknown>; projectId?: string }) =>
      notificationsApi.update(preferences, projectId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-notification-prefs', projectId] });
      toast.success('Notification preferences updated');
    },
    onError: () => {
      toast.error('Failed to update notification preferences');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useAuditLog(projectId: string | undefined, filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ['tm-audit-log', projectId, filters],
    queryFn: () => auditLogApi.list(projectId!, filters),
    enabled: !!projectId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API KEYS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useApiKeys(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-api-keys', projectId],
    queryFn: () => apiKeysApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, keyData }: { projectId: string; keyData: ApiKeyCreate }) =>
      apiKeysApi.create(projectId, keyData),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-api-keys', projectId] });
      toast.success('API key created');
    },
    onError: () => {
      toast.error('Failed to create API key');
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ keyId, projectId }: { keyId: string; projectId: string }) =>
      apiKeysApi.revoke(keyId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-api-keys', projectId] });
      toast.success('API key revoked');
    },
    onError: () => {
      toast.error('Failed to revoke API key');
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOKS HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useWebhooks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-webhooks', projectId],
    queryFn: () => webhooksApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, webhook }: { projectId: string; webhook: WebhookCreate }) =>
      webhooksApi.create(projectId, webhook),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-webhooks', projectId] });
      toast.success('Webhook created');
    },
    onError: () => {
      toast.error('Failed to create webhook');
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ webhookId, updates, projectId }: { webhookId: string; updates: Partial<WebhookCreate>; projectId: string }) =>
      webhooksApi.update(webhookId, updates),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-webhooks', projectId] });
      toast.success('Webhook updated');
    },
    onError: () => {
      toast.error('Failed to update webhook');
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ webhookId, projectId }: { webhookId: string; projectId: string }) =>
      webhooksApi.delete(webhookId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tm-webhooks', projectId] });
      toast.success('Webhook deleted');
    },
    onError: () => {
      toast.error('Failed to delete webhook');
    },
  });
}
