import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JiraConnection {
  id: string;
  site_url: string;
  auth_method: 'api_token' | 'oauth2';
  auth_email: string;
  auth_token_encrypted: string;
  status: 'not_configured' | 'testing' | 'connected' | 'error';
  last_tested_at: string | null;
  last_test_result: any;
  project_count: number;
  accessible_projects: Array<{ key: string; name: string; type: string }>;
  permissions_level: string;
  total_issue_count: number;
  total_version_count: number;
  configured_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useJiraConnection() {
  return useQuery({
    queryKey: ['wh', 'jira-connection'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_jira_connection')
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as JiraConnection;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useUpdateJiraConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      site_url: string;
      auth_method: 'api_token' | 'oauth2';
      auth_email: string;
      auth_token_encrypted: string;
    }) => {
      // Route through edge function for server-side encryption
      const { data, error } = await supabase.functions.invoke('wh-save-connection', {
        body: {
          site_url: input.site_url,
          auth_method: input.auth_method,
          auth_email: input.auth_email,
          auth_token: input.auth_token_encrypted,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wh', 'jira-connection'] }),
  });
}

export function useTestConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('wh-test-connection');
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wh', 'jira-connection'] }),
  });
}

export function useDisconnectJiraConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('ph_jira_connection')
        .update({ status: 'not_configured', last_test_result: null })
        .eq('id', connectionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wh', 'jira-connection'] }),
  });
}
