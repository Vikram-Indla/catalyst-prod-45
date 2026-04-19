import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/hooks/useProjects';
import type { BacklogEpic, BacklogFeature, BacklogStory } from '../types/backlog.types';

const YEAR_2026_START = '2026-01-01T00:00:00Z';

/**
 * Initiative row shape — pulled from `ph_backlog_initiatives_view` which
 * pre-joins initiative type styling (icon + color) onto ph_initiatives.
 * This is the "Business Request" layer in Catalyst's hierarchy, sitting
 * one level above Epic. Source of truth per the ProductBacklog ERD
 * (2026-04-18 upload).
 */
export interface InitiativeRow {
  id: string;
  initiative_key: string;
  title: string;
  initiative_type_key: string | null;
  initiative_type_label: string | null;
  initiative_type_icon: string | null;
  initiative_type_color_token: string | null;
  initiative_type_color_hex: string | null;
}

/**
 * useInitiativesByKeys — resolves initiative_key values (found as parent_key
 * on Jira issues) to their full Initiative rows with pre-joined type styling.
 *
 * Per the ProductBacklog ERD (uploaded 2026-04-18):
 *   ph_initiatives ||--o{ ph_issues : "parent_key = initiative_key"
 *
 * ph_backlog_initiatives_view is a Supabase view that pre-joins
 * ph_initiatives with initiative_types so icon + color resolve in a single
 * query — no client-side mapping required.
 *
 * Usage: pass the union of parent_keys collected from stories + epics.
 * Any that resolve to an initiative become top-level rows in the backlog.
 * Zero-cost when `keys` is empty (hook is disabled).
 */
export function useInitiativesByKeys(keys: string[]) {
  const stableKey = keys.slice().sort().join('|');
  return useQuery({
    queryKey: ['backlog-initiatives-by-keys', stableKey],
    enabled: keys.length > 0,
    queryFn: async (): Promise<Map<string, InitiativeRow>> => {
      const out = new Map<string, InitiativeRow>();
      if (keys.length === 0) return out;
      const { data, error } = await supabase
        .from('ph_backlog_initiatives_view')
        .select('id, initiative_key, title, initiative_type_key, initiative_type_label, initiative_type_icon, initiative_type_color_token, initiative_type_color_hex')
        .in('initiative_key', keys);
      if (error) throw error;
      for (const row of (data || []) as any[]) {
        out.set(row.initiative_key, row as InitiativeRow);
      }
      return out;
    },
  });
}
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
        .is('archived_at', null)
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
        .select('id, issue_key, summary, status, status_category, assignee_display_name, reporter_display_name, due_date, priority, parent_key, parent_summary, jira_created_at, jira_updated_at')
        .eq('project_key', projectKey)
        .eq('issue_type', 'Story')
        .or(`jira_created_at.gte.${YEAR_2026_START},jira_updated_at.gte.${YEAR_2026_START}`)
        .is('jira_removed_at', null)
        .is('archived_at', null)
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

      // Resolve parent epic keys to get epic info for ParentEpicChip AND
      // for the unified Backlog view's synthesized epic rows.
      //
      // 2026-04 expansion: the old select only pulled id/issue_key/summary,
      // so when BacklogPage synthesizes an epic row from a story's
      // parent_key the epic's Jira status/priority/assignee were blank.
      // We now also select status, priority, assignee_display_name, and the
      // jira timestamps so BacklogPage can render the epic row with its
      // real Jira state (no more "Set status" ghosts on every epic).
      // This is additive — consumers that only read { id, epic_key, name }
      // continue to work.
      const parentKeys = [...new Set(jiraRows.map((s: any) => s.parent_key).filter(Boolean))];
      const epicMap: Record<string, {
        id: string;
        epic_key: string | null;
        name: string;
        status: string | null;
        priority: string | null;
        assignee_name: string | null;
        reporter_name: string | null;
        jira_created_at: string | null;
        jira_updated_at: string | null;
      }> = {};
      if (parentKeys.length > 0) {
        const { data: epics } = await supabase
          .from('ph_issues')
          .select('id, issue_key, summary, status, priority, assignee_display_name, reporter_display_name, jira_created_at, jira_updated_at')
          .in('issue_key', parentKeys)
          .is('archived_at', null);
        if (epics) {
          for (const e of epics) {
            epicMap[e.issue_key] = {
              id: e.id,
              epic_key: e.issue_key,
              name: e.summary,
              status: e.status ?? null,
              priority: (e.priority ? e.priority.toLowerCase() : null),
              assignee_name: e.assignee_display_name ?? null,
              reporter_name: e.reporter_display_name ?? null,
              jira_created_at: e.jira_created_at ?? null,
              jira_updated_at: e.jira_updated_at ?? null,
            };
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
        // Reporter — from ph_issues.reporter_display_name (Lovable's 2026-04
        // discovery pass confirmed 100% populated on Jira rows).
        reporter_name: row.reporter_display_name ?? null,
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

      // Merge Jira + Catalyst stories WITHOUT duplicating by issue_key.
      // Jira sync can land the same issue in both tables. Jira is the
      // source of truth (more complete fields: reporter, due_date, parent,
      // priority from Jira's workflow). Catalyst rows fill in only when
      // there's no Jira match for that issue_key.
      const seenKeys = new Set(jiraStories.map((s) => s.story_key).filter(Boolean) as string[]);
      const uniqueCat = catStories.filter((s) => !(s.story_key && seenKeys.has(s.story_key)));
      return [...jiraStories, ...uniqueCat];
    },
    enabled: !!projectId && !!projectKey,
    staleTime: 5 * 60 * 1000,
  });
}
