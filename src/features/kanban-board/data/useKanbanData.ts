/**
 * useKanbanData — data layer for the kanban board (project + product modes).
 *
 * Mode switch (2026-06-15) lets the same KanbanPage power both:
 *   - mode='project' (default) → ph_issues / ph_projects / boards / board_columns
 *   - mode='product'           → business_requests / products + Business Request
 *                                workflow statuses for columns
 *
 * Per CLAUDE.md "ADOPT CANONICAL COMPONENTS" rule, the product branch is
 * a data adapter — it queries different tables and maps rows to BoardIssue
 * shape so the rest of the board (UI, mutations, drag, ⋯ menu) is identical.
 *
 * Shares ONLY the Supabase data source with the rest of Catalyst.
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTypeWorkflow } from '@/hooks/useTypeWorkflow';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { translate } from '@/lib/jql/translator';
import { applyJqlToQuery } from '@/lib/jql';
import type { BoardConfig, BoardIssue, BoardOption, KanbanColumn, StatusCategory } from '../types';
import { DEFAULT_COLUMNS, indexColumns } from './columnConfig';

export type KanbanMode = 'project' | 'product' | 'incident' | 'tasks' | 'release' | 'test';

/* 2026-06-21: TestHub board columns — 4-stage case lifecycle. Mirrors the
   CASE_STATUSES in releasesDataSource/testCasesDataSource so table, board,
   and dashboard agree. */
export const TEST_BOARD_COLUMNS: KanbanColumn[] = [
  { id: 'col-draft',      name: 'DRAFT',      category: 'todo',        statuses: ['DRAFT'],      max: null },
  { id: 'col-review',     name: 'IN REVIEW',  category: 'in_progress', statuses: ['REVIEW'],     max: null },
  { id: 'col-approved',   name: 'APPROVED',   category: 'done',        statuses: ['APPROVED'],   max: null },
  { id: 'col-deprecated', name: 'DEPRECATED', category: 'done',        statuses: ['DEPRECATED'], max: null },
];

const TEST_CASE_SELECT = 'id, key, title, status, project_id, folder_id, priority_id, type_id, assigned_to, is_flagged, cover, created_at, updated_at';

/* 2026-06-19: release-mode columns mirror the 9-stage release lifecycle the
   legacy releaseBoardAdapter used. Defined here (not imported from the legacy
   adapter) so the canonical board is self-contained — when the legacy
   KanbanBoardShell + adapter wiring retires, this is the source of truth. */
export const RELEASE_BOARD_COLUMNS: KanbanColumn[] = [
  { id: 'col-draft',          name: 'DRAFT',              category: 'todo',        statuses: ['draft', 'todo'],                   max: null },
  { id: 'col-planned',        name: 'PLANNED',            category: 'todo',        statuses: ['planned', 'planning'],             max: null },
  { id: 'col-readiness',      name: 'IN READINESS',       category: 'todo',        statuses: ['in_readiness'],                    max: null },
  { id: 'col-ready-signoff',  name: 'READY FOR SIGN-OFF', category: 'in_progress', statuses: ['ready_for_signoff'],               max: null },
  { id: 'col-approved',       name: 'APPROVED',           category: 'in_progress', statuses: ['approved'],                        max: null },
  { id: 'col-scheduled',      name: 'SCHEDULED',          category: 'in_progress', statuses: ['scheduled'],                       max: null },
  { id: 'col-deploying',      name: 'DEPLOYING',          category: 'in_progress', statuses: ['deploying', 'in_progress'],        max: null },
  { id: 'col-monitoring',     name: 'MONITORING',         category: 'in_progress', statuses: ['monitoring'],                      max: null },
  { id: 'col-completed',      name: 'COMPLETED',          category: 'done',        statuses: ['completed', 'released', 'done'],   max: null },
];

const RELEASE_SELECT =
  'id, name, version, status, health, release_type, target_env, target_date, planned_release_date, readiness_pct, source, jira_key, is_flagged, cover, updated_at, created_at, product_id, release_manager_id';

/* 2026-06-17: tasks mode SELECT lists.
   - Tasks live in `tasks` with FK to task_statuses (slug + name + order).
   - Assignee resolved via profiles (we use full_name for the avatar).
   - No project_key — tasks board is global across workstreams. */
/* SELECT * matches what useTaskItems uses (and works) — the `tasks` table
   column set varies across environments, so explicit lists are fragile. */
const TASKS_SELECT = '*';

const PAGE = 1000;
const ISSUE_SELECT = 'id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, epic_color, epic_status, epic_status_category, sprint_release, is_flagged, cover, jira_updated_at, jira_created_at, due_date';

/* SELECT list for product mode. Mirrors the OLD KanbanBoardPage product
   branch and adds the columns landed by 20260615120000_product_board_parity:
     is_flagged, parent_request_id, tags. */
const BR_SELECT = 'id, request_key, title, process_step, urgency, project_manager_user_id, is_flagged, cover, parent_request_id, tags, created_at, updated_at';

/** Fetch one page of project issues (raw rows). When the board was created from a
 *  saved filter, `jql` carries that filter's query so the board only shows matching
 *  work items (CAT-DEF-003) instead of every project issue. */
async function fetchIssuePage(key: string, from: number, to: number, jql?: string | null): Promise<any[]> {
  let q = supabase
    .from('ph_issues')
    .select(ISSUE_SELECT)
    .eq('project_key', key)
    .is('deleted_at', null)
    .is('jira_removed_at', null)
    .is('archived_at', null)
    .in('issue_type', ['Epic', 'Story', 'Feature', 'Improvement', 'New Feature']);
  if (jql) {
    // Defensive: a malformed/unsupported saved filter must never break the board —
    // fall back to the project-scoped view if the JQL can't be translated.
    try {
      q = applyJqlToQuery(q, translate(jql)) as typeof q;
    } catch (e) {
      console.warn('[kanban] could not apply board filter JQL:', e);
    }
  }
  const { data, error } = await q
    .order('board_position', { ascending: true, nullsFirst: false })
    .order('jira_updated_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return data ?? [];
}

function mapRow(r: any): BoardIssue {
  let fv: string | null = null;
  if (Array.isArray(r.sprint_release) && r.sprint_release.length > 0) {
    const f = r.sprint_release[0];
    fv = typeof f === 'string' ? f : (f?.name ?? null);
  }
  return {
    id: r.id,
    issueKey: r.issue_key,
    summary: r.summary ?? '',
    issueType: r.issue_type ?? '',
    priority: r.priority ?? '',
    status: r.status ?? '',
    statusCategory: r.status_category ?? '',
    assigneeName: r.assignee_display_name ?? null,
    labels: Array.isArray(r.labels) ? (r.labels as string[]) : [],
    sprintName: r.sprint_name ?? null,
    storyPoints: r.story_points != null ? Number(r.story_points) : null,
    parentKey: r.parent_key ?? null,
    parentSummary: r.parent_summary ?? null,
    parentColor: r.epic_color ?? null,
    parentStatus: r.epic_status ?? null,
    parentStatusCategory: r.epic_status_category ?? null,
    sprintRelease: fv,
    isFlagged: !!r.is_flagged,
    cover: r.cover ?? null,
    updatedAt: r.jira_updated_at ?? null,
    createdAt: r.jira_created_at ?? null,
    statusChangedAt: null, // ph_issues has no status_changed_at column
    dueDate: r.due_date ?? null,
  };
}

/* business_requests row → BoardIssue.
   issueType is fixed to 'Business Request' (only type on a product board).
   labels comes from `tags` (the canonical product-side label column).
   assigneeName is resolved via a name-map lookup below (project_manager_user_id → profiles.full_name).
   parentKey resolves to the parent's request_key via a map (parent_request_id → request_key). */
function mapProductRow(
  r: any,
  assigneeNames: Map<string, string>,
  parentKeyById: Map<string, { key: string | null; summary: string | null }>,
): BoardIssue {
  const parent = r.parent_request_id ? parentKeyById.get(r.parent_request_id) : null;
  return {
    id: r.id,
    issueKey: r.request_key ?? r.id,
    summary: r.title ?? '',
    issueType: 'Business Request',
    priority: r.urgency ?? '',
    status: r.process_step ?? '',
    statusCategory: '',
    assigneeName: r.project_manager_user_id ? (assigneeNames.get(r.project_manager_user_id) ?? null) : null,
    labels: Array.isArray(r.tags) ? r.tags : [],
    sprintName: null,
    storyPoints: null,
    parentKey: parent?.key ?? null,
    parentSummary: parent?.summary ?? null,
    sprintRelease: null,
    isFlagged: !!r.is_flagged,
    cover: r.cover ?? null,
    updatedAt: r.updated_at ?? null,
    createdAt: r.created_at ?? null,
    statusChangedAt: null,
    dueDate: null,
  };
}

export interface KanbanData {
  projectId: string | null;
  projectName: string;
  boardConfig: BoardConfig;
  boards: BoardOption[];
  issues: BoardIssue[];
  isLoading: boolean;
  refetch: () => void;
}

export function useKanbanData(
  projectKey: string | undefined,
  activeBoardId: string | null,
  mode: KanbanMode = 'project',
): KanbanData {
  const key = projectKey?.toUpperCase();
  const isProduct = mode === 'product';
  const isIncident = mode === 'incident';
  const isTasks = mode === 'tasks';
  const isRelease = mode === 'release';
  const isTest = mode === 'test';

  /* ── Approved profiles — single source of truth for all assignee lookups ── */
  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const approvedProfileMap = useMemo(
    () => new Map(approvedProfiles.map(p => [p.id, p])),
    [approvedProfiles],
  );

  /* ── PROJECT meta ─────────────────────────────────────────────────────── */
  const { data: projMeta } = useQuery({
    queryKey: ['kb-project-meta', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase
        .from('ph_projects').select('id, key, name').eq('key', key).maybeSingle();
      return data ?? null;
    },
    enabled: !!key && !isProduct && !isIncident && !isTasks && !isRelease && !isTest,
    staleTime: 60_000,
  });

  /* ── PRODUCT meta ─────────────────────────────────────────────────────── */
  const { data: productMeta } = useQuery({
    queryKey: ['kb-product-meta', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await (supabase as any)
        .from('products').select('id, name, code')
        .eq('code', key).eq('is_active', true).maybeSingle();
      return (data as { id: string; name: string; code: string } | null) ?? null;
    },
    enabled: !!key && isProduct,
    staleTime: 60_000,
  });
  const productId = productMeta?.id ?? null;

  /* ── BOARDS list (project mode only) ──────────────────────────────────── */
  const { data: boards = [] } = useQuery({
    queryKey: ['kb-boards', key],
    queryFn: async () => {
      if (!key) return [] as BoardOption[];
      const { data } = await supabase
        .from('boards')
        .select('id, name, sort_order, ph_projects!inner(key)')
        .eq('ph_projects.key', key)
        .is('deleted_at', null)
        .order('sort_order');
      return (data ?? []).map((b: any) => ({ id: b.id, name: b.name })) as BoardOption[];
    },
    enabled: !!key && !isProduct && !isIncident && !isTasks && !isRelease && !isTest,
    staleTime: 60_000,
  });

  const resolvedBoardId = (isProduct || isIncident || isTasks || isRelease || isTest) ? null : (activeBoardId ?? boards[0]?.id ?? null);

  /* ── Board filter JQL (CAT-DEF-003) ────────────────────────────────────────
     Boards created from a saved filter carry boards.board_query (the filter's
     JQL). The project-issue fetch applies it so the board shows only matching
     work items. Null for plain project boards (→ full project scope). */
  const { data: resolvedBoardQuery = null } = useQuery({
    queryKey: ['kb-board-query', resolvedBoardId],
    queryFn: async () => {
      if (!resolvedBoardId) return null;
      const { data } = await supabase
        .from('boards')
        .select('board_query')
        .eq('id', resolvedBoardId)
        .maybeSingle();
      return ((data as any)?.board_query ?? null) as string | null;
    },
    enabled: !!resolvedBoardId && !isProduct && !isIncident && !isTasks,
    staleTime: 60_000,
  });

  /* ── TASKS columns (mode='tasks'): task_statuses table ─────────────────── */
  const { data: tasksStatusRows = [] } = useQuery({
    queryKey: ['kb-tasks-statuses'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('task_statuses')
        .select('id, name, slug, color, position')
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; slug: string; color: string | null; position: number }>;
    },
    enabled: isTasks,
    staleTime: 5 * 60_000,
  });

  /* ── TASKS rows (mode='tasks'): tasks table cross-workstream ──────────── */
  const { data: tasksRows = [], isLoading: tasksLoading, refetch: refetchTasks, error: tasksError } = useQuery({
    queryKey: ['kb-tasks-rows'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .select(TASKS_SELECT)
        .is('deleted_at', null)
        .order('board_position', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isTasks,
    staleTime: 30_000,
  });

  /* ── RELEASE rows (mode='release'): rh_releases cross-product ──────────
     Mirrors the data adapter for /release-hub/release-kanban so the canonical
     board mounts releases without going through useReleasesList (which is
     wired to JiraTable on the legacy surface). Manager resolved via profiles. */
  const { data: releaseRows = [], isLoading: releaseLoading, refetch: refetchReleases, error: releaseError } = useQuery({
    queryKey: ['kb-release-rows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rh_releases')
        .select(RELEASE_SELECT)
        .neq('status', 'cancelled')
        .order('board_position', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isRelease,
    staleTime: 30_000,
  });

  /* Manager profiles for releases — release_manager_id → full_name. */
  const releaseManagerIds = useMemo(
    () => Array.from(new Set((releaseRows as any[]).map((r) => r.release_manager_id).filter(Boolean))),
    [releaseRows],
  );
  const releaseManagerNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of releaseManagerIds as string[]) {
      const p = approvedProfileMap.get(id);
      if (p) m.set(id, p.name);
    }
    return m;
  }, [releaseManagerIds, approvedProfileMap]);

  /* ── TEST rows (mode='test'): tm_test_cases scoped to first TM project ── */
  const { data: testProjectsRow = [] } = useQuery({
    queryKey: ['kb-test-projects'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tm_projects')
        .select('id, key, name, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isTest,
    staleTime: 5 * 60_000,
  });
  const testProjectId = (testProjectsRow as any[])[0]?.id ?? null;

  const { data: testRows = [], isLoading: testLoading, refetch: refetchTest, error: testError } = useQuery({
    queryKey: ['kb-test-rows', testProjectId],
    queryFn: async () => {
      if (!testProjectId) return [] as any[];
      const { data, error } = await (supabase as any)
        .from('tm_test_cases')
        .select(TEST_CASE_SELECT)
        .eq('project_id', testProjectId)
        .order('board_position', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isTest && !!testProjectId,
    staleTime: 30_000,
  });

  const testAssigneeIds = useMemo(
    () => Array.from(new Set((testRows as any[]).map((r) => r.assigned_to).filter(Boolean))),
    [testRows],
  );
  const testAssigneeNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of testAssigneeIds as string[]) {
      const p = approvedProfileMap.get(id);
      if (p) m.set(id, p.name);
    }
    return m;
  }, [testAssigneeIds, approvedProfileMap]);

  function mapTestRow(r: any): BoardIssue {
    const status = (r.status ?? 'DRAFT').toString();
    const statusCategory: string =
      status === 'APPROVED' || status === 'DEPRECATED' ? 'done'
      : status === 'REVIEW' ? 'in_progress'
      : 'todo';
    return {
      id: r.id,
      issueKey: r.key || r.id,
      summary: r.title ?? '',
      issueType: 'Test Case',
      priority: '',
      status,
      statusCategory,
      assigneeName: r.assigned_to ? (testAssigneeNames.get(r.assigned_to) ?? null) : null,
      labels: [],
      sprintName: null,
      storyPoints: null,
      parentKey: null,
      parentSummary: null,
      sprintRelease: null,
      isFlagged: !!r.is_flagged,
        cover: r.cover ?? null,
    cover: r.cover ?? null,
      updatedAt: r.updated_at ?? null,
      createdAt: r.created_at ?? null,
      statusChangedAt: null,
      dueDate: null,
    };
  }

  function mapReleaseRow(r: any): BoardIssue {
    const status = (r.status ?? '').toString();
    const catLc = status.toLowerCase();
    const statusCategory: string =
      ['completed', 'released', 'done'].includes(catLc) ? 'done'
      : ['draft', 'todo', 'planned', 'planning', 'in_readiness'].includes(catLc) ? 'todo'
      : 'in_progress';
    return {
      id: r.id,
      issueKey: r.jira_key || r.version || r.id,
      summary: r.name ?? '',
      issueType: 'Release',
      priority: '',
      status,
      statusCategory,
      assigneeName: r.release_manager_id ? (releaseManagerNames.get(r.release_manager_id) ?? null) : null,
      labels: [],
      sprintName: null,
      storyPoints: null,
      parentKey: null,
      parentSummary: null,
      sprintRelease: r.version ?? null,
      // Prefer the explicit is_flagged column now that rh_releases has one;
      // fall back to at_risk health as legacy signal for older data.
      isFlagged: !!r.is_flagged || r.health === 'at_risk',
        cover: r.cover ?? null,
    cover: r.cover ?? null,
      updatedAt: r.updated_at ?? null,
      createdAt: r.created_at ?? null,
      statusChangedAt: null,
      dueDate: r.planned_release_date ?? r.target_date ?? null,
    };
  }

  /* ── COLUMNS source 1 (project): board_columns + board_status_mappings ── */
  const { data: dynamicCols } = useQuery({
    queryKey: ['kb-board-columns', resolvedBoardId],
    queryFn: async () => {
      if (!resolvedBoardId) return null;
      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, name, position, status_ids, is_backlog, is_done')
        .eq('board_id', resolvedBoardId)
        .order('position');
      const { data: mappings } = await supabase
        .from('board_status_mappings')
        .select('status_id, status_name, bucket_type, column_id, order_index')
        .eq('board_id', resolvedBoardId)
        .order('order_index');
      if (!cols?.length) return null;
      return { cols, mappings: mappings ?? [] };
    },
    enabled: !!resolvedBoardId && !isProduct && !isIncident && !isTasks,
    staleTime: 60_000,
  });

  /* ── COLUMNS source 2 (product): Business Request workflow statuses ──
     The OLD board hardcodes 'BAU' as the project to read the canonical
     Business Request workflow from. We mirror that here — there is no
     per-product workflow yet, so all product boards share the BR workflow
     defined under the BAU project. */
  const brWorkflow = useTypeWorkflow('BAU', 'Business Request');

  /* ── COLUMNS source 3 (incident): Production Incident workflow statuses ──
     Mirrors brWorkflow exactly. PI workflow is also rooted at the BAU
     project — incidents are surfaced cross-project on Catalyst but the
     status taxonomy is owned by BAU. */
  const piWorkflow = useTypeWorkflow('BAU', 'Production Incident');

  const columns: KanbanColumn[] = useMemo(() => {
    /* 2026-06-19: release columns are a fixed 9-stage lifecycle (no DB
       configuration yet — matches the legacy releaseBoardAdapter). */
    if (isRelease) return RELEASE_BOARD_COLUMNS;
    if (isTest) return TEST_BOARD_COLUMNS;
    /* 2026-06-17: tasks columns come from task_statuses. Each column carries
       both the slug and the name as recognized statuses so the resolver
       matches either form on the task row. Category derived from slug
       (task_statuses has no is_done/is_initial columns). */
    if (isTasks) {
      if (!tasksStatusRows.length) return DEFAULT_COLUMNS;
      return tasksStatusRows.map((s): KanbanColumn => {
        const slug = (s.slug ?? '').toLowerCase();
        const category: StatusCategory = /done|complete|closed|finished/.test(slug)
          ? 'done'
          : /backlog|todo|planned|new|open/.test(slug)
            ? 'todo'
            : 'in_progress';
        return {
          id: s.id,
          name: (s.name ?? '').toUpperCase(),
          statuses: [s.name, s.slug].filter(Boolean) as string[],
          category,
          max: null,
        };
      });
    }
    if (isProduct || isIncident) {
      const wf = isIncident ? piWorkflow : brWorkflow;
      const statuses = (wf?.data as any)?.statuses ?? [];
      if (statuses.length === 0) return DEFAULT_COLUMNS;
      return statuses.map((s: any, i: number): KanbanColumn => ({
        id: s.id ?? String(i),
        name: (s.name ?? s.status ?? '').toUpperCase(),
        statuses: [s.name ?? s.status ?? ''],
        category: (s.category === 'done' ? 'done' : s.category === 'todo' ? 'todo' : 'in_progress') as StatusCategory,
        max: null,
      }));
    }
    if (dynamicCols?.cols?.length) {
      return dynamicCols.cols.map((c: any): KanbanColumn => {
        let statuses: string[] = dynamicCols.mappings
          .filter((m: any) => m.bucket_type === 'column' && m.column_id === c.id)
          .map((m: any) => m.status_name);
        if (statuses.length === 0 && Array.isArray(c.status_ids) && c.status_ids.length) {
          statuses = dynamicCols.mappings
            .filter((m: any) => c.status_ids.includes(m.status_id))
            .map((m: any) => m.status_name);
        }
        const category: StatusCategory = c.is_done ? 'done' : c.is_backlog ? 'todo' : 'in_progress';
        return { id: c.id, name: c.name, statuses, category, max: null };
      });
    }
    return DEFAULT_COLUMNS;
  }, [isProduct, isIncident, isTasks, isRelease, isTest, brWorkflow, piWorkflow, dynamicCols, tasksStatusRows]);

  const boardConfig: BoardConfig = useMemo(() => {
    const idx = indexColumns(columns);
    return {
      boardId: resolvedBoardId,
      boardName: isProduct
        ? (productMeta?.name ?? 'Product board')
        : isIncident
          ? 'Incident board'
          : isTasks
            ? 'Tasks board'
            : isRelease
              ? 'Release board'
              : isTest
                ? 'Test board'
                : (boards.find((b) => b.id === resolvedBoardId)?.name ?? 'Board'),
      columns: idx.columns,
      statusToColId: idx.statusToColId,
      colPrimaryStatus: idx.colPrimaryStatus,
      columnIdSet: idx.columnIdSet,
    };
  }, [columns, resolvedBoardId, boards, isProduct, isIncident, isTasks, isRelease, isTest, productMeta]);

  /* ── PROJECT issues (paginated, progressive) ─────────────────────────── */
  const { data: firstPage = [], isLoading: projectLoading, refetch: refetchFirst, error: projectFirstError } = useQuery({
    queryKey: ['kb-issues-p1', key, resolvedBoardQuery],
    queryFn: () => (key ? fetchIssuePage(key, 0, PAGE - 1, resolvedBoardQuery) : Promise.resolve([] as any[])),
    enabled: !!key && !isProduct && !isIncident && !isTasks && !isRelease && !isTest,
    staleTime: 5 * 60_000,
  });
  const hasMore = firstPage.length >= PAGE;
  const { data: restPages = [], refetch: refetchRest, error: projectRestError } = useQuery({
    queryKey: ['kb-issues-rest', key, resolvedBoardQuery],
    queryFn: async () => {
      if (!key) return [] as any[];
      let all: any[] = [];
      let from = PAGE;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const data = await fetchIssuePage(key, from, from + PAGE - 1, resolvedBoardQuery);
        if (!data.length) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
    enabled: !!key && !isProduct && !isIncident && !isTasks && !isRelease && !isTest && hasMore,
    staleTime: 5 * 60_000,
  });

  /* ── INCIDENT issues (ph_issues filtered by issue_type='Production Incident').
     Mirrors the productRows pattern. Incident rows are ph_issues, so
     useKanbanMutations does NOT need an incident branch — its existing
     project (ph_issues) writes apply unchanged. */
  const { data: incidentRows = [], isLoading: incidentLoading, refetch: refetchIncidents, error: incidentError } = useQuery({
    queryKey: ['kb-incident-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select(ISSUE_SELECT)
        .eq('issue_type', 'Production Incident')
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('board_position', { ascending: true, nullsFirst: false })
        .order('jira_updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isIncident,
    staleTime: 5 * 60_000,
  });

  /* ── PRODUCT issues (business_requests filtered by product_id) ──────── */
  const { data: productRows = [], isLoading: productLoading, refetch: refetchProduct, error: productError } = useQuery({
    queryKey: ['kb-product-issues', productId],
    queryFn: async () => {
      if (!productId) return [] as any[];
      const { data, error } = await (supabase as any)
        .from('business_requests')
        .select(BR_SELECT)
        .eq('product_id', productId)
        .is('deleted_at', null)
        .order('board_position', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!productId && isProduct,
    staleTime: 30_000,
  });

  /* ── Assignee name map for product mode (project_manager_user_id → name). */
  const assigneeNames = useMemo(() => {
    const ids = Array.from(new Set((productRows as any[]).map((r) => r.project_manager_user_id).filter(Boolean)));
    const m = new Map<string, string>();
    for (const id of ids as string[]) {
      const p = approvedProfileMap.get(id);
      if (p) m.set(id, p.name);
    }
    return m;
  }, [productRows, approvedProfileMap]);

  /* ── Parent key+summary map for product mode (parent_request_id → request_key). */
  const { data: parentKeyById = new Map<string, { key: string | null; summary: string | null }>() } = useQuery({
    queryKey: ['kb-product-parents', productId, productRows.length],
    queryFn: async () => {
      const ids = Array.from(new Set(productRows.map((r: any) => r.parent_request_id).filter(Boolean)));
      if (!ids.length) return new Map<string, { key: string | null; summary: string | null }>();
      const { data } = await (supabase as any)
        .from('business_requests')
        .select('id, request_key, title')
        .in('id', ids as string[]);
      const m = new Map<string, { key: string | null; summary: string | null }>();
      ((data ?? []) as Array<{ id: string; request_key: string | null; title: string | null }>).forEach((p) => {
        m.set(p.id, { key: p.request_key, summary: p.title });
      });
      return m;
    },
    enabled: isProduct && productRows.length > 0,
    staleTime: 60_000,
  });

  /* ── TASKS row → BoardIssue mapper ─────────────────────────────────────
     Tasks have a separate shape. We synthesize a status name from the
     joined task_statuses row so columns can match it. */
  const statusNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of tasksStatusRows) m.set(s.id, s.name);
    return m;
  }, [tasksStatusRows]);

  /* 2026-06-17: separate assignee_id → full_name lookup. Avoids the embed
     join syntax which silently failed when the FK constraint name didn't
     match — that nuked the whole `tasks` query and the board went empty. */
  const taskAssigneeIds = useMemo(
    () => Array.from(new Set((tasksRows as any[]).map((t) => t.assignee_id).filter(Boolean))),
    [tasksRows],
  );
  const taskAssigneeNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of taskAssigneeIds as string[]) {
      const p = approvedProfileMap.get(id);
      if (p) m.set(id, p.name);
    }
    return m;
  }, [taskAssigneeIds, approvedProfileMap]);

  function mapTaskRow(r: any): BoardIssue {
    const statusName = statusNameById.get(r.status_id) ?? '';
    return {
      id: r.id,
      issueKey: r.task_key ?? r.key ?? r.id,
      summary: r.title ?? '',
      issueType: 'Task',
      priority: r.priority ?? '',
      status: statusName,
      statusCategory: '',
      assigneeName: r.assignee_id ? (taskAssigneeNames.get(r.assignee_id) ?? null) : null,
      labels: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      sprintName: null,
      storyPoints: null,
      parentKey: null,
      parentSummary: null,
      sprintRelease: null,
      isFlagged: !!r.is_flagged,
        cover: r.cover ?? null,
    cover: r.cover ?? null,
      updatedAt: r.updated_at ?? null,
      createdAt: r.created_at ?? null,
      statusChangedAt: null,
      dueDate: r.due_date ?? null,
    };
  }

  /* ── Mapped issues ──────────────────────────────────────────────────── */
  const issues = useMemo(() => {
    if (isProduct) {
      return productRows.map((r: any) => mapProductRow(r, assigneeNames, parentKeyById));
    }
    if (isIncident) {
      return (incidentRows as any[]).map(mapRow);
    }
    if (isTasks) {
      return (tasksRows as any[]).map(mapTaskRow);
    }
    if (isRelease) {
      return (releaseRows as any[]).map(mapReleaseRow);
    }
    if (isTest) {
      return (testRows as any[]).map(mapTestRow);
    }
    return [...firstPage, ...restPages].map(mapRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProduct, isIncident, isTasks, isRelease, isTest, productRows, assigneeNames, parentKeyById, incidentRows, tasksRows, statusNameById, taskAssigneeNames, releaseRows, releaseManagerNames, testRows, testAssigneeNames, firstPage, restPages]);

  const refetch = useCallback(() => {
    if (isProduct) {
      refetchProduct();
    } else if (isIncident) {
      refetchIncidents();
    } else if (isTasks) {
      refetchTasks();
    } else if (isRelease) {
      refetchReleases();
    } else if (isTest) {
      refetchTest();
    } else {
      refetchFirst();
      refetchRest();
    }
  }, [isProduct, isIncident, isTasks, isRelease, isTest, refetchProduct, refetchIncidents, refetchTasks, refetchReleases, refetchTest, refetchFirst, refetchRest]);

  return {
    projectId: isProduct ? productId : isTest ? testProjectId : (projMeta?.id ?? null),
    projectName: isProduct
      ? (productMeta?.name ?? key ?? '')
      : isIncident
        ? 'Incidents'
        : isTasks
          ? 'Tasks'
          : isRelease
            ? 'Releases'
            : isTest
              ? 'Test Cases'
              : (projMeta?.name ?? key ?? ''),
    boardConfig,
    boards: (isProduct || isIncident || isTasks || isRelease || isTest) ? [] : boards,
    issues,
    isLoading: isProduct
      ? productLoading
      : isIncident
        ? incidentLoading
        : isTasks
          ? tasksLoading
          : isRelease
            ? releaseLoading
            : isTest
              ? testLoading
              : projectLoading,
    /* Primary issues-query failure for the active mode. Surfaced so the page
       can render a real error state instead of an empty board — a failed
       query with `?? []` defaults is otherwise indistinguishable from a
       board with no issues. */
    error: (isProduct
      ? productError
      : isIncident
        ? incidentError
        : isTasks
          ? tasksError
          : isRelease
            ? releaseError
            : isTest
              ? testError
              : (projectFirstError ?? projectRestError)) ?? null,
    refetch,
  };
}
