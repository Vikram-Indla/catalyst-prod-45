import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AskCatyInlineBar } from '@/components/caty/AskCatyInlineBar';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button/new';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import Textfield from '@atlaskit/textfield';
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
import { useLinkedEntities } from '@/hooks/workhub/useLinkedEntities';
import { jqlToFilterState, hasActiveFacets } from '@/lib/jql/jqlToFilterState';
import { useJqlResults, type JqlResultRow } from '@/hooks/workhub/useJqlResults';
import { useParentIssueTypes } from '@/hooks/workhub/useParentIssueTypes';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { resolveAvatarUrl } from '@/lib/avatars';
import { supabase } from '@/integrations/supabase/client';
import { JQLEditor } from '@/components/filters/JQLEditor';
import { useJQLValuePool } from '@/hooks/workhub/useJQLValuePool';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import type { WorkItem } from '@/types/workItem.types';
import {
  CanonicalFilter,
  type CanonicalFilterValue,
  emptyCanonicalFilterValue,
  countCanonicalActiveFields,
  type CanonicalAssigneeOption,
} from '@/components/filters/CanonicalFilter';
import {
  jqlToCanonicalFilterValue,
  canonicalFilterValueToJql,
} from '@/lib/jql/canonicalFilterJql';

// Fixed column set for filter preview — hides column manager (Jira parity: no column picker on filter view)
const FILTER_PREVIEW_COLS = new Set(['key', 'parent', 'status', 'assignee', 'priority', 'created']);

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

function useProductBrResults(productId: string | null, filters: CanonicalFilterValue, search: string) {
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
      // sprintReleases: not in CanonicalFilterValue — skip
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

// JQL→FilterState parsing now uses the canonical lib parser (imported above).
// The previous local regex fork was deleted in the Phase C de-fork (G2).

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

/* 2026-06-19 — release-mode facet items.
   Same SELECT/shape as useProjectFacetItems but cross-project (no project_key
   filter) — release filters span every project's work, scoped only by the
   user's JQL (typically fixVersion clauses). Standard TOOLBAR_FACET_TYPES so
   the chip dropdowns match the project builder's option set. */
function useReleaseFacetItems(enabled: boolean): WorkItem[] {
  const { data = [] } = useQuery<WorkItem[]>({
    queryKey: ['filter-preview-release-facet-items'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('ph_issues')
        .select(
          'issue_key, project_key, issue_type, status, status_category, assignee_account_id, assignee_display_name, reporter_account_id, reporter_display_name, priority, labels, sprint_release, sprint_name, resolution, severity, parent_key, parent_summary'
        )
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
            projectId: r.project_key ?? 'RELEASES',
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
function useTasksResults(filters: CanonicalFilterValue, search: string, enabled: boolean) {
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

interface FilterPreviewPageProps {
  /** 2026-06-15: mode switch. project (default) hits ph_issues via the JQL
   *  engine. product hits business_requests via a client-side filter pass.
   *  2026-06-16: 'incident' added — same chrome, ph_issues filtered to
   *  issue_type='Production Incident' (cross-project). 2026-06-17: 'tasks'
   *  added — same chrome, `tasks` table via a client-side filter pass.
   *  Per CLAUDE.md "ADOPT CANONICAL COMPONENTS" rule. */
  mode?: 'project' | 'product' | 'incident' | 'tasks' | 'release' | 'test';
}

export function FilterPreviewPage({ mode = 'project' }: FilterPreviewPageProps = {}) {
  const isProduct = mode === 'product';
  const isIncident = mode === 'incident';
  const isTasks = mode === 'tasks';
  const isRelease = mode === 'release';
  const isTest = mode === 'test';
  const { key: routeKey, filterId: routeFilterId } = useParams<{ key: string; filterId: string }>();
  /* `projectKey` keeps its original name through the file so we don't have to
     touch hundreds of references. In project mode it's the project key (e.g.
     'BAU'); in product mode it's the product code (e.g. 'INV'); in incident
     mode the sentinel 'INCIDENTS' (no :key in URL); in tasks mode the
     sentinel 'TASKS' (no :key in URL). */
  const projectKey =
    isIncident ? 'INCIDENTS'
    : isTasks ? 'TASKS'
    : isRelease ? 'RELEASES'
    : isTest ? 'TESTHUB'
    : routeKey;
  /* Product info — only fetched when mode='product'. id is the products.id
     UUID used to filter business_requests. Name shows in the header. */
  const productInfo = useProductByCode(isProduct ? routeKey : undefined);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Route param (:filterId) takes priority over ?filterId= query param
  const urlFilterId = routeFilterId ?? searchParams.get('filterId');
  const urlJql = searchParams.get('jql');

  const [canonicalFilter, setCanonicalFilter] = useState<CanonicalFilterValue>(emptyCanonicalFilterValue);
  // When opened from a saved filter, this holds the raw saved JQL and name.
  const [savedFilterJql, setSavedFilterJql] = useState<string | null>(null);
  const [savedFilterName, setSavedFilterName] = useState<string | null>(null);
  const [filterName, setFilterName] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('updated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // JC-1: Basic/JQL mode toggle. Seed straight from ?jql= (huddle shared-tickets
  // deep link) on the FIRST render — relying on the effect below alone left the
  // editor empty in some mount orderings.
  const [filterMode, setFilterMode] = useState<'basic' | 'jql'>(urlJql ? 'jql' : 'basic');
  const [jqlText, setJqlText] = useState(urlJql ?? '');

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
  const projectFacetItems = useProjectFacetItems((isProduct || isIncident || isTasks || isRelease) ? undefined : projectKey);
  const productFacetItems = useProductBrFacetItems(isProduct ? productInfo.id : null);
  const incidentFacetItems = useIncidentFacetItems(isIncident);
  const tasksFacetItems = useTasksFacetItems(isTasks);
  const releaseFacetItems = useReleaseFacetItems(isRelease);
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
        : isRelease
          ? (releaseFacetItems.length > 0 ? releaseFacetItems : EMPTY_FACET_ITEMS)
          : projectFacetItems;
  const members = useProjectMembers((isProduct || isIncident || isTasks || isRelease) ? undefined : projectKey);
  const jqlValuePool = useJQLValuePool(facetItems, projectKey);

  // Single source of truth for user pickers: only APPROVED access management users.
  const { data: approvedProfiles = [] } = useApprovedProfiles();

  // Load saved filter when navigated from FiltersListPage with ?filterId=
  const { data: loadedFilter } = useQuery({
    queryKey: ['ph_saved_filter', urlFilterId],
    enabled: !!urlFilterId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!urlFilterId) return null;
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const col = UUID_RE.test(urlFilterId) ? 'id' : 'slug';
      const { data, error } = await supabase
        .from('ph_saved_filters')
        .select('id, name, jql_query, filter_config, user_id, owner_id, subscriber_ids, viewers_config, editors_config, used_by_board_ids, is_shared, page, created_at, updated_at, hub_scope, health_status, description, starred_by_user_ids, last_used_at, use_count')
        .eq(col, urlFilterId)
        .maybeSingle();
      if (error && col === 'slug') {
        const { data: d2 } = await supabase
          .from('ph_saved_filters')
          .select('id, name, jql_query, filter_config, user_id, owner_id, subscriber_ids, viewers_config, editors_config, used_by_board_ids, is_shared, page, created_at, updated_at, hub_scope, health_status, description, starred_by_user_ids, last_used_at, use_count')
          .eq('id', urlFilterId)
          .maybeSingle();
        return d2 ?? null;
      }
      return data ?? null;
    },
  });

  // Seed savedFilterId, JQL, name, and canonical filter state once the filter row arrives.
  useEffect(() => {
    if (!loadedFilter) return;
    setSavedFilterId(loadedFilter.id);
    setSavedFilterName(loadedFilter.name ?? null);
    setFilterName(loadedFilter.name ?? '');
    setSavedFilterJql(loadedFilter.jql_query ?? null);
    if (loadedFilter.jql_query) {
      setCanonicalFilter(jqlToCanonicalFilterValue(loadedFilter.jql_query));
    }
  }, [loadedFilter]);

  // Ad-hoc JQL passed via ?jql= (used by the huddle "shared tickets" deep-link).
  useEffect(() => {
    if (!urlJql) return;
    setFilterMode('jql');
    setJqlText(urlJql);
    setSavedFilterJql(urlJql);
    setCanonicalFilter(jqlToCanonicalFilterValue(urlJql));
  }, [urlJql]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canonical assignee options — approved profiles only (same gate as before).
  const canonicalAssigneeOptions = useMemo((): CanonicalAssigneeOption[] =>
    approvedProfiles
      .filter(p => (p as any).jiraAccountId)
      .map(p => ({ id: (p as any).jiraAccountId as string, label: p.name, avatarUrl: (p as any).avatarUrl })),
  [approvedProfiles]);

  // When a saved filter is loaded via ?filterId=, use its stored JQL directly.
  // In JQL mode, use the raw jqlText. Otherwise derive from canonical filter state.
  /* 2026-06-17: for incident mode, don't inject `project = "INCIDENTS"` into
     the JQL — 'INCIDENTS' is a sentinel for save scope, not a real project,
     and the resulting `project = "INCIDENTS"` query returns zero rows and
     wastes the JQL pipeline. The issuetype guard in effectiveJql is what
     actually constrains incident results. Tasks mode follows the same
     pattern — the 'TASKS' sentinel is for save scope only, and the tasks
     query path doesn't go through the ph_issues JQL engine at all. */
  const jqlProjectKey = (isIncident || isTasks || isRelease || isProduct) ? undefined : projectKey;
  const jql = useMemo(() => {
    if (filterMode === 'jql') return jqlText || canonicalFilterValueToJql(canonicalFilter, { projectKey: jqlProjectKey });
    return savedFilterJql ?? canonicalFilterValueToJql(canonicalFilter, { projectKey: jqlProjectKey });
  }, [filterMode, jqlText, savedFilterJql, canonicalFilter, jqlProjectKey]);

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
    const raw = (jql ?? '').trim();

    if (isIncident) {
      const guard = 'issuetype = "Production Incident"';
      if (!raw) return guard;
      const orderByMatch = raw.match(/\s+ORDER\s+BY\s+.+$/i);
      const orderBy = orderByMatch ? orderByMatch[0] : '';
      const body = orderBy ? raw.slice(0, raw.length - orderBy.length).trim() : raw;
      return body ? `${body} AND ${guard}${orderBy}` : `${guard}${orderBy}`;
    }

    // Project hub: pin scope to this project unless JQL already names a project.
    if (!isProduct && !isIncident && !isTasks && !isRelease && !isTest && projectKey) {
      if (!/\bproject\s*=/i.test(raw)) {
        const guard = `project = "${projectKey}"`;
        if (!raw) return guard;
        const orderByMatch = raw.match(/\s+ORDER\s+BY\s+.+$/i);
        const orderBy = orderByMatch ? orderByMatch[0] : '';
        const body = orderBy ? raw.slice(0, raw.length - orderBy.length).trim() : raw;
        return `${guard} AND (${body})${orderBy}`;
      }
    }

    return raw;
  }, [isProduct, isIncident, isTasks, isRelease, isTest, jql, projectKey]);
  const projectResults = useJqlResults(effectiveJql);
  const productResults = useProductBrResults(isProduct ? productInfo.id : null, canonicalFilter, search);
  const tasksResults = useTasksResults(canonicalFilter, search, isTasks);
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

  const hasActiveFilters = countCanonicalActiveFields(canonicalFilter) > 0;

  const markDirty = useCallback(() => setIsDirty(true), []);

  const switchToJql = useCallback(() => {
    const current = savedFilterJql ?? canonicalFilterValueToJql(canonicalFilter, { projectKey: jqlProjectKey });
    setJqlText(current);
    setFilterMode('jql');
  }, [savedFilterJql, canonicalFilter, jqlProjectKey]);

  const switchToBasic = useCallback(() => {
    if (jqlText.trim()) {
      setCanonicalFilter(jqlToCanonicalFilterValue(jqlText));
      setSavedFilterJql(null);
    }
    setFilterMode('basic');
  }, [jqlText]);

  const openDetail = (key: string) =>
    useGlobalSearchStore.getState().openDetail({ id: key });

  // ── Save handlers ──────────────────────────────────────────────────────────

  // Jira "Save" behavior: update JQL in-place, no dialog.
  // Also persist filter_config as the current chip state so the next
  // load can restore chips without re-parsing JQL.
  const handleSaveClick = () => {
    if (savedFilterId) {
      updateFilter.mutate(
        {
          id: savedFilterId,
          updates: { jql_query: jql.trim() || null, filter_config: canonicalFilter },
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
            : isRelease
              ? '/release-hub/filters'
              : `/${isProduct ? 'product-hub' : 'project-hub'}/${projectKey}/filters`
      );
    },
    [linkedEntities, addFlag, navigate, projectKey, isIncident, isTasks, isRelease, isProduct]
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
        <ProjectPageHeader
          projectKey={projectKey ?? ''}
          hubType={isProduct ? 'product' : isIncident ? 'incident' : isRelease ? 'release' : 'project'}
          trail={[
            {
              text: 'Filters',
              href: isProduct && projectKey ? `/product-hub/${projectKey}/filters` : isIncident ? '/incident-hub/filters' : isTasks ? '/tasks/filters' : isRelease ? '/release-hub/filters' : `/project-hub/${projectKey}/filters`,
            },
            ...(savedFilterName ? [] : [{ text: 'Create filter' }]),
          ]}
          {...(savedFilterName
            ? { title: savedFilterName }
            : { hideTitle: true }
          )}
        />
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
          borderBottom: `1px solid ${token('color.border')}`,
        }}
      >
        {/* ── Single row: Ask Caty · Basic/JQL toggle · search/JQL editor · CanonicalFilter · spacer · count · kebab · Save as · Save filter ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', flexWrap: 'nowrap', overflow: 'visible' }}>
          <AIIntelligenceButton
            label="Ask Caty"
            onClick={() => setAskCatyOpen(true)}
            tooltip="Ask Caty about these results"
          />

          {/* Basic / JQL toggle */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, gap: 0 }}>
            <Button
              appearance={filterMode === 'basic' ? 'primary' : 'default'}
              onClick={switchToBasic}
            >
              Basic
            </Button>
            <Button
              appearance={filterMode === 'jql' ? 'primary' : 'default'}
              onClick={switchToJql}
            >
              JQL
            </Button>
          </div>

          {filterMode === 'jql' ? (
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
              {/* Search work */}
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
                    <span style={{ paddingInlineStart: 8, color: 'var(--ds-text-subtlest)', display: 'flex', alignItems: 'center' }}>
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

              {/* CanonicalFilter — replaces FilterChip×3 + FilterTriggerAndPopup (More filters) */}
              <CanonicalFilter
                value={canonicalFilter}
                onChange={next => { setCanonicalFilter(next); setSavedFilterJql(null); markDirty(); }}
                filterContext={isProduct ? 'product' : isIncident ? 'incident' : isTasks ? 'tasks' : 'project'}
                scopeType={isProduct ? 'product' : isIncident ? 'incident' : isTasks ? 'tasks' : 'project'}
                scopeKey={projectKey ?? undefined}
                assigneeOptions={canonicalAssigneeOptions}
              />

              {hasActiveFilters && (
                <Button
                  appearance="subtle"
                  onClick={() => { setCanonicalFilter(emptyCanonicalFilterValue); setSavedFilterJql(null); markDirty(); }}
                >
                  Clear filters
                </Button>
              )}
            </>
          )}

          <div style={{ flex: 1 }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 8px', color: token('color.text.subtlest', 'var(--ds-icon-subtle)'), fontSize: 'var(--ds-font-size-200)', fontWeight: 500, whiteSpace: 'nowrap' }}>
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
            columnVisibility={FILTER_PREVIEW_COLS}
            contextMenuActions={[]}
            selectable
            selection={selectedIds}
            onSelectionChange={setSelectedIds}
            emptyView={
              <div style={{ padding: '32px 24px', textAlign: 'center', color: token('color.text.subtle'), fontSize: 'var(--ds-font-size-400)' }}>
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
          initialName={filterName || 'Untitled filter'}
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
                icon={<AkInfoIcon label="Saved" color={token('color.icon.success', 'var(--ds-background-success-bold)')} />}
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
                icon={<AkInfoIcon label="Info" color={token('color.icon.information', 'var(--ds-link)')} />}
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
