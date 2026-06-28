/**
 * useTaskWorkItemLinks — CAT-TASKS-20260627-001 Slice 6.
 *
 * Read/add/remove links between a Tasks-Hub task (`tasks`) and Catalyst work
 * items (`ph_issues`, by issue_key), stored in the `task_work_item_links`
 * junction. Display rows are enriched from ph_issues (summary + status).
 *
 * Sub-task exclusion (rule #1) is enforced in the DB CHECK and in the picker
 * search (`searchLinkableWorkItems`).
 *
 * NOTE: the junction table ships in migration 20260627170000_task_work_item_links.sql,
 * which is WRITE-ONLY and not yet applied to the dev DB (DEFECT-002 / D-010).
 * Until applied, the queries below will error against PostgREST — callers
 * surface that gracefully.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaskWorkItemLink {
  id: string;
  work_item_key: string;
  work_item_type: string;
  link_type: string;
  summary: string | null;
  status: string | null;
  status_category: string | null;
}

export interface LinkableWorkItem {
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string | null;
}

const keyFor = (taskId: string) => ['task-work-item-links', taskId] as const;

export function useTaskWorkItemLinks(taskId: string | null) {
  return useQuery({
    queryKey: keyFor(taskId ?? ''),
    enabled: !!taskId,
    queryFn: async (): Promise<TaskWorkItemLink[]> => {
      if (!taskId) return [];
      const { data: links, error } = await supabase
        .from('task_work_item_links')
        .select('id, work_item_key, work_item_type, link_type')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (links ?? []) as Array<{ id: string; work_item_key: string; work_item_type: string; link_type: string }>;
      if (rows.length === 0) return [];

      const keys = rows.map((r) => r.work_item_key);
      const { data: issues } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, status, status_category')
        .in('issue_key', keys)
        .is('deleted_at', null);
      const byKey = new Map((issues ?? []).map((i: { issue_key: string }) => [i.issue_key, i as Record<string, unknown>]));

      return rows.map((r) => {
        const i = byKey.get(r.work_item_key);
        return {
          id: r.id,
          work_item_key: r.work_item_key,
          work_item_type: r.work_item_type,
          link_type: r.link_type,
          summary: (i?.summary as string) ?? null,
          status: (i?.status as string) ?? null,
          status_category: (i?.status_category as string) ?? null,
        };
      });
    },
    staleTime: 60_000,
  });
}

export function useAddTaskWorkItemLink(taskId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workItemKey: string; workItemType: string; linkType?: string }) => {
      if (!taskId) throw new Error('No task');
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('task_work_item_links')
        .insert({
          task_id: taskId,
          work_item_key: input.workItemKey,
          work_item_type: input.workItemType,
          link_type: input.linkType ?? 'relates',
          created_by: user?.id ?? null,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => { if (taskId) qc.invalidateQueries({ queryKey: keyFor(taskId) }); },
  });
}

export function useRemoveTaskWorkItemLink(taskId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('task_work_item_links').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => { if (taskId) qc.invalidateQueries({ queryKey: keyFor(taskId) }); },
  });
}

/**
 * Search ph_issues for linkable work items. Excludes the sub-task category
 * (rule #1) and soft-deleted rows. Matches issue_key or summary.
 */
export async function searchLinkableWorkItems(input: string): Promise<LinkableWorkItem[]> {
  let q = supabase
    .from('ph_issues')
    .select('issue_key, summary, issue_type, status')
    .is('deleted_at', null)
    .not('issue_type', 'ilike', 'sub-task')
    .not('issue_type', 'ilike', 'subtask')
    .order('jira_updated_at', { ascending: false })
    .limit(20);

  const term = input.trim();
  if (term) q = q.or(`issue_key.ilike.%${term}%,summary.ilike.%${term}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as LinkableWorkItem[];
}
