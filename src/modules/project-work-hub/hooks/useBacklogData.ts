import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/hooks/useProjects';
import type { BacklogEpic, BacklogFeature, BacklogStory } from '../types/backlog.types';

const YEAR_2026_START = '2026-01-01T00:00:00Z';

/**
 * Epic Backlog — pulls from ph_issues where issue_type = 'Epic',
 * project_key resolved from project UUID, filtered to 2026.
 */
export function useEpicBacklog(projectId: string) {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? null;

  return useQuery({
    queryKey: ['backlog-epics', projectId, projectKey],
    queryFn: async (): Promise<BacklogEpic[]> => {
      if (!projectKey) return [];
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, assignee_display_name, due_date, priority, parent_key, parent_summary, issue_type, comment_count, jira_created_at, jira_updated_at')
        .eq('project_key', projectKey)
        .eq('issue_type', 'Epic')
        .or(`jira_created_at.gte.${YEAR_2026_START},jira_updated_at.gte.${YEAR_2026_START}`)
        .is('jira_removed_at', null)
        .order('jira_updated_at', { ascending: false });
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        epic_key: row.issue_key,
        name: row.summary,
        description: null,
        status: row.status,
        assignee_id: null,
        assignee_name: row.assignee_display_name,
        end_date: row.due_date,
        health: null,
        deleted_at: null,
        primary_program_id: null,
        jira_created_at: row.jira_created_at,
        jira_updated_at: row.jira_updated_at,
        source: 'jira' as const,
        priority: row.priority ?? null,
        parent_key: row.parent_key ?? null,
        parent_summary: row.parent_summary ?? null,
        issue_type: row.issue_type ?? 'Epic',
        comment_count: typeof row.comment_count === 'number' ? row.comment_count : null,
      })) as BacklogEpic[];
    },
    enabled: !!projectId && !!projectKey,
  });
}

/**
 * Feature Backlog — not available in Jira for BAU, kept as empty for now.
 */
export function useFeatureBacklog(projectId: string) {
  return useQuery({
    queryKey: ['backlog-features', projectId],
    queryFn: async (): Promise<BacklogFeature[]> => {
      return [];
    },
    enabled: !!projectId,
  });
}

/**
 * Story Backlog — pulls from ph_issues where issue_type = 'Story',
 * project_key resolved from project UUID, filtered to 2026.
 * Parent epic resolved via parent_key lookup.
 */
export function useStoryBacklog(projectId: string) {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? null;

  return useQuery({
    queryKey: ['backlog-stories', projectId, projectKey],
    queryFn: async (): Promise<BacklogStory[]> => {
      if (!projectKey) return [];
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id, issue_key, summary, status, status_category, assignee_display_name, due_date, priority, parent_key, parent_summary, jira_created_at, jira_updated_at')
        .eq('project_key', projectKey)
        .eq('issue_type', 'Story')
        .or(`jira_created_at.gte.${YEAR_2026_START},jira_updated_at.gte.${YEAR_2026_START}`)
        .is('jira_removed_at', null)
        .order('jira_updated_at', { ascending: false });
      if (error) throw error;
      // Also fetch Catalyst-native stories for this project
      const { data: catData } = await supabase
        .from('catalyst_issues')
        .select('id, issue_key, title, status, priority, assignee_id, created_at, updated_at')
        .eq('project_id', projectId)
        .in('issue_type', ['Story', 'Feature', 'Epic', 'Task', 'QA Bug', 'Production Incident', 'Change Request', 'Business Gap', 'API Requirement'])
        .order('created_at', { ascending: false });

      const jiraRows = data || [];
      const catRows = catData || [];

      // Resolve parent epic keys to get epic info for ParentEpicChip
      const parentKeys = [...new Set(jiraRows.map((s: any) => s.parent_key).filter(Boolean))];
      const epicMap: Record<string, { id: string; epic_key: string | null; name: string }> = {};
      if (parentKeys.length > 0) {
        const { data: epics } = await supabase
          .from('ph_issues')
          .select('id, issue_key, summary')
          .in('issue_key', parentKeys);
        if (epics) {
          for (const e of epics) {
            epicMap[e.issue_key] = { id: e.id, epic_key: e.issue_key, name: e.summary };
          }
        }
      }

      const jiraStories: BacklogStory[] = jiraRows.map((row: any) => ({
        id: row.id,
        story_key: row.issue_key,
        title: row.summary,
        name: row.summary,
        description: null,
        status: row.status,
        feature_id: null,
        assignee_id: null,
        assignee_name: row.assignee_display_name,
        start_date: row.due_date,
        priority: row.priority?.toLowerCase() ?? null,
        deleted_at: null,
        jira_created_at: row.jira_created_at,
        jira_updated_at: row.jira_updated_at,
        source: 'jira' as const,
        feature: row.parent_key && epicMap[row.parent_key] ? {
          id: epicMap[row.parent_key].id,
          display_id: null,
          name: row.parent_summary || epicMap[row.parent_key].name,
          epic_id: epicMap[row.parent_key].id,
          epic: epicMap[row.parent_key],
        } : null,
      }));

      const catStories: BacklogStory[] = catRows.map((row: any) => ({
        id: row.id,
        story_key: row.issue_key,
        title: row.title,
        name: row.title,
        description: null,
        status: row.status,
        feature_id: null,
        assignee_id: row.assignee_id,
        assignee_name: null,
        start_date: null,
        priority: row.priority?.toLowerCase() ?? null,
        deleted_at: null,
        jira_created_at: row.created_at,
        jira_updated_at: row.updated_at,
        source: 'catalyst' as const,
        feature: null,
      }));

      // Catalyst items first, then Jira items
      return [...catStories, ...jiraStories];
    },
    enabled: !!projectId && !!projectKey,
    staleTime: 5 * 60 * 1000,
  });
}
