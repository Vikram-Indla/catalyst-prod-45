/**
 * useProjectListItems & useProjectAllWorkItems
 * Stage B: TanStack Query hooks for Jira-parity list/allwork views
 * Reads from ph_list_items (new table created in Stage B)
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItem, WorkItemType, WorkItemStatus, WorkItemPriority } from '@/types/workItem.types';

/* ── helpers ── */

function normaliseType(raw: string | null): WorkItemType {
  if (!raw) return 'task';
  const l = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (l === 'epic') return 'epic';
  if (l === 'story') return 'story';
  if (l === 'bug' || l === 'defect') return 'bug';
  if (l === 'subtask' || l === 'sub-task') return 'subtask';
  if (l === 'feature' || l === 'newfeature') return 'feature';
  if (l === 'improvement') return 'improvement';
  return 'task';
}

function normaliseStatus(raw: string | null): WorkItemStatus {
  if (!raw) return 'backlog';
  const l = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (l.includes('done') || l.includes('closed') || l.includes('resolved')) return 'done';
  if (l.includes('inprogress') || l.includes('indev')) return 'in_progress';
  if (l.includes('readyforqa')) return 'ready_for_qa';
  if (l.includes('inqa')) return 'in_qa';
  if (l.includes('inuat')) return 'in_uat';
  if (l.includes('inproduction')) return 'in_production';
  if (l.includes('inrequirement')) return 'in_requirements';
  return 'backlog';
}

function normalisePriority(raw: string | null): WorkItemPriority {
  if (!raw) return 'medium';
  const l = raw.toLowerCase();
  if (l === 'highest' || l === 'critical' || l === 'blocker') return 'highest';
  if (l === 'high' || l === 'major') return 'high';
  if (l === 'low' || l === 'minor') return 'low';
  if (l === 'lowest' || l === 'trivial') return 'lowest';
  return 'medium';
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#6554C0', '#2684FF', '#36B37E', '#FF5630', '#FFAB00', '#00B8D9'];
function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function statusCategory(status: string): 'todo' | 'in_progress' | 'done' {
  const s = normaliseStatus(status);
  if (['done', 'closed', 'in_production'].includes(s)) return 'done';
  if (['in_progress', 'in_dev', 'in_qa', 'in_uat', 'ready_for_qa'].includes(s)) return 'in_progress';
  return 'todo';
}

function mapRow(row: any, profileMap: Map<string, { full_name: string; avatar_url: string | null }>): WorkItem {
  const profile = row.assignee_id ? profileMap.get(row.assignee_id) : undefined;
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id ?? null,
    parentKey: row.parent_key ?? null,
    jiraKey: row.jira_key ?? '',
    type: normaliseType(row.type),
    summary: row.summary || '',
    status: normaliseStatus(row.status),
    statusName: row.status ?? 'backlog',
    statusCategory: statusCategory(row.status),
    assigneeId: row.assignee_id ?? null,
    assignee: profile ? {
      id: row.assignee_id!,
      name: profile.full_name,
      avatarUrl: profile.avatar_url,
      initials: getInitials(profile.full_name),
      color: hashColor(row.assignee_id!),
    } : undefined,
    reporterId: row.reporter_id ?? null,
    priority: normalisePriority(row.priority),
    fixVersion: row.fix_version ?? null,
    commentsCount: row.comments_count ?? 0,
    childCount: 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    createdBy: row.created_by ?? null,
  };
}

async function fetchProfiles(ids: string[]) {
  const map = new Map<string, { full_name: string; avatar_url: string | null }>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
  for (const p of data ?? []) map.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
  return map;
}

async function resolveProjectId(projectKey: string): Promise<string | null> {
  // @ts-ignore - deep type instantiation
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('key', projectKey)
    .maybeSingle();
  return (data as any)?.id ?? null;
}

/* ── List view: epics only ── */

export function useProjectListItems(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['project-list-items-v2', projectKey],
    queryFn: async (): Promise<WorkItem[]> => {
      if (!projectKey) return [];
      const projectId = await resolveProjectId(projectKey);
      if (!projectId) return [];

      // @ts-ignore - deep type instantiation
      const { data, error } = await supabase
        .from('ph_list_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('type', 'epic')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;

      const ids = [...new Set((data ?? []).map((r: any) => r.assignee_id).filter(Boolean))] as string[];
      const profileMap = await fetchProfiles(ids);
      return (data ?? []).map((r: any) => mapRow(r, profileMap));
    },
    enabled: !!projectKey,
    staleTime: 30_000,
  });
}

/* ── All work view: all types ── */

export function useProjectAllWorkItems(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['project-all-work-items-v2', projectKey],
    queryFn: async (): Promise<WorkItem[]> => {
      if (!projectKey) return [];
      const projectId = await resolveProjectId(projectKey);
      if (!projectId) return [];

      // @ts-ignore - deep type instantiation
      const { data, error } = await supabase
        .from('ph_list_items')
        .select('*')
        .eq('project_id', projectId)
        .order('type', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      const ids = [...new Set((data ?? []).map((r: any) => r.assignee_id).filter(Boolean))] as string[];
      const profileMap = await fetchProfiles(ids);
      return (data ?? []).map((r: any) => mapRow(r, profileMap));
    },
    enabled: !!projectKey,
    staleTime: 30_000,
  });
}

/* ── Children for expand ── */

export function useWorkItemChildren(parentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['work-item-children-v2', parentId],
    queryFn: async (): Promise<WorkItem[]> => {
      if (!parentId) return [];
      // @ts-ignore - deep type instantiation
      const { data, error } = await supabase
        .from('ph_list_items')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const ids = [...new Set((data ?? []).map((r: any) => r.assignee_id).filter(Boolean))] as string[];
      const profileMap = await fetchProfiles(ids);
      return (data ?? []).map((r: any) => mapRow(r, profileMap));
    },
    enabled: enabled && !!parentId,
    staleTime: 30_000,
  });
}

/* ── Mutations ── */

export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      projectKey: string;
      parentId?: string;
      type: WorkItemType;
      summary: string;
      jiraKey: string;
    }) => {
      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_list_items')
        .insert({
          project_id: input.projectId,
          parent_id: input.parentId ?? null,
          type: input.type,
          summary: input.summary,
          jira_key: input.jiraKey,
          status: 'backlog',
          priority: 'medium',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-list-items-v2', variables.projectKey] });
      queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v2', variables.projectKey] });
    },
  });
}

export function useUpdateWorkItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, projectKey }: {
      id: string; status: string; projectKey: string;
    }) => {
      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_list_items')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-list-items-v2', variables.projectKey] });
      queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v2', variables.projectKey] });
    },
  });
}
