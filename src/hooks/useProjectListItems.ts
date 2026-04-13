/**
 * useProjectListItems & useProjectAllWorkItems
 * Stage D: Full Supabase wiring — ZERO hardcoded data
 * Reads from ph_work_items (existing table)
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

function normaliseStatus(raw: string | null, rawDirect?: string | null): WorkItemStatus {
  const s = raw ?? rawDirect ?? 'backlog';
  const l = s.toLowerCase().replace(/[\s_-]/g, '');
  if (l.includes('done') || l.includes('closed') || l.includes('resolved')) return 'done';
  if (l.includes('progress') || l.includes('dev')) return 'in_progress';
  if (l.includes('qa')) return 'in_qa';
  if (l.includes('uat')) return 'in_uat';
  if (l.includes('production')) return 'in_production';
  if (l.includes('requirement')) return 'in_requirements';
  if (l.includes('readyforqa')) return 'ready_for_qa';
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

function mapRow(row: any, profileMap: Map<string, { full_name: string; avatar_url: string | null }>): WorkItem {
  const assigneeId = row.assignee_id ?? row.assignee_user_id;
  const profile = assigneeId ? profileMap.get(assigneeId) : undefined;
  const reporterProfile = row.reporter_id ? profileMap.get(row.reporter_id) : undefined;
  const statusName = row.ph_workflow_statuses?.name ?? row.status ?? 'Backlog';
  const statusCategory = row.ph_workflow_statuses?.category ?? null;
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id ?? null,
    parentKey: null,
    jiraKey: row.item_key ?? '',
    type: normaliseType(row.ph_work_types?.name ?? row.item_type),
    summary: row.title || row.summary || '',
    status: normaliseStatus(row.ph_workflow_statuses?.name, row.status),
    statusName,
    statusCategory: statusCategory === 'done' ? 'done' : statusCategory === 'in_progress' ? 'in_progress' : 'todo',
    assigneeId: assigneeId ?? null,
    assignee: profile ? {
      id: assigneeId!,
      name: profile.full_name,
      avatarUrl: profile.avatar_url,
      initials: getInitials(profile.full_name),
      color: hashColor(assigneeId!),
    } : undefined,
    reporterId: row.reporter_id ?? null,
    reporter: reporterProfile ? { id: row.reporter_id!, name: reporterProfile.full_name } : undefined,
    priority: normalisePriority(row.priority ?? row.jira_priority),
    fixVersion: row.ph_releases?.name ?? null,
    commentsCount: 0,
    childCount: 0,
    description: row.description ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    createdBy: null,
  };
}

async function fetchProfiles(ids: string[]) {
  const map = new Map<string, { full_name: string; avatar_url: string | null }>();
  if (ids.length === 0) return map;
  // @ts-ignore
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
  for (const p of data ?? []) map.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
  return map;
}

const SELECT_FIELDS = 'id, item_key, title, summary, item_type, priority, jira_priority, parent_id, assignee_id, assignee_user_id, reporter_id, status, description, created_at, updated_at, project_id, deleted_at, ph_work_types!ph_work_items_type_id_fkey (name, color, icon, level), ph_workflow_statuses!ph_work_items_status_id_fkey (name, category, color), ph_releases!wh_work_items_release_id_fkey (name)';

/* ── Resolve projectKey → projectId ── */
async function resolveProjectId(projectKey: string): Promise<string | null> {
  // @ts-ignore
  const { data } = await supabase.from('projects').select('id').eq('key', projectKey).maybeSingle();
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

      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_work_items')
        .select(SELECT_FIELDS)
        .eq('project_id', projectId)
        .eq('item_type', 'epic')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (error) throw error;

      const ids = collectProfileIds(data);
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

      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_work_items')
        .select(SELECT_FIELDS)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('item_type', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      const ids = collectProfileIds(data);
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
      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_work_items')
        .select(SELECT_FIELDS)
        .eq('parent_id', parentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const ids = collectProfileIds(data);
      const profileMap = await fetchProfiles(ids);
      return (data ?? []).map((r: any) => mapRow(r, profileMap));
    },
    enabled: enabled && !!parentId,
    staleTime: 30_000,
  });
}

/* ── Single work item (detail panel) ── */
export function useWorkItem(itemId: string | undefined) {
  return useQuery({
    queryKey: ['work-item-detail', itemId],
    queryFn: async (): Promise<WorkItem | null> => {
      if (!itemId) return null;
      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_work_items')
        .select(SELECT_FIELDS)
        .eq('id', itemId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const ids = collectProfileIds([data]);
      const profileMap = await fetchProfiles(ids);
      return mapRow(data, profileMap);
    },
    enabled: !!itemId,
    staleTime: 15_000,
  });
}

/* ── Search ── */
export function useSearchWorkItems(projectKey: string | undefined, query: string) {
  return useQuery({
    queryKey: ['work-items-search', projectKey, query],
    queryFn: async (): Promise<WorkItem[]> => {
      if (!query.trim() || !projectKey) return [];
      const projectId = await resolveProjectId(projectKey);
      if (!projectId) return [];

      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_work_items')
        .select(SELECT_FIELDS)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .or(`summary.ilike.%${query}%,item_key.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;

      const ids = collectProfileIds(data);
      const profileMap = await fetchProfiles(ids);
      return (data ?? []).map((r: any) => mapRow(r, profileMap));
    },
    enabled: !!projectKey && query.length >= 2,
    staleTime: 5_000,
  });
}

/* ── Create work item ── */
export function useCreateWorkItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      parentId?: string;
      type: string;
      summary: string;
      itemKey: string;
    }) => {
      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_work_items')
        .insert({
          project_id: input.projectId,
          parent_id: input.parentId ?? null,
          item_key: input.itemKey,
          item_type: input.type,
          summary: input.summary.trim(),
          title: input.summary.trim(),
          status: 'backlog',
          priority: 'medium',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-list-items-v2'] });
      queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v2'] });
    },
  });
}

/* ── Update status ── */
export function useUpdateWorkItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_work_items')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-list-items-v2'] });
      queryClient.invalidateQueries({ queryKey: ['project-all-work-items-v2'] });
      queryClient.invalidateQueries({ queryKey: ['work-item-detail'] });
    },
  });
}

/* ── util ── */
function collectProfileIds(data: any[] | null): string[] {
  if (!data) return [];
  const ids = new Set<string>();
  for (const r of data) {
    if (r.assignee_id) ids.add(r.assignee_id);
    if (r.assignee_user_id) ids.add(r.assignee_user_id);
    if (r.reporter_id) ids.add(r.reporter_id);
  }
  return [...ids];
}
