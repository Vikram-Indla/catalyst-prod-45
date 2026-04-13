/**
 * useProjectListItems & useProjectAllWorkItems
 * Stage A: TanStack Query hooks for Jira-parity list/allwork views
 * Reads from ph_work_items (existing table) — NOT a new work_items table
 */
import { useQuery } from '@tanstack/react-query';
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
  if (l.includes('progress') || l.includes('dev')) return 'in_progress';
  if (l.includes('qa')) return 'in_qa';
  if (l.includes('uat')) return 'in_uat';
  if (l.includes('production')) return 'in_production';
  if (l.includes('requirement')) return 'in_requirements';
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
  const profile = row.assignee_id ? profileMap.get(row.assignee_id) : undefined;
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id ?? null,
    parentKey: row.parent_key ?? null,
    jiraKey: row.item_key ?? '',
    type: normaliseType(row.ph_work_types?.name ?? row.item_type),
    summary: row.title || row.summary || '',
    status: normaliseStatus(row.ph_workflow_statuses?.name),
    statusName: row.ph_workflow_statuses?.name ?? 'Backlog',
    statusCategory: (row.ph_workflow_statuses?.category ?? 'todo') as 'todo' | 'in_progress' | 'done',
    assigneeId: row.assignee_id ?? null,
    assignee: profile ? {
      id: row.assignee_id!,
      name: profile.full_name,
      avatarUrl: profile.avatar_url,
      initials: getInitials(profile.full_name),
      color: hashColor(row.assignee_id!),
    } : undefined,
    reporterId: null,
    priority: normalisePriority(row.priority),
    fixVersion: row.ph_releases?.name ?? null,
    commentsCount: 0,
    childCount: 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    createdBy: null,
  };
}

async function fetchProfiles(ids: string[]) {
  const map = new Map<string, { full_name: string; avatar_url: string | null }>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', ids);
  for (const p of data ?? []) map.set(p.id, { full_name: p.full_name || '', avatar_url: p.avatar_url });
  return map;
}

/* ── List view: epics only ── */

export function useProjectListItems(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['project-list-items-v2', projectKey],
    queryFn: async (): Promise<WorkItem[]> => {
      if (!projectKey) return [];

      // Resolve project id from key
      const { data: proj } = await supabase
        .from('projects')
        .select('id')
        .eq('project_key', projectKey)
        .maybeSingle();
      if (!proj) return [];

      // @ts-ignore - deep type instantiation
      const { data, error } = await supabase
        .from('ph_work_items')
        .select('id, item_key, title, summary, item_type, priority, parent_id, assignee_id, created_at, updated_at, project_id, ph_work_types!ph_work_items_type_id_fkey (name, color, icon, level), ph_workflow_statuses!ph_work_items_status_id_fkey (name, category, color), ph_releases!ph_work_items_release_id_fkey (name)')
        .eq('project_id', (proj as any).id)
        .eq('item_type', 'epic')
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

      const { data: proj } = await supabase
        .from('projects')
        .select('id')
        .eq('project_key', projectKey)
        .maybeSingle();
      if (!proj) return [];

      const { data, error } = await supabase
        .from('ph_work_items')
        .select('id, item_key, title, summary, item_type, priority, parent_id, assignee_id, created_at, updated_at, project_id, ph_work_types!ph_work_items_type_id_fkey (name, color, icon, level), ph_workflow_statuses!ph_work_items_status_id_fkey (name, category, color), ph_releases!ph_work_items_release_id_fkey (name)')
        .eq('project_id', proj.id)
        .order('item_type', { ascending: true })
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
      const { data, error } = await supabase
        .from('ph_work_items')
        .select('id, item_key, title, summary, item_type, priority, parent_id, assignee_id, created_at, updated_at, project_id, ph_work_types!ph_work_items_type_id_fkey (name, color, icon, level), ph_workflow_statuses!ph_work_items_status_id_fkey (name, category, color), ph_releases!ph_work_items_release_id_fkey (name)')
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
