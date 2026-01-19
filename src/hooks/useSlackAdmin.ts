// ============================================================
// CATALYST SLACK ADMIN - useSlackAdmin Hook
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================================
// TYPES
// ============================================================

export interface SlackConfig {
  id: string;
  app_id: string | null;
  client_id: string;
  redirect_uri: string;
  bot_scopes: string[];
  workspace_id: string | null;
  workspace_name: string | null;
  workspace_icon_url: string | null;
  is_active: boolean;
  is_configured: boolean;
  default_channel_id: string | null;
  default_channel_name: string | null;
  send_dm_by_default: boolean;
  send_to_channel: boolean;
  routing_rules: RoutingRule[];
  configured_at: string | null;
  last_tested_at: string | null;
  last_test_status: 'success' | 'failed' | null;
}

export interface RoutingRule {
  entity_type: string;
  channel_id: string;
  channel_name: string;
}

export interface SlackStats {
  total_connected_users: number;
  active_connected_users: number;
  total_notifications_sent: number;
  notifications_last_24h: number;
  notifications_last_7d: number;
  failed_notifications_24h: number;
}

export interface SlackUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  slack_user_id: string;
  slack_team_id: string;
  slack_team_name: string;
  is_active: boolean;
  connected_at: string;
  disconnected_at: string | null;
  notifications_sent: number;
  last_notification_at: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_id: string;
  actor_email: string;
  target_user_id: string | null;
  target_user_email: string | null;
  details: Record<string, any>;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members: number;
}

// ============================================================
// API HELPERS
// ============================================================

async function slackAdminFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const response = await fetch(`${baseUrl}/functions/v1/slack-admin/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Get Slack configuration
 */
export function useSlackConfig() {
  return useQuery({
    queryKey: ['slack-admin', 'config'],
    queryFn: async () => {
      const data = await slackAdminFetch<{ config: SlackConfig | null }>('config');
      return data.config;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Save Slack configuration
 */
export function useSaveSlackConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      app_id?: string;
      client_id: string;
      client_secret: string;
      signing_secret?: string;
      redirect_uri: string;
      bot_scopes?: string[];
      send_dm_by_default?: boolean;
      send_to_channel?: boolean;
      include_deep_links?: boolean;
      rich_formatting?: boolean;
    }) => {
      return slackAdminFetch<{ success: boolean; config_id: string }>('config', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-admin'] });
      toast.success('Slack configuration saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}

/**
 * Get Slack integration stats
 */
export function useSlackStats() {
  return useQuery({
    queryKey: ['slack-admin', 'stats'],
    queryFn: async () => {
      const data = await slackAdminFetch<{ stats: SlackStats }>('stats');
      return data.stats;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Get connected users
 */
export function useSlackUsers() {
  return useQuery({
    queryKey: ['slack-admin', 'users'],
    queryFn: async () => {
      const data = await slackAdminFetch<{ users: SlackUser[] }>('users');
      return data.users;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Disconnect a user
 */
export function useDisconnectSlackUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      return slackAdminFetch<{ success: boolean }>('users', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: userId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['slack-admin', 'stats'] });
      toast.success('User disconnected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });
}

/**
 * Get audit logs
 */
export function useSlackAuditLogs(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['slack-admin', 'audit', limit, offset],
    queryFn: async () => {
      const data = await slackAdminFetch<{ logs: AuditLog[]; total: number }>(
        `audit?limit=${limit}&offset=${offset}`
      );
      return data;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Test Slack connection
 */
export function useTestSlackConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { target_user_id?: string; test_message?: string }) => {
      return slackAdminFetch<{ success: boolean; message_ts?: string }>('test', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-admin', 'config'] });
      toast.success('Test notification sent!');
    },
    onError: (error: Error) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });
}

/**
 * Get install URL
 */
export function useSlackInstallUrl() {
  return useMutation({
    mutationFn: async () => {
      return slackAdminFetch<{ url: string; state: string }>('install', {
        method: 'POST',
      });
    },
  });
}

/**
 * Handle install callback
 */
export function useSlackInstallCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      return slackAdminFetch<{ success: boolean; workspace_name: string }>('install-callback', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slack-admin'] });
      toast.success(`Connected to ${data.workspace_name}!`);
    },
    onError: (error: Error) => {
      toast.error(`Install failed: ${error.message}`);
    },
  });
}

/**
 * Get Slack channels
 */
export function useSlackChannels() {
  return useQuery({
    queryKey: ['slack-admin', 'channels'],
    queryFn: async () => {
      const data = await slackAdminFetch<{ channels: SlackChannel[] }>('channels');
      return data.channels;
    },
    staleTime: 5 * 60 * 1000,
    enabled: false,
  });
}

/**
 * Update routing rules
 */
export function useUpdateSlackRouting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      routing_rules?: RoutingRule[];
      default_channel_id?: string;
      default_channel_name?: string;
    }) => {
      return slackAdminFetch<{ success: boolean }>('routing', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-admin', 'config'] });
      toast.success('Routing rules updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update routing: ${error.message}`);
    },
  });
}
