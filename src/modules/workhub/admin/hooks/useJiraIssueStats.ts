import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubtaskNode {
  key: string;
  summary: string;
  status: string;
}

export interface StoryNode {
  key: string;
  summary: string;
  type: string;
  status: string;
  subtaskCount: number;
  subtasks: SubtaskNode[];
}

export interface EpicNode {
  key: string;
  summary: string;
  status: string;
  storyCount: number;
  subtaskCount: number;
  stories: StoryNode[];
  statusCounts: Array<{ status: string; count: number }>;
}

export interface DefectSummary {
  type: string;
  count: number;
  statuses: Array<{ status: string; count: number }>;
}

export interface ProjectHierarchy {
  name: string;
  key: string;
  totalCount: number;
  epics: EpicNode[];
  defects: DefectSummary[];
  statusCounts: Array<{ status: string; count: number }>;
  typeCounts: Array<{ type: string; count: number }>;
}

export interface IssueStatsResponse {
  success: boolean;
  total: number;
  scanned: number;
  projects: ProjectHierarchy[];
  statusSummary: Array<{ status: string; count: number }>;
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
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}
