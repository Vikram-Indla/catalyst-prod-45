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
import type { BoardConfig, BoardIssue, BoardOption, KanbanColumn, StatusCategory } from '../types';
import { DEFAULT_COLUMNS, indexColumns } from './columnConfig';

export type KanbanMode = 'project' | 'product' | 'incident' | 'tasks';

/* 2026-06-17: tasks mode SELECT lists.
   - Tasks live in `tasks` with FK to task_statuses (slug + name + order).
   - Assignee resolved via profiles (we use full_name for the avatar).
   - No project_key — tasks board is global across workstreams. */
/* SELECT * matches what useTaskItems uses (and works) — the `tasks` table
   column set varies across environments, so explicit lists are fragile. */
const TASKS_SELECT = '*';

const PAGE = 1000;
const ISSUE_SELECT = 'id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, sprint_release, is_flagged, jira_updated_at, jira_created_at, due_date';

/* SELECT list for product mode. Mirrors the OLD KanbanBoardPage product
   branch and adds the columns landed by 20260615120000_product_board_parity:
     is_flagged, parent_request_id, tags. */
const BR_SELECT = 'id, request_key, title, process_step, urgency, project_manager_user_id, is_flagged, parent_request_id, tags, created_at, updated_at';

/** Fetch one page of project issues (raw rows). */
async function fetchIssuePage(key: string, from: number, to: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('ph_issues')
    .select(ISSUE_SELECT)
    .eq('project_key', key)
    .is('deleted_at', null)
    .is('archived_at', null)
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
    sprintRelease: fv,
    isFlagged: !!r.is_flagged,
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

  /* ── PROJECT meta ─────────────────────────────────────────────────────── */
  const { data: projMeta } = useQuery({
    queryKey: ['kb-project-meta', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase
        .from('ph_projects').select('id, key, name').eq('key', key).maybeSingle();
      return data ?? null;
    },
    enabled: !!key && !isProduct && !isIncident && !isTasks,
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
    enabled: !!key && !isProduct && !isIncident && !isTasks,
    staleTime: 60_000,
  });

  const resolvedBoardId = (isProduct || isIncident || isTasks) ? null : (activeBoardId ?? boards[0]?.id ?? null);

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
  const { data: tasksRows = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ['kb-tasks-rows'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tasks')
        .select(TASKS_SELECT)
        .is('deleted_at', null)
        .order('position', { ascending: true, nullsFirst: false })
        .order('updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isTasks,
    staleTime: 30_000,
  });

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
  }, [isProduct, isIncident, isTasks, brWorkflow, piWorkflow, dynamicCols, tasksStatusRows]);

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
            : (boards.find((b) => b.id === resolvedBoardId)?.name ?? 'Board'),
      columns: idx.columns,
      statusToColId: idx.statusToColId,
      colPrimaryStatus: idx.colPrimaryStatus,
      columnIdSet: idx.columnIdSet,
    };
  }, [columns, resolvedBoardId, boards, isProduct, isIncident, isTasks, productMeta]);

  /* ── PROJECT issues (paginated, progressive) ─────────────────────────── */
  const { data: firstPage = [], isLoading: projectLoading, refetch: refetchFirst } = useQuery({
    queryKey: ['kb-issues-p1', key],
    queryFn: () => (key ? fetchIssuePage(key, 0, PAGE - 1) : Promise.resolve([] as any[])),
    enabled: !!key && !isProduct && !isIncident && !isTasks,
    staleTime: 5 * 60_000,
  });
  const hasMore = firstPage.length >= PAGE;
  const { data: restPages = [], refetch: refetchRest } = useQuery({
    queryKey: ['kb-issues-rest', key],
    queryFn: async () => {
      if (!key) return [] as any[];
      let all: any[] = [];
      let from = PAGE;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const data = await fetchIssuePage(key, from, from + PAGE - 1);
        if (!data.length) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
    enabled: !!key && !isProduct && !isIncident && !isTasks && hasMore,
    staleTime: 5 * 60_000,
  });

  /* ── INCIDENT issues (ph_issues filtered by issue_type='Production Incident').
     Mirrors the productRows pattern. Incident rows are ph_issues, so
     useKanbanMutations does NOT need an incident branch — its existing
     project (ph_issues) writes apply unchanged. */
  const { data: incidentRows = [], isLoading: incidentLoading, refetch: refetchIncidents } = useQuery({
    queryKey: ['kb-incident-issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select(ISSUE_SELECT)
        .eq('issue_type', 'Production Incident')
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    enabled: isIncident,
    staleTime: 5 * 60_000,
  });

  /* ── PRODUCT issues (business_requests filtered by product_id) ──────── */
  const { data: productRows = [], isLoading: productLoading, refetch: refetchProduct } = useQuery({
    queryKey: ['kb-product-issues', productId],
    queryFn: async () => {
      if (!productId) return [] as any[];
      const { data } = await (supabase as any)
        .from('business_requests')
        .select(BR_SELECT)
        .eq('product_id', productId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      return (data ?? []) as any[];
    },
    enabled: !!productId && isProduct,
    staleTime: 30_000,
  });

  /* ── Assignee name map for product mode (project_manager_user_id → name). */
  const { data: assigneeNames = new Map<string, string>() } = useQuery({
    queryKey: ['kb-product-assignees', productId, productRows.length],
    queryFn: async () => {
      const ids = Array.from(new Set(productRows.map((r: any) => r.project_manager_user_id).filter(Boolean)));
      if (!ids.length) return new Map<string, string>();
      const { data } = await supabase
        .from('profiles').select('id, full_name').in('id', ids as string[]);
      const m = new Map<string, string>();
      ((data ?? []) as Array<{ id: string; full_name: string | null }>).forEach((p) => {
        if (p.full_name) m.set(p.id, p.full_name);
      });
      return m;
    },
    enabled: isProduct && productRows.length > 0,
    staleTime: 60_000,
  });

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
  const { data: taskAssigneeNames = new Map<string, string>() } = useQuery({
    queryKey: ['kb-tasks-assignees', taskAssigneeIds.length, taskAssigneeIds.slice().sort().join(',')],
    queryFn: async () => {
      if (!taskAssigneeIds.length) return new Map<string, string>();
      const { data } = await supabase
        .from('profiles').select('id, full_name').in('id', taskAssigneeIds as string[]);
      const m = new Map<string, string>();
      ((data ?? []) as Array<{ id: string; full_name: string | null }>).forEach((p) => {
        if (p.full_name) m.set(p.id, p.full_name);
      });
      return m;
    },
    enabled: isTasks && taskAssigneeIds.length > 0,
    staleTime: 60_000,
  });

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
      isFlagged: false,
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
    return [...firstPage, ...restPages].map(mapRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProduct, isIncident, isTasks, productRows, assigneeNames, parentKeyById, incidentRows, tasksRows, statusNameById, taskAssigneeNames, firstPage, restPages]);

  const refetch = useCallback(() => {
    if (isProduct) {
      refetchProduct();
    } else if (isIncident) {
      refetchIncidents();
    } else if (isTasks) {
      refetchTasks();
    } else {
      refetchFirst();
      refetchRest();
    }
  }, [isProduct, isIncident, isTasks, refetchProduct, refetchIncidents, refetchTasks, refetchFirst, refetchRest]);

  return {
    projectId: isProduct ? productId : (projMeta?.id ?? null),
    projectName: isProduct
      ? (productMeta?.name ?? key ?? '')
      : isIncident
        ? 'Incidents'
        : isTasks
          ? 'Tasks'
          : (projMeta?.name ?? key ?? ''),
    boardConfig,
    boards: (isProduct || isIncident || isTasks) ? [] : boards,
    issues,
    isLoading: isProduct
      ? productLoading
      : isIncident
        ? incidentLoading
        : isTasks
          ? tasksLoading
          : projectLoading,
    refetch,
  };
}
