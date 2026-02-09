import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IssueTypeStats {
  type: string;
  count: number;
  statuses: Array<{ status: string; count: number }>;
}

export interface ProjectStats {
  name: string;
  key: string;
  count: number;
  types: Array<{ type: string; count: number }>;
  statuses: Array<{ status: string; count: number }>;
}

export interface IssueStatsResponse {
  success: boolean;
  total: number;
  scanned: number;
  types: IssueTypeStats[];
  statuses: Array<{ status: string; count: number }>;
  projects: ProjectStats[];
}

export function useJiraIssueStats(enabled: boolean) {
  return useQuery({
    queryKey: ['wh', 'jira-issue-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('wh-fetch-issue-stats');
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Failed to fetch stats');
      return data as IssueStatsResponse;
    },
    enabled,
    staleTime: 5 * 60_000, // 5 minutes
    refetchInterval: 10 * 60_000, // 10 minutes
  });
}
