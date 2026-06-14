/**
 * useKanbanData — fresh data layer for the Kanban board.
 *
 * Shares ONLY the Supabase data source with the rest of Catalyst:
 *   ph_issues, ph_projects, boards, board_columns, board_status_mappings.
 * No Catalyst hooks/components are imported.
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BoardConfig, BoardIssue, BoardOption, KanbanColumn, StatusCategory } from '../types';
import { DEFAULT_COLUMNS, indexColumns } from './columnConfig';

const PAGE = 1000;
const ISSUE_SELECT = 'id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, sprint_release, is_flagged, jira_updated_at, jira_created_at, due_date';

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

export interface KanbanData {
  projectId: string | null;
  projectName: string;
  boardConfig: BoardConfig;
  boards: BoardOption[];
  issues: BoardIssue[];
  isLoading: boolean;
  refetch: () => void;
}

export function useKanbanData(projectKey: string | undefined, activeBoardId: string | null): KanbanData {
  const key = projectKey?.toUpperCase();

  const { data: projMeta } = useQuery({
    queryKey: ['kb-project-meta', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase
        .from('ph_projects').select('id, key, name').eq('key', key).maybeSingle();
      return data ?? null;
    },
    enabled: !!key,
    staleTime: 60_000,
  });

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
    enabled: !!key,
    staleTime: 60_000,
  });

  const resolvedBoardId = activeBoardId ?? boards[0]?.id ?? null;

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
    enabled: !!resolvedBoardId,
    staleTime: 60_000,
  });

  const columns: KanbanColumn[] = useMemo(() => {
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
  }, [dynamicCols]);

  const boardConfig: BoardConfig = useMemo(() => {
    const idx = indexColumns(columns);
    return {
      boardId: resolvedBoardId,
      boardName: boards.find((b) => b.id === resolvedBoardId)?.name ?? 'Board',
      columns: idx.columns,
      statusToColId: idx.statusToColId,
      colPrimaryStatus: idx.colPrimaryStatus,
      columnIdSet: idx.columnIdSet,
    };
  }, [columns, resolvedBoardId, boards]);

  // Progressive load: first page gates isLoading so the board paints fast;
  // remaining pages stream in the background and append (no data loss).
  const { data: firstPage = [], isLoading, refetch: refetchFirst } = useQuery({
    queryKey: ['kb-issues-p1', key],
    queryFn: () => (key ? fetchIssuePage(key, 0, PAGE - 1) : Promise.resolve([] as any[])),
    enabled: !!key,
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
    enabled: !!key && hasMore,
    staleTime: 5 * 60_000,
  });

  const issues = useMemo(
    () => [...firstPage, ...restPages].map(mapRow),
    [firstPage, restPages],
  );

  const refetch = useCallback(() => { refetchFirst(); refetchRest(); }, [refetchFirst, refetchRest]);

  return {
    projectId: projMeta?.id ?? null,
    projectName: projMeta?.name ?? key ?? '',
    boardConfig,
    boards,
    issues,
    isLoading,
    refetch,
  };
}
