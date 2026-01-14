import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type {
  IntegrationConfig,
  IntegrationType,
  DefectLink,
  DefectLinkInput,
  WebhookConfig,
  WebhookDelivery,
  SlackConfig,
  SlackChannel,
} from '@/types/integrations.types';

// Mock integration configs
const generateMockIntegrations = (projectId: string): IntegrationConfig[] => [
  {
    id: 'int-1',
    project_id: projectId,
    integration_type: 'jira',
    config: {
      url: 'https://company.atlassian.net',
      project_key: 'PROJ',
      connected: true,
    },
    is_enabled: true,
    created_by: 'user-1',
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'int-2',
    project_id: projectId,
    integration_type: 'slack',
    config: {
      workspace_name: 'Company Workspace',
      channel_name: '#testing-updates',
      connected: true,
    },
    is_enabled: true,
    created_by: 'user-1',
    created_at: '2025-11-15T00:00:00Z',
    updated_at: '2026-01-08T00:00:00Z',
  },
  {
    id: 'int-3',
    project_id: projectId,
    integration_type: 'github',
    config: {},
    is_enabled: false,
    created_by: null,
    created_at: '2025-10-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
  },
];

export function useIntegrations(projectId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['integrations', projectId],
    queryFn: async () => {
      // In production:
      // const { data, error } = await supabase
      //   .from('integration_configs')
      //   .select('*')
      //   .eq('project_id', projectId);
      
      await new Promise((resolve) => setTimeout(resolve, 300));
      return generateMockIntegrations(projectId);
    },
    enabled: !!projectId,
  });

  const updateConfig = useMutation({
    mutationFn: async ({
      type,
      config,
      isEnabled,
    }: {
      type: IntegrationType;
      config: Record<string, unknown>;
      isEnabled?: boolean;
    }) => {
      // In production:
      // const { error } = await supabase
      //   .from('integration_configs')
      //   .upsert({
      //     project_id: projectId,
      //     integration_type: type,
      //     config,
      //     is_enabled: isEnabled ?? true,
      //     updated_at: new Date().toISOString(),
      //   });
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { type, config };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', projectId] });
      toast.success('Integration updated');
    },
    onError: () => {
      toast.error('Failed to update integration');
    },
  });

  const toggleIntegration = useMutation({
    mutationFn: async ({ type, isEnabled }: { type: IntegrationType; isEnabled: boolean }) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { type, isEnabled };
    },
    onMutate: async ({ type, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: ['integrations', projectId] });
      
      queryClient.setQueryData(['integrations', projectId], (old: IntegrationConfig[] | undefined) =>
        old?.map((c) =>
          c.integration_type === type ? { ...c, is_enabled: isEnabled } : c
        )
      );
    },
    onSuccess: (_, { isEnabled }) => {
      toast.success(isEnabled ? 'Integration enabled' : 'Integration disabled');
    },
  });

  const getIntegration = (type: IntegrationType) => {
    return configs.find((c) => c.integration_type === type);
  };

  return {
    configs,
    isLoading,
    updateConfig: updateConfig.mutate,
    toggleIntegration: toggleIntegration.mutate,
    getIntegration,
    isUpdating: updateConfig.isPending,
  };
}

// Defect Links
export function useDefectLinks(cycleId: string) {
  return useQuery({
    queryKey: ['defect-links', cycleId],
    queryFn: async () => {
      // In production:
      // const { data, error } = await supabase
      //   .from('defect_links')
      //   .select('*')
      //   .eq('cycle_id', cycleId);
      
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const mockDefects: DefectLink[] = [
        {
          id: 'dl-1',
          cycle_id: cycleId,
          test_case_id: 'tc-008',
          external_id: 'JIRA-456',
          external_url: 'https://company.atlassian.net/browse/JIRA-456',
          status: 'open',
          severity: 'major',
          title: 'Payment fails with specific card types',
          synced_at: new Date().toISOString(),
          created_at: '2026-01-12T10:00:00Z',
        },
        {
          id: 'dl-2',
          cycle_id: cycleId,
          test_case_id: 'tc-015',
          external_id: 'JIRA-489',
          external_url: 'https://company.atlassian.net/browse/JIRA-489',
          status: 'in_progress',
          severity: 'critical',
          title: 'Login timeout under load',
          synced_at: new Date().toISOString(),
          created_at: '2026-01-13T14:30:00Z',
        },
        {
          id: 'dl-3',
          cycle_id: cycleId,
          test_case_id: 'tc-022',
          external_id: 'JIRA-501',
          external_url: 'https://company.atlassian.net/browse/JIRA-501',
          status: 'resolved',
          severity: 'minor',
          title: 'UI alignment issue on mobile',
          synced_at: new Date().toISOString(),
          created_at: '2026-01-14T09:15:00Z',
        },
      ];
      
      return mockDefects;
    },
    enabled: !!cycleId,
  });
}

export function useLinkDefect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DefectLinkInput) => {
      // In production, validate and fetch defect details from external system
      // then insert into defect_links table
      
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const newLink: DefectLink = {
        id: `dl-${Date.now()}`,
        cycle_id: input.cycle_id,
        test_case_id: input.test_case_id,
        external_id: input.external_id,
        external_url: input.external_url || `https://company.atlassian.net/browse/${input.external_id}`,
        status: input.status || 'open',
        severity: input.severity || null,
        title: input.title || `Defect ${input.external_id}`,
        synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      
      return newLink;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['defect-links', data.cycle_id] });
      toast.success('Defect linked successfully');
    },
    onError: () => {
      toast.error('Failed to link defect');
    },
  });
}

// Webhook
export function useWebhookConfig(projectId: string) {
  const { configs: integrations } = useIntegrations(projectId);
  
  const webhookConfig = integrations.find(
    (i) => i.integration_type === 'webhook'
  )?.config as unknown as WebhookConfig | undefined;
  
  return { webhookConfig };
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async (config: WebhookConfig) => {
      // In production, make actual HTTP request to test webhook
      
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate success/failure
      if (Math.random() > 0.1) {
        return { success: true, statusCode: 200, responseBody: '{"status":"ok"}' };
      } else {
        throw new Error('Webhook test failed');
      }
    },
    onSuccess: () => {
      toast.success('Webhook test successful');
    },
    onError: () => {
      toast.error('Webhook test failed');
    },
  });
}

export function useWebhookDeliveries(webhookId: string) {
  return useQuery({
    queryKey: ['webhook-deliveries', webhookId],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      
      const deliveries: WebhookDelivery[] = [
        {
          id: 'del-1',
          webhook_id: webhookId,
          trigger: 'cycle_completed',
          status: 'success',
          response_code: 200,
          response_body: '{"received":true}',
          delivered_at: '2026-01-14T10:00:00Z',
        },
        {
          id: 'del-2',
          webhook_id: webhookId,
          trigger: 'test_failed',
          status: 'success',
          response_code: 200,
          response_body: '{"received":true}',
          delivered_at: '2026-01-13T15:30:00Z',
        },
        {
          id: 'del-3',
          webhook_id: webhookId,
          trigger: 'cycle_started',
          status: 'failed',
          response_code: 500,
          response_body: 'Internal Server Error',
          delivered_at: '2026-01-10T09:00:00Z',
        },
      ];
      
      return deliveries;
    },
    enabled: !!webhookId,
  });
}

// Slack
export function useSlackChannels() {
  return useQuery({
    queryKey: ['slack-channels'],
    queryFn: async () => {
      // In production, fetch from Slack API
      
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const channels: SlackChannel[] = [
        { id: 'C001', name: 'testing-updates', is_private: false },
        { id: 'C002', name: 'qa-team', is_private: false },
        { id: 'C003', name: 'dev-notifications', is_private: false },
        { id: 'C004', name: 'releases', is_private: false },
        { id: 'C005', name: 'testing-private', is_private: true },
      ];
      
      return channels;
    },
  });
}

export function useSlackTestMessage() {
  return useMutation({
    mutationFn: async ({ channelId, message }: { channelId: string; message: string }) => {
      // In production, send test message via Slack API
      
      await new Promise((resolve) => setTimeout(resolve, 800));
      return { success: true };
    },
    onSuccess: () => {
      toast.success('Test message sent to Slack');
    },
    onError: () => {
      toast.error('Failed to send test message');
    },
  });
}
