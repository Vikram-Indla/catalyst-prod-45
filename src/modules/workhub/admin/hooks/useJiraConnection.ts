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
        .from('wh_jira_connection')
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
      // Get the singleton row id
      const { data: existing, error: fetchErr } = await supabase
        .from('wh_jira_connection')
        .select('id')
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error } = await supabase
        .from('wh_jira_connection')
        .update({
          ...input,
          status: 'not_configured',
          configured_by: userId || null,
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
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
