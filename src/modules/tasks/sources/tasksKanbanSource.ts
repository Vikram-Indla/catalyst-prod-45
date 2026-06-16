/**
 * tasksKanbanSource — Tasks Hub data adapter for the canonical PragmaticBoard.
 *
 * Phase 2 of the Tasks Hub canonical alignment plan (2026-06-16).
 *
 * Responsibilities (REUSE FIRST — CLAUDE.md P0):
 *   • Adapt the `task_statuses` table → canonical `KanbanColumnDef[]`.
 *   • Adapt `tasks` rows (via `useTaskItems` → `PlannerTask`) → canonical
 *     `BoardIssue[]`.
 *   • Build `colMap` (column id → ordered task ids) keyed on `status_id`.
 *   • Build `avatarsByName` (assignee name → avatar URL) and `allAssignees`
 *     (for KanbanToolbar's avatar stack).
 *   • Expose mutations: status change (cross-column drop), reorder (same-column
 *     drop), and card create. These compose existing tasks hooks — no new
 *     supabase calls are introduced here.
 *
 * Pure transformations are exported so unit tests can pin the contract:
 *   - `mapStatusesToColumns(statuses)`
 *   - `mapPlannerTaskToBoardIssue(task)`
 *   - `buildColMap(boardIssues, statusByName)`
 *
 * Zero-assumption rule (CLAUDE.md 2026-06-11): a task whose `status` slug
 * isn't recognized is silently dropped from the colMap (not mapped to a
 * default column) — the canonical board renders nothing for it, which is
 * the correct truthful UI state ("no column" beats "a wrong column").
 */
import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { BoardIssue } from '@/components/kanban/kanban-types';
import type { KanbanColumnDef } from '@/components/kanban/kanban-tokens';
import { useTaskItems, useUpdatePlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import { useTaskStatuses, type PlannerStatus } from '@/modules/tasks/hooks/useTaskStatuses';
import { useTaskUsers } from '@/modules/tasks/hooks/useTaskUsers';
import { useMoveBoardTask } from '@/modules/tasks/hooks/useTaskBoards';
import type { PlannerTask, PlannerUser, TaskStatus } from '@/modules/tasks/types';
import type { AssigneeOption } from '@/components/kanban/AssigneePickerPopover';

/* ═══════════════════════════════════════════════════════════════════════════
   Pure transformations — exported for unit tests.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Classify a status slug into the canonical kanban category. Used so the
 * column header renders the correct dot color (green check for done, etc.).
 *
 * Zero-assumption: an unknown slug defaults to `'todo'` ONLY because the
 * `KanbanColumnDef` type requires a category — there is no "unknown"
 * category. This is the single allowed fallback in this file; everywhere
 * else (icons, types, parents) we render nothing for unknown.
 */
export function categoryForStatusSlug(slug: string): KanbanColumnDef['category'] {
  const s = slug.toLowerCase();
  if (s === 'done' || s === 'closed' || s === 'complete' || s === 'completed') return 'done';
  if (s === 'in-progress' || s === 'in_progress' || s === 'review' || s === 'doing' || s === 'qa' || s === 'testing') return 'in_progress';
  return 'todo';
}

/**
 * Map `task_statuses` rows → canonical `KanbanColumnDef[]`.
 *
 * Each column carries ONE status (the slug). `id` is the status UUID so the
 * board can drive supabase updates directly with `task.status_id`.
 */
export function mapStatusesToColumns(statuses: PlannerStatus[]): KanbanColumnDef[] {
  return [...statuses]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      name: s.name,
      statuses: [s.slug],
      category: categoryForStatusSlug(s.slug),
    }));
}

/**
 * Map `PlannerTask` → canonical `BoardIssue`.
 *
 * Tasks have no Jira-style fields (issueType, sprint, storyPoints, parent,
 * fixVersion). Those are set to safe neutral values (`''`, `null`, `[]`)
 * so PragmaticBoard's renderers correctly skip them — they never render a
 * lie. The hub-scoped `resolveIcon` callback (passed to PragmaticBoard) is
 * what decides what icon to render for a task; we don't ship a fake type
 * string.
 */
export function mapPlannerTaskToBoardIssue(task: PlannerTask): BoardIssue {
  return {
    id: task.id,
    issueKey: task.key,
    summary: task.title,
    // issueType: empty string → cardColorMode='issueType' renders no stripe
    // (CARD_COLOR_BY_TYPE['' ] === undefined). The toolbar's resolveIcon
    // slot lets the host render a hub-specific icon instead of a stock
    // Jira icon.
    issueType: '',
    priority: task.priority ?? '',
    status: task.status,
    statusCategory: '',
    assigneeName: task.assigneeName ?? null,
    labels: task.tags ?? [],
    sprintName: null,
    storyPoints: null,
    parentKey: null,
    parentSummary: null,
    fixVersion: null,
    isFlagged: false,
    updatedAt: task.updatedAt ?? null,
    createdAt: task.createdAt ?? null,
  };
}

/**
 * Build `colMap` (column id → ordered card ids).
 *
 * Each task's `status` (a TaskStatus slug from PlannerTask) is matched to a
 * column via `statusBySlug` (slug → column id). Tasks with no matching slug
 * are silently omitted (zero-assumption: never fall back to a "default"
 * column).
 */
export function buildColMap(
  issues: BoardIssue[],
  statusBySlug: Map<string, string>,
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const issue of issues) {
    const colId = statusBySlug.get(issue.status.toLowerCase());
    if (!colId) continue;
    if (!map[colId]) map[colId] = [];
    map[colId].push(issue.id);
  }
  return map;
}

/**
 * Build `avatarsByName` — lowercased assignee name → avatar URL.
 * Mirrors how KanbanBoardPage feeds PragmaticBoard.
 */
export function buildAvatarsByName(users: PlannerUser[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const u of users) {
    if (u.avatarUrl && u.name) {
      map.set(u.name.toLowerCase(), u.avatarUrl);
    }
  }
  return map;
}

/**
 * Build `allAssignees` (KanbanToolbar's avatar stack) — name + task count.
 * Only includes assignees who have at least one visible task on the board.
 */
export function buildAllAssignees(issues: BoardIssue[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    if (!issue.assigneeName) continue;
    counts.set(issue.assigneeName, (counts.get(issue.assigneeName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Build the AssigneeOption[] list that PragmaticBoard passes to the
 * assignee picker on each card.
 */
export function buildAssigneeOptions(users: PlannerUser[]): AssigneeOption[] {
  return users.map((u) => ({
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    email: u.email ?? null,
  }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   useTasksKanbanSource — composed hook for TasksBoardView.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TasksKanbanSource {
  columns: KanbanColumnDef[];
  colMap: Record<string, string[]>;
  issuesById: Map<string, BoardIssue>;
  rawIssues: BoardIssue[];
  avatarsByName: Map<string, string>;
  allAssignees: { name: string; count: number }[];
  assigneeOptions: AssigneeOption[];
  users: PlannerUser[];
  statuses: PlannerStatus[];
  isLoading: boolean;
  error: Error | null;
  /** slug → column id (status UUID) — used to remap colMap after filtering. */
  statusBySlug: Map<string, string>;
}

/**
 * `useTasksKanbanSource` — composes useTaskItems + useTaskStatuses +
 * useTaskUsers into the shape PragmaticBoard needs. Returns stable maps and
 * the raw BoardIssue[] so TasksBoardView can apply client-side filters
 * (search / assignee / priority) before recomputing colMap.
 */
export function useTasksKanbanSource(teamId?: string | null): TasksKanbanSource {
  const tasksQuery = useTaskItems(teamId);
  const statusesQuery = useTaskStatuses();
  const usersQuery = useTaskUsers();

  const isLoading = tasksQuery.isLoading || statusesQuery.isLoading || usersQuery.isLoading;
  const error = (tasksQuery.error ?? statusesQuery.error ?? usersQuery.error) as Error | null;

  const statuses = statusesQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const columns = useMemo(() => mapStatusesToColumns(statuses), [statuses]);

  const statusBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of statuses) map.set(s.slug.toLowerCase(), s.id);
    return map;
  }, [statuses]);

  const rawIssues = useMemo(
    () => (tasksQuery.data ?? []).map(mapPlannerTaskToBoardIssue),
    [tasksQuery.data],
  );

  const colMap = useMemo(() => buildColMap(rawIssues, statusBySlug), [rawIssues, statusBySlug]);

  const issuesById = useMemo(() => {
    const map = new Map<string, BoardIssue>();
    for (const issue of rawIssues) map.set(issue.id, issue);
    return map;
  }, [rawIssues]);

  const avatarsByName = useMemo(() => buildAvatarsByName(users), [users]);
  const allAssignees = useMemo(() => buildAllAssignees(rawIssues), [rawIssues]);
  const assigneeOptions = useMemo(() => buildAssigneeOptions(users), [users]);

  return {
    columns,
    colMap,
    issuesById,
    rawIssues,
    avatarsByName,
    allAssignees,
    assigneeOptions,
    users,
    statuses,
    isLoading,
    error,
    statusBySlug,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   useTasksKanbanMutations — drop handler + status change for TasksBoardView.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TasksKanbanMutations {
  /**
   * Persist a drop. Called by PragmaticBoard's onDrop handler. Routes the
   * intent to `useMoveBoardTask` which updates both `status_id` and
   * `position` in a single supabase update.
   */
  persistDrop: (args: {
    cardId: string;
    sourceColId: string;
    destColId: string;
    insertIndex: number;
  }) => void;

  /**
   * Persist a status change via the card's row menu (Change status
   * sub-menu). Looks up the status by slug, then mutates `status_id`.
   */
  persistStatusChange: (cardId: string, statusSlug: string) => void;
}

/**
 * Compose mutations for TasksBoardView. The `statuses` parameter is the
 * resolved list from `useTaskStatuses` — used to map slug → id for the
 * row-menu status change.
 */
export function useTasksKanbanMutations(statuses: PlannerStatus[]): TasksKanbanMutations {
  const moveTask = useMoveBoardTask();
  const updateTask = useUpdatePlannerTask();
  const qc = useQueryClient();

  const persistDrop = useCallback(
    ({ cardId, destColId, insertIndex }: {
      cardId: string;
      sourceColId: string;
      destColId: string;
      insertIndex: number;
    }) => {
      // useMoveBoardTask writes status_id + position in a single supabase
      // update + optimistic cache patch. destColId IS the status_id
      // (mapStatusesToColumns sets column.id = status.id).
      moveTask.mutate({
        task_id: cardId,
        target_status_id: destColId,
        target_position: insertIndex,
      });
      // Invalidate planner-tasks so the list view / other surfaces refresh.
      qc.invalidateQueries({ queryKey: ['planner-tasks'] });
    },
    [moveTask, qc],
  );

  const persistStatusChange = useCallback(
    (cardId: string, statusSlug: string) => {
      const match = statuses.find((s) => s.slug === statusSlug || s.id === statusSlug);
      if (!match) return; // unknown slug → no-op, zero-assumption
      // The card menu reaches PragmaticBoard via `onChangeStatus(id, slug)`.
      // useUpdatePlannerTask resolves slug → status_id internally.
      updateTask.mutate({
        id: cardId,
        updates: { status: match.slug as TaskStatus },
      });
    },
    [statuses, updateTask],
  );

  return { persistDrop, persistStatusChange };
}
