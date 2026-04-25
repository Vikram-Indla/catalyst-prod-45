/**
 * useProjectListItems & useProjectAllWorkItems
 * Reads from ph_issues (the actual synced Jira data) keyed by project_key
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItem, WorkItemType, WorkItemStatus, WorkItemPriority } from '@/types/workItem.types';

/* ── helpers ── */

function normaliseType(raw: string | null): WorkItemType {
  if (!raw) return 'task';
  const l = raw.toLowerCase().replace(/[\s_-]/g, '');
  if (l === 'epic') return 'epic';
  if (l === 'story' || l === 'userstory') return 'story';
  if (l === 'bug' || l === 'defect' || l === 'qabug') return 'bug';
  if (l === 'subtask' || l === 'sub-task') return 'subtask';
  if (l === 'feature' || l === 'newfeature') return 'feature';
  if (l === 'improvement') return 'improvement';
  if (l === 'frontend') return 'task';
  if (l === 'backend') return 'task';
  return 'task';
}

function normaliseStatus(raw: string | null): WorkItemStatus {
  const s = raw ?? 'backlog';
  const l = s.toLowerCase().replace(/[\s_-]/g, '');
  if (l.includes('done') || l.includes('closed') || l.includes('resolved')) return 'done';
  if (l.includes('progress') || l.includes('dev') || l.includes('indev')) return 'in_progress';
  if (l.includes('qa')) return 'in_qa';
  if (l.includes('uat')) return 'in_uat';
  if (l.includes('production')) return 'in_production';
  if (l.includes('requirement')) return 'in_requirements';
  if (l.includes('readyforqa')) return 'ready_for_qa';
  if (l.includes('todo') || l.includes('to do')) return 'backlog';
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

function statusCategory(raw: string | null): 'done' | 'in_progress' | 'todo' {
  if (!raw) return 'todo';
  const l = raw.toLowerCase();
  if (l.includes('done')) return 'done';
  if (l.includes('progress')) return 'in_progress';
  return 'todo';
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

function countComments(raw: any): number {
  if (!raw) return 0;
  if (Array.isArray(raw)) return raw.length;
  if (typeof raw === 'object' && raw.comments) return Array.isArray(raw.comments) ? raw.comments.length : 0;
  return 0;
}

function hasCanonicalFlagValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'object';
}

function derivePhIssueFlag(row: any): boolean {
  if (row?.is_flagged === true) return true;
  if (typeof row?.flag_reason === 'string' && row.flag_reason.trim().length > 0) return true;
  return hasCanonicalFlagValue(row?.raw_json?.fields?.Flagged);
}

function derivePhIssueFlagReason(row: any): string | null {
  if (typeof row?.flag_reason === 'string' && row.flag_reason.trim().length > 0) {
    return row.flag_reason;
  }

  const rawFlag = row?.raw_json?.fields?.Flagged;
  return typeof rawFlag === 'string' && rawFlag.trim().length > 0 ? rawFlag : null;
}

function mapPhIssue(row: any): WorkItem {
  const assigneeId = row.assignee_account_id ?? null;
  const assigneeName = row.assignee_display_name ?? null;
  const issueFlagged = derivePhIssueFlag(row);
  const issueFlagReason = derivePhIssueFlagReason(row);
  return {
    id: row.issue_key,
    // dbId = ph_issues.id (UUID PK). Required for any downstream call that
    // queries ph_issues by primary key (e.g. CatalystDetailRouter).
    // WorkItem.id stays the issue_key for backward-compat with existing
    // callers that use it for routing/display. (See CLAUDE.md §L39.)
    dbId: row.id ?? null,
    projectId: '',
    parentId: null,
    parentKey: row.parent_key ?? null,
    jiraKey: row.issue_key ?? '',
    type: normaliseType(row.issue_type),
    summary: row.summary || '(No title)',
    status: normaliseStatus(row.status),
    statusName: row.status ?? 'Backlog',
    statusCategory: statusCategory(row.status_category),
    assigneeId: assigneeId,
    assignee: assigneeName ? {
      id: assigneeId || assigneeName,
      name: assigneeName,
      avatarUrl: null,
      initials: getInitials(assigneeName),
      color: hashColor(assigneeId || assigneeName),
    } : undefined,
    reporterId: row.reporter_account_id ?? null,
    reporter: row.reporter_display_name ? { id: row.reporter_account_id || '', name: row.reporter_display_name } : undefined,
    priority: normalisePriority(row.priority),
    fixVersion: Array.isArray(row.fix_versions) && row.fix_versions.length > 0 ? row.fix_versions[0] : null,
    commentsCount: countComments(row.comments),
    childCount: 0,
    description: row.description_text ?? null,
    createdAt: row.jira_created_at ?? new Date().toISOString(),
    updatedAt: row.jira_updated_at ?? new Date().toISOString(),
    createdBy: null,
    parentSummary: row.parent_summary ?? null,
    storyPoints: row.story_points ?? null,
    sprintName: row.sprint_name ?? null,
    resolution: row.resolution ?? null,
    labels: row.labels ?? [],
    is_flagged: issueFlagged,
    flag_reason: issueFlagReason,
  };
}

const PH_ISSUES_SELECT = 'id, issue_key, project_key, issue_type, summary, status, status_category, assignee_account_id, assignee_display_name, parent_key, parent_summary, fix_versions, labels, priority, story_points, sprint_name, resolution, jira_created_at, jira_updated_at, description_text, comments, reporter_account_id, reporter_display_name, is_flagged, flag_reason, raw_json';

/* ── List view: all items for a project ── */
export function useProjectListItems(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['project-list-items-v2', projectKey],
    queryFn: async (): Promise<WorkItem[]> => {
      if (!projectKey) return [];

      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_issues')
        .select(PH_ISSUES_SELECT)
        .eq('project_key', projectKey)
        .is('jira_removed_at', null)
        .order('jira_updated_at', { ascending: false, nullsFirst: false })
        .limit(2000);
      if (error) throw error;

      return (data ?? []).map(mapPhIssue);
    },
    enabled: !!projectKey,
    staleTime: 30_000,
  });
}

/* ── All work view: all types ──
   Reads from BOTH ph_issues (Jira-synced) AND catalyst_issues (in-app
   created). Mirrors the merge pattern already proven in
   src/modules/project-work-hub/hooks/useBacklogData.ts so a story created
   via the "+ Create" flow shows up here in the same render the Jira sync
   uses for Jira-native stories. Jira wins on issue_key collisions. */
function mapCatalystIssue(row: any, projectKey: string): WorkItem {
  return {
    id: row.issue_key,
    dbId: row.id ?? null,
    projectId: row.project_id ?? '',
    parentId: row.parent_id ?? null,
    parentKey: null,
    jiraKey: row.issue_key ?? '',
    type: normaliseType(row.issue_type),
    summary: row.title || '(No title)',
    status: normaliseStatus(row.status),
    statusName: row.status ?? 'Backlog',
    statusCategory: statusCategory(row.status),
    assigneeId: row.assignee_id ?? null,
    assignee: undefined,
    reporterId: row.reporter_id ?? null,
    reporter: undefined,
    priority: normalisePriority(row.priority),
    fixVersion: null,
    commentsCount: 0,
    childCount: 0,
    description: row.description ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    createdBy: null,
    parentSummary: null,
    storyPoints: row.story_points ?? null,
    sprintName: row.sprint_name ?? null,
    resolution: null,
    labels: row.tags ?? [],
    is_flagged: false,
    flag_reason: null,
  };
}

const CATALYST_ISSUES_SELECT = 'id, project_id, issue_key, title, description, issue_type, status, priority, assignee_id, reporter_id, parent_id, story_points, tags, sprint_name, created_at, updated_at';

export function useProjectAllWorkItems(projectKey: string | undefined) {
  return useQuery({
    queryKey: ['project-all-work-items-v3', projectKey],
    queryFn: async (): Promise<WorkItem[]> => {
      if (!projectKey) return [];

      // 1) Resolve project UUID — catalyst_issues is keyed by project_id, not project_key.
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
      const projectId = project?.id ?? null;

      // 2) Fetch Jira-synced rows + in-app created rows in parallel.
      const [phRes, catRes] = await Promise.all([
        // @ts-ignore
        supabase
          .from('ph_issues')
          .select(PH_ISSUES_SELECT)
          .eq('project_key', projectKey)
          .is('jira_removed_at', null)
          .order('jira_updated_at', { ascending: false, nullsFirst: false })
          .limit(5000),
        projectId
          ? supabase
              .from('catalyst_issues')
              .select(CATALYST_ISSUES_SELECT)
              .eq('project_id', projectId)
              .order('created_at', { ascending: false })
              .limit(5000)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (phRes.error) throw phRes.error;
      if (catRes.error) throw catRes.error;

      const jira = (phRes.data ?? []).map(mapPhIssue);
      const seen = new Set(jira.map((w) => w.jiraKey).filter(Boolean));
      const catalyst = (catRes.data ?? [])
        .map((r: any) => mapCatalystIssue(r, projectKey))
        .filter((w) => !(w.jiraKey && seen.has(w.jiraKey)));

      // Catalyst-created rows surface at the top — they're newer than the
      // most recent Jira sync by definition, and matches the Backlog ordering.
      return [...catalyst, ...jira];
    },
    enabled: !!projectKey,
    staleTime: 30_000,
  });
}

/* ── Children for expand (by parent_key) ── */
export function useWorkItemChildren(parentKey: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['work-item-children-v2', parentKey],
    queryFn: async (): Promise<WorkItem[]> => {
      if (!parentKey) return [];
      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_issues')
        .select(PH_ISSUES_SELECT)
        .eq('parent_key', parentKey)
        .is('jira_removed_at', null)
        .order('jira_updated_at', { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;

      return (data ?? []).map(mapPhIssue);
    },
    enabled: enabled && !!parentKey,
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
        .from('ph_issues')
        .select(PH_ISSUES_SELECT)
        .eq('issue_key', itemId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapPhIssue(data);
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

      // @ts-ignore
      const { data, error } = await supabase
        .from('ph_issues')
        .select(PH_ISSUES_SELECT)
        .eq('project_key', projectKey)
        .is('jira_removed_at', null)
        .or(`summary.ilike.%${query}%,issue_key.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;

      return (data ?? []).map(mapPhIssue);
    },
    enabled: !!projectKey && query.length >= 2,
    staleTime: 5_000,
  });
}

/* ── Create work item (still uses ph_work_items for new items) ── */
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
