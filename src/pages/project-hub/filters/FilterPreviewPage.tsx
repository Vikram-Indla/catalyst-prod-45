import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AskCatyInlineBar } from '@/components/caty/AskCatyInlineBar';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AvatarGroup from '@atlaskit/avatar-group';
import AkFlag, { FlagGroup } from '@atlaskit/flag';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkInfoIcon from '@atlaskit/icon/core/information';
import Spinner from '@atlaskit/spinner';
import { AtlaskitPageShell } from '@/components/ads';
import {
  JiraTable,
  makeKeyCell,
  makeSummaryInlineEditCell,
  makeStatusEditCell,
  makeParentEditCell,
  makeAssigneeEditCell,
  makeAssigneeCell,
  makeDateCell,
  makeDateEditCell,
  makeRowMenuCell,
  makePriorityEditCell,
  makeLabelsEditCell,
  makeCommentsCell,
  makeSprintReleaseCell,
} from '@/components/shared/JiraTable';
import type { Column, SortOrder, LozengeAppearance } from '@/components/shared/JiraTable';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { jiraIconType } from '@/components/universal-work-view/uwv.utils';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { FilterKebabMenu } from '@/components/filters/FilterKebabMenu';
import { useUpdateSavedFilter } from '@/hooks/workhub/useSavedFilters';
import { useJqlResults, type JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useParentIssueTypes } from '@/hooks/workhub/useParentIssueTypes';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { resolveAvatarUrl } from '@/lib/avatars';
import { supabase } from '@/integrations/supabase/client';
import {
  FilterChip,
  FilterTriggerAndPopup,
  type FilterState,
  type FilterFacet,
  EMPTY_FILTERS,
  FACET_LABELS,
  MORE_FILTERS_FACETS,
  filterStateToJql,
  totalSelected,
  distinctOptions,
  type FacetOption,
} from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import { JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import { JQLEditor } from '@/components/filters/JQLEditor';
import { useJQLValuePool } from '@/hooks/workhub/useJQLValuePool';
import type { FilterCategory as JiraFilterCategory } from '@/components/shared/JiraBasicFilter';
import type { WorkItem } from '@/types/workItem.types';
import FilterIconCore from '@atlaskit/icon/core/filter';

const SUBTLE = token('color.text.subtle', '#505258');
const FilterIcon = () => <FilterIconCore label="" color={SUBTLE} />;

/* ═══════════════════════════════════════════════════════════════════════════
   2026-06-15 — Product-mode helpers
   ───────────────────────────────────────────────────────────────────────────
   Lifted from the previously parallel ProductFilterPreviewPage so this file
   can serve both /project-hub/:key/filters/create (mode='project') and
   /product-hub/:key/filters/create (mode='product') per CLAUDE.md "ADOPT
   CANONICAL COMPONENTS" rule. Only invoked when `mode === 'product'`; in
   project mode these helpers stay idle.
   ═══════════════════════════════════════════════════════════════════════════ */

const PRODUCT_FILTER_STATUSES = [
  'New', 'In Review', 'Approved', 'In Progress', 'On Hold',
  'Done', 'Rejected', 'Cancelled', 'Backlog', 'Ready for Development',
];

function productFilterStatusAppearance(status: string | null | undefined): LozengeAppearance {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'done' || s === 'approved' || s === 'closed') return 'success';
  if (s.includes('progress') || s.includes('review') || s.includes('development')) return 'inprogress';
  if (s === 'rejected' || s === 'cancelled') return 'removed';
  if (s === 'on hold') return 'moved';
  return 'default';
}

function useProductByCode(code: string | undefined): { id: string | null; name: string } {
  const { data } = useQuery({
    queryKey: ['product-by-code', code],
    enabled: !!code,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('products')
        .select('id, name')
        .eq('code', code!.toUpperCase())
        .maybeSingle();
      return data as { id: string; name: string } | null;
    },
  });
  return { id: data?.id ?? null, name: data?.name ?? code ?? '' };
}

function mapBrToJqlRow(r: any, profileMap: Record<string, string>): JqlResultRow {
  return {
    id: r.id,
    key: r.request_key ?? r.id,
    summary: r.title ?? '',
    issueType: 'Business Request',
    status: r.process_step ?? 'New',
    statusCategory: r.process_step === 'Done' || r.process_step === 'Approved' ? 'done' : 'in_progress',
    projectKey: '',
    assigneeName: r.po_user_id ? (profileMap[r.po_user_id] ?? null) : null,
    priority: r.urgency ?? null,
    created: r.created_at ?? null,
    updated: r.updated_at ?? null,
    dueDate: r.end_date ?? null,
    parentKey: null,
    parentSummary: null,
    sprintName: null,
    isFlagged: null,
    flagReason: null,
    ...({
      sprintRelease: Array.isArray(r.planned_quarter) ? r.planned_quarter : [],
      labels: r.request_type ? [r.request_type] : [],
      commentCount: 0,
      reporterName: r.created_by ? (profileMap[r.created_by] ?? null) : null,
    } as any),
  };
}

function useProductBrFacetItems(productId: string | null): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['product-filter-facet-items', productId],
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title, process_step, urgency, po_user_id, created_by, request_type, planned_quarter, created_at, updated_at')
        .eq('product_id', productId)
        .is('deleted_at', null)
        .limit(2000);
      if (!rows) return [];
      const userIds = [...new Set((rows as any[]).flatMap((r: any) => [r.po_user_id, r.created_by].filter(Boolean)))];
      const profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name').in('id', userIds as string[]);
        (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
      }
      return (rows as any[]).map((r: any): WorkItem => ({
        id: r.id, projectId: '', parentId: null, parentKey: null, parentSummary: null,
        jiraKey: r.request_key ?? r.id,
        type: 'task' as any, rawType: 'Business Request',
        summary: r.title ?? '',
        status: 'todo' as any, statusName: r.process_step ?? '', statusCategory: 'todo' as any,
        assigneeId: r.po_user_id ?? null,
        assignee: r.po_user_id && profileMap[r.po_user_id]
          ? { id: r.po_user_id, name: profileMap[r.po_user_id], avatarUrl: null, initials: '', color: '' }
          : undefined,
        reporterId: r.created_by ?? null,
        reporter: r.created_by && profileMap[r.created_by]
          ? { id: r.created_by, name: profileMap[r.created_by], avatarUrl: null, initials: '', color: '' }
          : undefined,
        priority: (r.urgency ?? 'medium') as any,
        fixVersion: null,
        sprintRelease: Array.isArray(r.planned_quarter) && r.planned_quarter.length > 0
          ? r.planned_quarter[0] : null,
        sprintName: null,
        labels: r.request_type ? [r.request_type] : [],
        resolution: null, severity: null,
        commentsCount: 0, childCount: 0,
        createdAt: r.created_at ?? '', updatedAt: r.updated_at ?? '',
        createdBy: null,
      } as any));
    },
  });
  return data;
}

function useProductBrResults(productId: string | null, filters: FilterState, search: string) {
  return useQuery({
    queryKey: ['product-br-results', productId, JSON.stringify(filters), search],
    enabled: !!productId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title, process_step, urgency, po_user_id, created_by, request_type, planned_quarter, end_date, created_at, updated_at')
        .eq('product_id', productId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (!rows) return { items: [], totalCount: 0 };
      const userIds = [...new Set(
        (rows as any[]).flatMap((r: any) => [r.po_user_id, r.created_by].filter(Boolean))
      )];
      const profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles').select('id, full_name').in('id', userIds as string[]);
        (profiles ?? []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
      }
      let items: JqlResultRow[] = (rows as any[]).map((r) => mapBrToJqlRow(r, profileMap));
      if (filters.assignee.length > 0) {
        items = items.filter(r => r.assigneeName && filters.assignee.includes(r.assigneeName));
      }
      if (filters.status.length > 0) {
        items = items.filter(r => filters.status.includes(r.status));
      }
      if (filters.workType.length > 0) {
        const labels = (r: any) => (r as any).labels as string[];
        items = items.filter(r => filters.workType.some(t => labels(r).includes(t)));
      }
      if (filters.priority.length > 0) {
        items = items.filter(r => r.priority && filters.priority.includes(r.priority));
      }
      if (filters.labels.length > 0) {
        items = items.filter(r => {
          const rLabels = (r as any).labels as string[];
          return filters.labels.some(l => rLabels.includes(l));
        });
      }
      if (filters.sprintReleases.length > 0) {
        items = items.filter(r => {
          const sr = (r as any).sprintRelease as string[];
          return Array.isArray(sr) && filters.sprintReleases.some(v => sr.includes(v));
        });
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        items = items.filter(r => r.summary.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
      }
      return { items, totalCount: items.length };
    },
  });
}

const ALL_FILTER_STATUSES = [
  'To Do', 'In Requirements', 'In Design', 'Ready for Development',
  'In Development', 'Ready for QA', 'In QA', 'Ready for UAT', 'In UAT',
  'In Production', 'Done', 'Blocked', 'On Hold', 'Closed', 'Cancelled',
  'Backlog', 'In Progress', 'In Review', 'Ready to Implement',
  'Beta Ready',
];

function filterStatusAppearance(status: string | null | undefined): LozengeAppearance {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s === 'done' || s === 'closed' || s === 'cancelled') return 'success';
  if (s.includes('progress') || s.includes('development') || s.includes('qa') || s.includes('uat') || s.includes('review') || s.includes('design') || s.includes('requirements')) return 'inprogress';
  if (s === 'blocked') return 'removed';
  if (s === 'on hold') return 'moved';
  return 'default';
}

// Reverse of filterStateToJql — parses the predictable JQL we generate back into
// chip-level FilterState so saved filters restore their UI selections on load.
// Only handles the exact format filterStateToJql outputs; arbitrary JQL is ignored.
const JQL_FIELD_TO_FACET: Record<string, FilterFacet> = {
  assignee:    'assignee',
  reporter:    'reporter',
  status:      'status',
  priority:    'priority',
  issuetype:   'workType',
  labels:      'labels',
  fixVersion:  'sprintReleases',
  parent:      'parent',
  resolution:  'resolution',
  sprint:      'sprint',
  storyPoints: 'storyPoints',
  'cf[10125]': 'severity',
};

function jqlToFilterState(jql: string): Partial<FilterState> {
  const result: Partial<FilterState> = {};
  // Match: field in ("a", "b") — multi-value
  const inRe = /(\S+)\s+in\s+\(([^)]+)\)/g;
  // Match: field = "a" — single-value (skip project clause)
  const eqRe = /(\S+)\s+=\s+"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = inRe.exec(jql)) !== null) {
    const facet = JQL_FIELD_TO_FACET[m[1]];
    if (!facet) continue;
    const vals = [...m[2].matchAll(/"([^"]+)"/g)].map(v => v[1]);
    if (vals.length) result[facet] = vals;
  }
  while ((m = eqRe.exec(jql)) !== null) {
    if (m[1] === 'project') continue;
    const facet = JQL_FIELD_TO_FACET[m[1]];
    if (!facet || result[facet]) continue; // skip if already set by IN clause
    result[facet] = [m[2]];
  }
  return result;
}

// Mirrors AllWorkToolbar's TOOLBAR_FACET_TYPES exactly — same type filter drives
// the Work type chip options so FilterPreviewPage shows the same set as AllWork.
const TOOLBAR_FACET_TYPES = ['Story', 'Backend', 'Frontend', 'Sub-task', 'Epic', 'Feature'];

/* 2026-06-16 — incident-mode facet items.
   Same SELECT/shape as useProjectFacetItems but filtered by
   issue_type='Production Incident' across ALL projects (incidents are
   cross-project in Catalyst). Enabled flag is passed by the caller. */
function useIncidentFacetItems(enabled: boolean): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['filter-preview-incident-facet-items'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('ph_issues')
        .select(
          'issue_key, project_key, issue_type, status, status_category, assignee_account_id, assignee_display_name, reporter_account_id, reporter_display_name, priority, labels, sprint_release, sprint_name, resolution, severity, parent_key, parent_summary'
        )
        .eq('issue_type', 'Production Incident')
        .is('jira_removed_at', null)
        .is('archived_at', null)
        .is('deleted_at', null)
        .limit(5000);
      if (!rows) return [];
      return (rows as any[]).map(
        (r: any): WorkItem =>
          ({
            id: r.issue_key,
            projectId: r.project_key ?? 'INCIDENTS',
            parentId: null,
            parentKey: r.parent_key ?? null,
            parentSummary: r.parent_summary ?? null,
            jiraKey: r.issue_key,
            type: 'task' as any,
            rawType: r.issue_type ?? null,
            summary: '',
            status: 'todo' as any,
            statusName: r.status ?? '',
            statusCategory: (r.status_category ?? 'todo') as any,
            assigneeId: r.assignee_account_id ?? null,
            assignee: r.assignee_display_name
              ? { id: r.assignee_account_id ?? r.assignee_display_name, name: r.assignee_display_name, avatarUrl: null, initials: '', color: '' }
              : undefined,
            reporterId: null,
            reporter: r.reporter_display_name
              ? { id: r.reporter_account_id ?? '', name: r.reporter_display_name }
              : undefined,
            priority: (r.priority ?? 'medium') as any,
            fixVersion: null,
            sprintRelease: Array.isArray(r.sprint_release) && r.sprint_release.length > 0 ? r.sprint_release[0] : null,
            sprintName: r.sprint_name ?? null,
            labels: r.labels ?? [],
            resolution: r.resolution ?? null,
            severity: r.severity ?? null,
            commentsCount: 0,
            childCount: 0,
            createdAt: '',
            updatedAt: '',
            createdBy: null,
          } as any)
      );
    },
  });
  return data;
}

/* 2026-06-17 — tasks-mode helpers.
   Maps a row from the `tasks` table → JqlResultRow so the canonical results
   table renders unchanged. Parent / sprint fields are null (tasks don't carry
   these per CLAUDE.md zero-assumption — render NOTHING, never lie). */
function mapTaskRowToJqlRow(r: any): JqlResultRow {
  return {
    id: r.id,
    key: r.task_key ?? r.key ?? r.id,
    summary: r.title ?? '',
    issueType: 'Task',
    status: r.status?.name ?? '',
    statusCategory: r.status?.slug ?? 'todo',
    projectKey: r.workstream?.key_prefix ?? 'TASKS',
    assigneeName: r.assignee?.full_name ?? null,
    priority: r.priority ?? null,
    created: r.created_at ?? null,
    updated: r.updated_at ?? null,
    dueDate: r.due_date ?? null,
    parentKey: null,
    parentSummary: null,
    sprintName: null,
    isFlagged: null,
    flagReason: null,
    ...({
      sprintRelease: [],
      labels: [],
      commentCount: 0,
      reporterName: null,
    } as any),
  };
}

/* Facet items for the chip dropdowns. Returns the `tasks` table mapped to
 *  the WorkItem shape so the shared `distinctOptions` helper (which only
 *  reads `assignee.name`, `priority`, `statusName`, `rawType`) produces the
 *  same chip options the project / product / incident hubs do. */
function useTasksFacetItems(enabled: boolean): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['filter-preview-tasks-facet-items'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('tasks')
        .select(
          '*, status:task_statuses(id, name, slug), assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), workstream:task_workstreams(id, name, key_prefix)',
        )
        .is('deleted_at', null)
        .limit(2000);
      if (!rows) return [];
      return (rows as any[]).map(
        (r: any): WorkItem =>
          ({
            id: r.task_key ?? r.key ?? r.id,
            projectId: r.workstream?.key_prefix ?? 'TASKS',
            parentId: null,
            parentKey: null,
            parentSummary: null,
            jiraKey: r.task_key ?? r.key ?? r.id,
            type: 'task' as any,
            rawType: 'Task',
            summary: r.title ?? '',
            status: 'todo' as any,
            statusName: r.status?.name ?? '',
            statusCategory: (r.status?.slug ?? 'todo') as any,
            assigneeId: r.assignee_id ?? null,
            assignee: r.assignee
              ? { id: r.assignee.id, name: r.assignee.full_name ?? 'Unknown', avatarUrl: r.assignee.avatar_url ?? null, initials: '', color: '' }
              : undefined,
            reporterId: null,
            reporter: undefined,
            priority: (r.priority ?? 'medium') as any,
            fixVersion: null,
            sprintRelease: null,
            sprintName: null,
            labels: [],
            resolution: null,
            severity: null,
            commentsCount: 0,
            childCount: 0,
            createdAt: r.created_at ?? '',
            updatedAt: r.updated_at ?? '',
            createdBy: null,
          } as any),
      );
    },
  });
  return data;
}

/* Tasks results — client-side JQL evaluation over the `tasks` table. The
 *  JQL engine in useJqlResults is hardcoded to ph_issues, so we replicate a
 *  small field-aware filter pass here. Supported fields: assignee, status,
 *  priority, duedate, summary search. Free-text search lifts the search box
 *  value over the title field. */
function useTasksResults(filters: FilterState, search: string, enabled: boolean) {
  return useQuery({
    queryKey: ['tasks-filter-results', JSON.stringify(filters), search],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('tasks')
        .select(
          '*, status:task_statuses(id, name, slug), assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url), workstream:task_workstreams(id, name, key_prefix)',
        )
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(500);
      if (!rows) return { items: [] as JqlResultRow[], totalCount: 0 };

      let items: JqlResultRow[] = (rows as any[]).map(mapTaskRowToJqlRow);

      if (filters.assignee.length > 0) {
        items = items.filter(r => r.assigneeName && filters.assignee.includes(r.assigneeName));
      }
      if (filters.status.length > 0) {
        items = items.filter(r => filters.status.includes(r.status));
      }
      if (filters.priority.length > 0) {
        items = items.filter(r => r.priority && filters.priority.includes(r.priority));
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        items = items.filter(r => r.summary.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
      }
      return { items, totalCount: items.length };
    },
  });
}

function useProjectFacetItems(projectKey: string | undefined): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['filter-preview-facet-items', projectKey],
    enabled: !!projectKey,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('ph_issues')
        .select(
          'issue_key, issue_type, status, status_category, assignee_account_id, assignee_display_name, reporter_account_id, reporter_display_name, priority, labels, sprint_release, sprint_name, resolution, severity, parent_key, parent_summary'
        )
        .eq('project_key', projectKey)
        .in('issue_type', TOOLBAR_FACET_TYPES)
        .is('jira_removed_at', null)
        .is('archived_at', null)
        .is('deleted_at', null)
        .limit(5000);
      if (!rows) return [];
      return (rows as any[]).map(
        (r: any): WorkItem =>
          ({
            id: r.issue_key,
            projectId: projectKey!,
            parentId: null,
            parentKey: r.parent_key ?? null,
            parentSummary: r.parent_summary ?? null,
            jiraKey: r.issue_key,
            type: 'task' as any,
            rawType: r.issue_type ?? null,
            summary: '',
            status: 'todo' as any,
            statusName: r.status ?? '',
            statusCategory: (r.status_category ?? 'todo') as any,
            assigneeId: r.assignee_account_id ?? null,
            assignee: r.assignee_display_name
              ? { id: r.assignee_account_id ?? r.assignee_display_name, name: r.assignee_display_name, avatarUrl: null, initials: '', color: '' }
              : undefined,
            reporterId: null,
            reporter: r.reporter_display_name
              ? { id: r.reporter_account_id ?? '', name: r.reporter_display_name }
              : undefined,
            priority: (r.priority ?? 'medium') as any,
            fixVersion: null,
            sprintRelease: Array.isArray(r.sprint_release) && r.sprint_release.length > 0 ? r.sprint_release[0] : null,
            sprintName: r.sprint_name ?? null,
            labels: r.labels ?? [],
            resolution: r.resolution ?? null,
            severity: r.severity ?? null,
            commentsCount: 0,
            childCount: 0,
            createdAt: '',
            updatedAt: '',
            createdBy: null,
          } as any)
      );
    },
  });
  return data;
}

interface Member { id: string; name: string; src: string | null }

function useProjectMembers(projectKey: string | undefined): Member[] {
  const { data = [] } = useQuery<Member[]>({
    queryKey: ['filter-preview-members', projectKey],
    enabled: !!projectKey,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
      if (!project?.id) return [];
      const { data } = await supabase
        .from('project_members')
        .select('user_id, profiles!inner(id, full_name, avatar_url)')
        .eq('project_id', project.id)
        .limit(20);
      return ((data ?? []) as any[]).map((r) => ({
        id: r.profiles?.id ?? r.user_id,
        name: r.profiles?.full_name ?? 'Member',
        src: r.profiles?.avatar_url ?? null,
      }));
    },
  });
  return data;
}

// ---------------------------------------------------------------------------
// Linked entities — scaffolded for future Kanban/board/widget wiring.
// When a saved filter gains dependents (Kanban board, Sprint board, gadget),
// this hook will return them and the impact Flag will show automatically.
// ---------------------------------------------------------------------------
export interface LinkedFilterEntity {
  type: string;   // e.g. "Kanban board", "Sprint board"
  name: string;
  href?: string;
}

function useLinkedEntities(_filterId: string | null): LinkedFilterEntity[] {
  // TODO: query ph_filter_dependents (or equivalent) when the schema exists.
  return [];
}

// ---------------------------------------------------------------------------

interface FilterPreviewPageProps {
  /** 2026-06-15: mode switch. project (default) hits ph_issues via the JQL
   *  engine. product hits business_requests via a client-side filter pass.
   *  2026-06-16: 'incident' added — same chrome, ph_issues filtered to
   *  issue_type='Production Incident' (cross-project). 2026-06-17: 'tasks'
   *  added — same chrome, `tasks` table via a client-side filter pass.
   *  Per CLAUDE.md "ADOPT CANONICAL COMPONENTS" rule. */
  mode?: 'project' | 'product' | 'incident' | 'tasks';
}

export function FilterPreviewPage({ mode = 'project' }: FilterPreviewPageProps = {}) {
  const isProduct = mode === 'product';
  const isIncident = mode === 'incident';
  const isTasks = mode === 'tasks';
  const { key: routeKey } = useParams<{ key: string }>();
  /* `projectKey` keeps its original name through the file so we don't have to
     touch hundreds of references. In project mode it's the project key (e.g.
     'BAU'); in product mode it's the product code (e.g. 'INV'); in incident
     mode the sentinel 'INCIDENTS' (no :key in URL); in tasks mode the
     sentinel 'TASKS' (no :key in URL). */
  const projectKey =
    isIncident ? 'INCIDENTS'
    : isTasks ? 'TASKS'
    : routeKey;
  /* Product info — only fetched when mode='product'. id is the products.id
     UUID used to filter business_requests. Name shows in the header. */
  const productInfo = useProductByCode(isProduct ? routeKey : undefined);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlFilterId = searchParams.get('filterId');

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  // When opened from a saved filter, this holds the raw saved JQL and name.
  const [savedFilterJql, setSavedFilterJql] = useState<string | null>(null);
  const [savedFilterName, setSavedFilterName] = useState<string | null>(null);
  const [openChipKey, setOpenChipKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Column picker — mirrors BacklogPage's canonical column-visibility state.
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(['key', 'status', 'parent', 'assignee'])
  );

  // Column order + widths — localStorage keys scoped to avoid collision with BacklogPage
  const COL_WIDTHS_KEY = `ph-filter-col-widths-v1:${projectKey}`;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    () => { try { const r = localStorage.getItem(COL_WIDTHS_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; } }
  );
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);

  // Density state — mirrors BacklogPage (default 'compact')
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  // Ask Caty inline bar — mirrors BacklogPage's setAskCatyOpen pattern
  const [askCatyOpen, setAskCatyOpen] = useState(false);

  // JC-1: Basic/JQL mode toggle
  const [filterMode, setFilterMode] = useState<'basic' | 'jql'>('basic');
  const [jqlText, setJqlText] = useState('');

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id ?? null);
    });
  }, []);

  // Save state — isDirty gates the Save button; savedFilterId drives override logic
  const [savedFilterId, setSavedFilterId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const updateFilter = useUpdateSavedFilter();

  // Atlaskit Flag notifications
  const [flags, setFlags] = useState<
    Array<{ id: string; type: 'save-success' | 'impact-entities' }>
  >([]);
  const flagIdRef = useRef(0);
  const addFlag = useCallback((type: 'save-success' | 'impact-entities') => {
    const id = `flag-${++flagIdRef.current}`;
    setFlags(prev => [...prev, { id, type }]);
    if (type !== 'override-warning') {
      setTimeout(() => setFlags(prev => prev.filter(f => f.id !== id)), 8000);
    }
  }, []);
  const dismissFlag = useCallback(
    (id: string) => setFlags(prev => prev.filter(f => f.id !== id)),
    []
  );

  const linkedEntities = useLinkedEntities(savedFilterId);
  /* Facet items: project pulls from ph_issues; product pulls from business_requests;
     incident pulls from ph_issues filtered by issue_type='Production Incident';
     2026-06-17: tasks pulls from the `tasks` table joined with statuses /
     assignees / workstreams. All four hooks return the same WorkItem shape
     so the facet chip logic doesn't branch downstream. */
  const projectFacetItems = useProjectFacetItems((isProduct || isIncident || isTasks) ? undefined : projectKey);
  const productFacetItems = useProductBrFacetItems(isProduct ? productInfo.id : null);
  const incidentFacetItems = useIncidentFacetItems(isIncident);
  const tasksFacetItems = useTasksFacetItems(isTasks);
  /* Stable empty array shared across renders for modes where the facet
     source is disabled — keeps `facetItems` reference identity when
     incident-mode data is still loading and prevents the upstream
     `facetOptions` memo from invalidating on every render. */
  const EMPTY_FACET_ITEMS: WorkItem[] = useMemo(() => [], []);
  const facetItems = isProduct
    ? productFacetItems
    : isIncident
      ? (incidentFacetItems.length > 0 ? incidentFacetItems : EMPTY_FACET_ITEMS)
      : isTasks
        ? (tasksFacetItems.length > 0 ? tasksFacetItems : EMPTY_FACET_ITEMS)
        : projectFacetItems;
  const members = useProjectMembers((isProduct || isIncident || isTasks) ? undefined : projectKey);
  const jqlValuePool = useJQLValuePool(facetItems, projectKey);

  // Load saved filter when navigated from FiltersListPage with ?filterId=
  const { data: loadedFilter } = useQuery({
    queryKey: ['ph_saved_filter', urlFilterId],
    enabled: !!urlFilterId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('ph_saved_filters')
        .select('id, name, jql_query, filter_config, user_id, owner_id, subscriber_ids, viewers_config, editors_config, used_by_board_ids, is_shared, page, created_at, updated_at, hub_scope, health_status, description, starred_by_user_ids, last_used_at, use_count')
        .eq('id', urlFilterId)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Seed savedFilterId, JQL, and name once the filter row arrives.
  useEffect(() => {
    if (!loadedFilter) return;
    setSavedFilterId(loadedFilter.id);
    setSavedFilterName(loadedFilter.name ?? null);
    setSavedFilterJql(loadedFilter.jql_query ?? null);
    const cfg = loadedFilter.filter_config;
    // Prefer filter_config when it has FilterState shape (chips already stored).
    if (cfg && typeof cfg === 'object' && ('workType' in cfg || 'status' in cfg || 'assignee' in cfg)) {
      setFilters({ ...EMPTY_FILTERS, ...(cfg as Partial<FilterState>) });
    } else if (loadedFilter.jql_query) {
      // Legacy filters stored only jql_query — parse it back into chip state.
      const parsed = jqlToFilterState(loadedFilter.jql_query);
      if (Object.keys(parsed).length > 0) {
        setFilters({ ...EMPTY_FILTERS, ...parsed });
      }
    }
  }, [loadedFilter]);

  const facetOptions = useMemo(() => {
    const ALL_FACETS = ['workType', 'status', 'assignee', ...MORE_FILTERS_FACETS] as const;
    const out: Record<string, FacetOption[]> = {};
    for (const f of ALL_FACETS) out[f] = distinctOptions(facetItems, f as any);
    return out;
  }, [facetItems]);

  // When a saved filter is loaded via ?filterId=, use its stored JQL directly.
  // In JQL mode, use the raw jqlText. Otherwise derive from chip state.
  /* 2026-06-17: for incident mode, don't inject `project = "INCIDENTS"` into
     the JQL — 'INCIDENTS' is a sentinel for save scope, not a real project,
     and the resulting `project = "INCIDENTS"` query returns zero rows and
     wastes the JQL pipeline. The issuetype guard in effectiveJql is what
     actually constrains incident results. Tasks mode follows the same
     pattern — the 'TASKS' sentinel is for save scope only, and the tasks
     query path doesn't go through the ph_issues JQL engine at all. */
  const jqlProjectKey = (isIncident || isTasks) ? undefined : projectKey;
  const jql = useMemo(() => {
    if (filterMode === 'jql') return jqlText || filterStateToJql(filters, jqlProjectKey);
    return savedFilterJql ?? filterStateToJql(filters, jqlProjectKey);
  }, [filterMode, jqlText, savedFilterJql, filters, jqlProjectKey]);

  /* Data fetch: project uses the JQL engine over ph_issues; product runs a
     client-side filter pass over business_requests; incident reuses the same
     JQL engine but constrains every query to issue_type='Production Incident'
     so the results panel only ever shows incidents regardless of what the
     user enters in the chips/JQL editor.

     2026-06-16: separate the ORDER BY so we don't produce malformed JQL like
     `(x ORDER BY y) AND z` — the translator breaks at ORDER BY and drops the
     trailing AND clause. We strip ORDER BY from the user JQL, append the
     guard, then re-append ORDER BY at the end.
     2026-06-17: do NOT wrap the body in parentheses. The JQL tokenizer has
     an infinite-loop bug when state is 'expect-operator' and the next char
     is `(` — readBareWord returns empty, tryReadOperator returns null, and
     `i` never advances. The translator treats AND-conjunctions implicitly,
     so paren-wrapping was never needed for correctness anyway. */
  const effectiveJql = useMemo(() => {
    if (isProduct || isTasks) return '';
    if (!isIncident) return jql;
    const guard = 'issuetype = "Production Incident"';
    const raw = (jql ?? '').trim();
    if (!raw) return guard;
    const orderByMatch = raw.match(/\s+ORDER\s+BY\s+.+$/i);
    const orderBy = orderByMatch ? orderByMatch[0] : '';
    const body = orderBy ? raw.slice(0, raw.length - orderBy.length).trim() : raw;
    return body ? `${body} AND ${guard}${orderBy}` : `${guard}${orderBy}`;
  }, [isProduct, isIncident, isTasks, jql]);
  const projectResults = useJqlResults(effectiveJql);
  const productResults = useProductBrResults(isProduct ? productInfo.id : null, filters, search);
  const tasksResults = useTasksResults(filters, search, isTasks);
  const data = isProduct ? productResults.data
    : isTasks ? tasksResults.data
    : projectResults.data;
  const isLoading = isProduct ? productResults.isLoading
    : isTasks ? tasksResults.isLoading
    : projectResults.isLoading;
  const isFetching = isProduct ? productResults.isFetching
    : isTasks ? tasksResults.isFetching
    : projectResults.isFetching;

  const items = useMemo(() => {
    const rows = [...(data?.items ?? [])];
    const dir = sortOrder === 'ASC' ? 1 : -1;
    rows.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[sortKey] ?? '';
      const vb = (b as unknown as Record<string, unknown>)[sortKey] ?? '';
      return va < vb ? -dir : va > vb ? dir : 0;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      return rows.filter(r => r.summary.toLowerCase().includes(q) || r.key.toLowerCase().includes(q));
    }
    return rows;
  }, [data?.items, sortKey, sortOrder, search]);

  // Resolve each parent's TRUE issue_type so the Parent cell draws the real
  // icon (no hardcoded "Story" lie — CLAUDE.md zero-assumption 2026-06-11).
  const parentTypeMap = useParentIssueTypes((data?.items ?? []).map((r) => r.parentKey));

  const totalCount = totalSelected(filters);
  const moreCount = MORE_FILTERS_FACETS.reduce((n, f) => n + filters[f].length, 0);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const switchToJql = useCallback(() => {
    const current = savedFilterJql ?? filterStateToJql(filters, jqlProjectKey);
    setJqlText(current);
    setFilterMode('jql');
  }, [savedFilterJql, filters, jqlProjectKey]);

  const switchToBasic = useCallback(() => {
    const parsed = jqlToFilterState(jqlText);
    if (Object.keys(parsed).length > 0) {
      setFilters({ ...EMPTY_FILTERS, ...parsed });
      setSavedFilterJql(null);
    } else if (jqlText.trim()) {
      setSavedFilterJql(jqlText.trim());
    }
    setFilterMode('basic');
  }, [jqlText]);

  const updateFacet = (facet: string, next: string[]) => {
    setFilters(prev => ({ ...prev, [facet]: next }));
    setSavedFilterJql(null); // switch to chip-driven JQL once user modifies
    markDirty();
  };

  const toggleValue = (facet: string, value: string) => {
    const cur = filters[facet as keyof FilterState];
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value];
    updateFacet(facet, next);
  };

  const openDetail = (key: string) =>
    useGlobalSearchStore.getState().openDetail({ id: key });

  const avatarData = members.map((m) => ({ key: m.id, name: m.name, src: resolveAvatarUrl(m.src ?? null) ?? undefined }));

  // ── Save handlers ──────────────────────────────────────────────────────────

  // Jira "Save" behavior: update JQL in-place, no dialog.
  // Also persist filter_config as the current chip state so the next
  // load can restore chips without re-parsing JQL.
  const handleSaveClick = () => {
    if (savedFilterId) {
      updateFilter.mutate(
        {
          id: savedFilterId,
          updates: { jql_query: jql.trim() || null, filter_config: filters },
        },
        {
          onSuccess: () => {
            setIsDirty(false);
            addFlag('save-success');
          },
        }
      );
    } else {
      setSaveOpen(true);
    }
  };

  const handleSaved = useCallback(
    (id: string) => {
      setSaveOpen(false);
      setSavedFilterId(id);
      setIsDirty(false);
      if (linkedEntities.length > 0) addFlag('impact-entities');
      navigate(
        isIncident
          ? '/incident-hub/filters'
          : isTasks
            ? '/tasks/filters'
            : `/${isProduct ? 'product-hub' : 'project-hub'}/${projectKey}/filters`
      );
    },
    [linkedEntities, addFlag, navigate, projectKey, isIncident, isTasks, isProduct]
  );

  // ── Column definitions — mirrors BacklogPage.atlaskit.tsx canonical structure
  // JqlResultRow is read-only (no mutation), so edit cells use canEdit:()=>false.

  const columns = useMemo<Column<JqlResultRow>[]>(() => {
    const keyCellRenderer = makeKeyCell(
      (r: JqlResultRow) => r.key,
      (r: JqlResultRow) => openDetail(r.key),
      undefined,
      (r: JqlResultRow) => r.issueType ? <JiraIssueTypeIcon type={jiraIconType(r.issueType)} size={16} /> : undefined,
    );
    const summaryCellRenderer = makeSummaryInlineEditCell<JqlResultRow>({
      getSummary: (r) => r.summary,
      canEdit: () => false,
      onChange: () => {},
    });

    return [
      {
        id: 'key',
        label: 'Work',
        flex: true,
        sortable: true,
        alwaysVisible: true,
        defaultVisible: true,
        accessor: (r) => r.key,
        cell: function WorkCell(props: any) {
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
              {keyCellRenderer(props)}
              <span style={{ flex: 1, minWidth: 0 }}>{summaryCellRenderer(props)}</span>
            </span>
          );
        },
      },
      {
        id: 'parent',
        label: 'Parent',
        width: 11,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.parentKey ?? '',
        cell: makeParentEditCell<JqlResultRow>({
          getParent: (r) => {
            if (!r.parentKey) return null;
            const pType = parentTypeMap.get(r.parentKey);
            return {
              id: r.parentKey,
              key: r.parentKey,
              label: r.parentSummary ?? r.parentKey,
              icon: pType ? <JiraIssueTypeIcon type={pType} size={16} /> : undefined,
            };
          },
          options: [],
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'status',
        label: 'Status',
        width: 15,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.status,
        cell: makeStatusEditCell<JqlResultRow>({
          getStatus: (r) => r.status,
          options: ALL_FILTER_STATUSES,
          appearanceFor: (s) => filterStatusAppearance(s) as LozengeAppearance,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'comments',
        label: 'Comments',
        width: 8,
        sortable: false,
        defaultVisible: false,
        alwaysVisible: false,
        cell: makeCommentsCell(
          (r: JqlResultRow) => r.commentCount,
          (r: JqlResultRow) => openDetail(r.key),
        ),
      },
      {
        id: 'sprint_release',
        label: 'Sprint/Release',
        width: 18,
        sortable: false,
        defaultVisible: true,
        accessor: (r) => (r.sprintRelease || []).join(', '),
        cell: makeSprintReleaseCell((r: JqlResultRow) => r.sprintRelease),
        include: (row: JqlResultRow) => row.issueType !== 'Feature',
      },
      {
        id: 'assignee',
        label: 'Assignee',
        width: 11,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.assigneeName ?? '',
        cell: makeAssigneeEditCell<JqlResultRow>({
          getAssignee: (r) => r.assigneeName
            ? { id: r.assigneeName, name: r.assigneeName, avatarUrl: resolveAvatarUrl(r.assigneeName) }
            : null,
          options: [],
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'due_date',
        label: 'Due date',
        width: 8,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.dueDate ?? '',
        cell: makeDateEditCell<JqlResultRow>({
          getDate: (r) => r.dueDate,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'priority',
        label: 'Priority',
        width: 6,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.priority ?? '',
        cell: makePriorityEditCell<JqlResultRow>({
          getPriority: (r) => r.priority,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'labels',
        label: 'Labels',
        width: 7,
        sortable: false,
        defaultVisible: false,
        accessor: (r) => (r.labels || []).join(', '),
        cell: makeLabelsEditCell<JqlResultRow>({
          getLabels: (r) => r.labels,
          canEdit: () => false,
          onChange: () => {},
        }),
      },
      {
        id: 'created',
        label: 'Created',
        width: 8,
        sortable: true,
        defaultVisible: true,
        accessor: (r) => r.created ?? '',
        cell: makeDateCell((r: JqlResultRow) => r.created),
      },
      {
        id: 'updated',
        label: 'Updated',
        width: 8,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.updated ?? '',
        cell: makeDateCell((r: JqlResultRow) => r.updated),
      },
      {
        id: 'reporter',
        label: 'Reporter',
        width: 10,
        sortable: true,
        defaultVisible: false,
        accessor: (r) => r.reporterName ?? '',
        cell: makeAssigneeCell((r: JqlResultRow) =>
          r.reporterName
            ? { name: r.reporterName, avatarUrl: resolveAvatarUrl(r.reporterName) ?? null }
            : null,
        ),
      },
      {
        id: '__actions',
        label: '',
        width: 5,
        sortable: false,
        alwaysVisible: true,
        cell: makeRowMenuCell({
          onOpen: (r: JqlResultRow) => openDetail(r.key),
        }),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentTypeMap]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AtlaskitPageShell
      flush
      chromeBand={
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 653,
            color: token('color.text', '#172B4D'),
            lineHeight: '28px',
          }}
        >
          {savedFilterName ?? 'Create filter'}
        </h1>
      }
    >
      {/* Ask Caty inline bar — replaces toolbar row when open (mirrors BacklogPage) */}
      {askCatyOpen && (
        <AskCatyInlineBar
          projectKey={projectKey ?? null}
          surface="list"
          onClose={() => setAskCatyOpen(false)}
          onJqlGenerated={(generatedJql) => {
            setSavedFilterJql(generatedJql);
            markDirty();
          }}
        />
      )}

      {/* Toolbar — hidden when Caty bar is open — Jira two-row layout */}
      <div
        style={{
          display: askCatyOpen ? 'none' : 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        }}
      >
        {/* ── Row 1: Ask Caty · Basic/JQL toggle · search · chips · active chips ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', flexWrap: 'nowrap', overflow: 'visible' }}>
          <AIIntelligenceButton
            label="Ask Caty"
            onClick={() => setAskCatyOpen(true)}
            tooltip="Ask Caty about these results"
          />

          {/* JC-1: Basic / JQL toggle — Jira-style adjacent buttons */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button
              onClick={switchToBasic}
              style={{
                height: 32, padding: '0 8px', fontSize: 14,
                fontWeight: filterMode === 'basic' ? 600 : 400,
                border: `1px solid ${filterMode === 'basic' ? token('color.border.focused', '#388BFF') : token('color.border', '#DFE1E6')}`,
                borderRight: filterMode === 'basic' ? `1px solid ${token('color.border.focused', '#388BFF')}` : 'none',
                borderRadius: '3px 0 0 3px',
                background: 'transparent',
                color: filterMode === 'basic' ? token('color.link', '#0C66E4') : token('color.text', '#172B4D'),
                cursor: 'pointer',
              }}
            >
              Basic
            </button>
            <button
              onClick={switchToJql}
              style={{
                height: 32, padding: '0 8px', fontSize: 14,
                fontWeight: filterMode === 'jql' ? 600 : 400,
                border: `1px solid ${filterMode === 'jql' ? token('color.border.focused', '#388BFF') : token('color.border', '#DFE1E6')}`,
                borderRadius: '0 3px 3px 0',
                background: 'transparent',
                color: filterMode === 'jql' ? token('color.link', '#0C66E4') : token('color.text', '#172B4D'),
                cursor: 'pointer',
              }}
            >
              JQL
            </button>
          </div>

          {filterMode === 'jql' ? (
            /* JQL mode: single-line editor takes remaining width */
            <div style={{ flex: 1, minWidth: 0 }}>
              <JQLEditor
                value={jqlText}
                onChange={v => { setJqlText(v); markDirty(); }}
                singleLine
                placeholder="project = BAU AND status in (Done) ORDER BY updated DESC"
                valuePool={jqlValuePool}
              />
            </div>
          ) : (
            <>
              {/* JC-4: compact search — fixed 200px, no flex expansion */}
              <div style={{ width: 200, flexShrink: 0 }}>
                <Textfield
                  isCompact
                  placeholder="Search work"
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setSearch(e.target.value);
                    markDirty();
                  }}
                  elemBeforeInput={
                    <span style={{ paddingInlineStart: 8, color: token('color.text.subtlest', '#6B778C'), display: 'flex', alignItems: 'center' }}>
                      <AkSearchIcon label="" size="small" />
                    </span>
                  }
                  elemAfterInput={
                    search ? (
                      <Button
                        appearance="subtle"
                        spacing="compact"
                        iconBefore={AkCloseIcon}
                        onClick={() => setSearch('')}
                        label="Clear search"
                      />
                    ) : undefined
                  }
                />
              </div>

              {/* JC-5: chip order — Assignee → Type → Status (Jira order) */}
              <FilterChip
                label={FACET_LABELS.assignee}
                facet="assignee"
                options={facetOptions.assignee ?? []}
                selected={filters.assignee}
                onToggle={v => toggleValue('assignee', v)}
                onClear={() => updateFacet('assignee', [])}
                isOpen={openChipKey === 'assignee'}
                onOpenChange={open => setOpenChipKey(open ? 'assignee' : null)}
                headline="Assignee = (equals)"
              />
              <FilterChip
                label={FACET_LABELS.workType}
                facet="workType"
                options={facetOptions.workType ?? []}
                selected={filters.workType}
                onToggle={v => toggleValue('workType', v)}
                onClear={() => updateFacet('workType', [])}
                isOpen={openChipKey === 'workType'}
                onOpenChange={open => setOpenChipKey(open ? 'workType' : null)}
                headline="Type = (equals)"
              />
              <FilterChip
                label={FACET_LABELS.status}
                facet="status"
                options={facetOptions.status ?? []}
                selected={filters.status}
                onToggle={v => toggleValue('status', v)}
                onClear={() => updateFacet('status', [])}
                isOpen={openChipKey === 'status'}
                onOpenChange={open => setOpenChipKey(open ? 'status' : null)}
                headline="Status = (equals)"
              />

              {/* JC-6: active filter chips — removable inline chips for each selected value */}
              {(['assignee', 'workType', 'status'] as FilterFacet[]).flatMap(facet =>
                filters[facet].map(val => {
                  const opt = (facetOptions[facet] ?? []).find(o => o.value === val);
                  const displayLabel = opt?.label ?? val;
                  return (
                    <span
                      key={`${facet}:${val}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        height: 28, padding: '0 8px',
                        borderRadius: 3,
                        border: `1px solid ${token('color.border.focused', '#388BFF')}`,
                        background: 'transparent',
                        fontSize: 14,
                        color: token('color.link', '#0C66E4'),
                        whiteSpace: 'nowrap', flexShrink: 0,
                      }}
                    >
                      {FACET_LABELS[facet]}: {displayLabel}
                      <button
                        onClick={() => toggleValue(facet, val)}
                        style={{ background: 'none', border: 'none', padding: '0 0 0 2px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit', fontSize: 16, lineHeight: 1 }}
                        aria-label={`Remove ${FACET_LABELS[facet]} ${displayLabel}`}
                      >×</button>
                    </span>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* ── Row 2: More filters · Clear filters · spacer · count · kebab · Save as · Save filter ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 24px 8px', flexWrap: 'nowrap' }}>
          <FilterTriggerAndPopup
            triggerLabel={`More filters${moreCount > 0 ? ` (${moreCount})` : ''}`}
            isOpen={openChipKey === 'more'}
            onOpenChange={open => setOpenChipKey(open ? 'more' : null)}
            FilterIcon={FilterIcon}
            renderContent={() => {
              const categories: JiraFilterCategory[] = MORE_FILTERS_FACETS.map(f => ({
                id: f,
                label: FACET_LABELS[f],
                options: (facetOptions[f] ?? []).map(o => ({ id: o.value, label: o.label })),
              }));
              const selected: Record<string, string[]> = {};
              for (const f of MORE_FILTERS_FACETS) selected[f] = filters[f];
              return (
                <JiraBasicFilter
                  categories={categories}
                  selected={selected}
                  onSelectionChange={(categoryId, optionIds) => updateFacet(categoryId, optionIds)}
                  onClearAll={() => {
                    const next = { ...filters };
                    for (const f of MORE_FILTERS_FACETS) next[f] = [];
                    setFilters(next);
                    markDirty();
                  }}
                  onClose={() => setOpenChipKey(null)}
                />
              );
            }}
          />

          {totalCount > 0 && (
            <Button
              appearance="subtle"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                markDirty();
              }}
            >
              Clear filters
            </Button>
          )}

          {avatarData.length > 0 && (
            <AvatarGroup
              appearance="stack"
              size="small"
              maxCount={4}
              label="Assignees"
              data={avatarData}
              onAvatarClick={(_, member) => {
                const id = (member as any).key as string;
                toggleValue('assignee', id);
              }}
            />
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 8px', color: token('color.text.subtlest', '#626F86'), fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {isFetching && <Spinner size="small" />}
            {!isFetching && data != null && `${data.totalCount} item${data.totalCount === 1 ? '' : 's'}`}
          </div>

          {/* Kebab menu — only shown when a saved filter is loaded (has an id) */}
          {savedFilterId && loadedFilter && (
            <FilterKebabMenu
              filter={loadedFilter as any}
              currentUserId={currentUserId}
              rows={items}
              isLoadingRows={isFetching}
            />
          )}

          {/* JC-3: Save as — subtle button */}
          {savedFilterId && (
            <Button appearance="subtle" onClick={() => setSaveAsOpen(true)}>
              Save as
            </Button>
          )}

          {/* JC-3: Save filter — ADS canonical button */}
          <Button
            appearance="subtle"
            onClick={handleSaveClick}
            isDisabled={!isDirty || updateFilter.isPending}
          >
            {updateFilter.isPending ? 'Saving…' : 'Save filter'}
          </Button>
        </div>
      </div>

      {/* Table — same container pattern as BacklogPage (padding:24px on wrapper) */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, padding: '24px' }}>
          <JiraTable<JqlResultRow>
            columns={columns}
            data={items}
            getRowId={r => r.id}
            onRowClick={r => openDetail(r.key)}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSortChange={(k, o) => { setSortKey(k); setSortOrder(o); }}
            isLoading={isLoading}
            density={density}
            ariaLabel="Filter preview"
            rowsPerPage={0}
            page={1}
            totalRowCount={data?.totalCount}
            enableVirtualization
            enableColumnReorder
            columnOrder={columnOrder ?? undefined}
            onColumnOrderChange={(next) => setColumnOrder(next)}
            initialColumnWidths={columnWidths}
            onColumnWidthsChange={(widths) => {
              setColumnWidths(widths);
              try { localStorage.setItem(COL_WIDTHS_KEY, JSON.stringify(widths)); } catch { /* quota */ }
            }}
            stickyCreateFooter={{ onRefresh: () => {} }}
            columnVisibility={visibleColumns}
            onColumnVisibilityChange={setVisibleColumns}
            contextMenuActions={[]}
            selectable
            selection={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyView={
              <div style={{ padding: '32px 24px', textAlign: 'center', color: token('color.text.subtle'), fontSize: 14 }}>
                No work items match this filter. Adjust the criteria above.
              </div>
            }
          />
        </div>
      </div>

      {/* New filter save modal — only shown when no existing filter is loaded */}
      {saveOpen && (
        <FilterSaveModal
          initialJql={jql}
          initialName="Untitled filter"
          hubScope={isProduct ? 'product' : 'project'}
          /* 2026-06-16: always pass the hub identity so the saved row's
             project_key / product_key reflects the originating hub. Strict
             scoping in useFiltersForProject requires this — without it,
             saved filters wouldn't match any hub's list query. */
          {...(isProduct ? { productKey: projectKey } : { projectKey })}
          onClose={() => setSaveOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Save as modal — creates a new filter from the current JQL (Jira parity) */}
      {saveAsOpen && (
        <FilterSaveModal
          initialJql={jql}
          initialName={savedFilterName ? `${savedFilterName} (copy)` : 'Untitled filter'}
          hubScope={isProduct ? 'product' : 'project'}
          {...(isProduct ? { productKey: projectKey } : { projectKey })}
          onClose={() => setSaveAsOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Atlaskit Flag notifications — override warning + impact alert */}
      <FlagGroup onDismissed={id => dismissFlag(id as string)}>
        {flags.map(flag => {
          if (flag.type === 'save-success') {
            return (
              <AkFlag
                key={flag.id}
                id={flag.id}
                appearance="success"
                icon={<AkInfoIcon label="Saved" color={token('color.icon.success', '#22A06B')} />}
                title="Filter saved"
                description="Your changes have been saved."
                actions={[{ content: 'Dismiss', onClick: () => dismissFlag(flag.id) }]}
              />
            );
          }
          if (flag.type === 'impact-entities') {
            return (
              <AkFlag
                key={flag.id}
                id={flag.id}
                appearance="info"
                icon={<AkInfoIcon label="Info" color={token('color.icon.information', '#1868DB')} />}
                title="Filter saved — linked views updated"
                description={
                  linkedEntities.length > 0
                    ? `This filter is used by: ${linkedEntities.map(e => `${e.type} "${e.name}"`).join(', ')}. Those views will reflect your changes.`
                    : 'Filter saved successfully.'
                }
                actions={[{ content: 'Dismiss', onClick: () => dismissFlag(flag.id) }]}
              />
            );
          }
          return null;
        })}
      </FlagGroup>
    </AtlaskitPageShell>
  );
}
