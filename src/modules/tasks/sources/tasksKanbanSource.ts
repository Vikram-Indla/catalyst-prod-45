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
      // Bug 2 fix (2026-06-16): compute a fractional `position` value from
      // the neighbors at `insertIndex` in the destination column. Without
      // this, every drop wrote `position = insertIndex` (0, 1, 2…) and
      // collided with existing positions — same-column reorder appeared to
      // do nothing because the rank values overlapped and the secondary
      // `created_at` sort dominated.
      //
      // Algorithm:
      //   • Pull all PlannerTasks from the cache.
      //   • Filter to rows whose `status_id` (resolved via the statuses list)
      //     matches `destColId`, excluding the dragged card itself.
      //   • Sort by current `position` (NULL last, then `created_at` desc) —
      //     mirrors the query order.
      //   • Pick neighbors at `insertIndex` and compute a midpoint position.
      //   • Falls back to monotonic spacing (1000-step) when neighbors are
      //     missing positions.
      const destStatus = statuses.find((s) => s.id === destColId);
      const allTasksQueries = qc.getQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] });
      // Flatten + dedupe by id across all cached planner-tasks queries.
      const seen = new Set<string>();
      const allTasks: PlannerTask[] = [];
      for (const [, data] of allTasksQueries) {
        if (!data) continue;
        for (const t of data) {
          if (!seen.has(t.id)) { seen.add(t.id); allTasks.push(t); }
        }
      }
      // Determine the destination slug so we can match `task.status` (slug
      // unioned in PlannerTask) against `destStatus.slug`. The PlannerTask
      // status field stores the slug, not the UUID.
      const destSlug = destStatus?.slug;
      const colTasks = destSlug
        ? allTasks
            .filter((t) => t.id !== cardId && t.status === destSlug)
            .sort((a, b) => {
              const pa = a.position ?? Number.POSITIVE_INFINITY;
              const pb = b.position ?? Number.POSITIVE_INFINITY;
              if (pa !== pb) return pa - pb;
              // Tiebreaker: created_at DESC matches useTaskItems query.
              return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
            })
        : [];

      // `position` is an INTEGER column (planner_tasks/tasks bootstrap schema).
      // Use a wide STEP (1,000,000) so the integer midpoint between neighbors
      // has many bisections of headroom. When the gap collapses to 1 we round
      // toward `prevPos + 1` — the dropped card still sorts before `next` due
      // to the `created_at` tiebreaker. A future compaction pass can re-spread
      // positions to restore headroom if needed.
      const STEP = 1_000_000;
      let targetPosition: number;
      if (colTasks.length === 0) {
        targetPosition = STEP;
      } else if (insertIndex <= 0) {
        const firstPos = colTasks[0].position ?? (STEP * (colTasks.length + 1));
        targetPosition = firstPos - STEP;
      } else if (insertIndex >= colTasks.length) {
        const lastPos = colTasks[colTasks.length - 1].position ?? (STEP * colTasks.length);
        targetPosition = lastPos + STEP;
      } else {
        const prev = colTasks[insertIndex - 1];
        const next = colTasks[insertIndex];
        const prevPos = prev.position ?? (insertIndex * STEP);
        const nextPos = next.position ?? ((insertIndex + 1) * STEP);
        const gap = nextPos - prevPos;
        targetPosition = gap > 1 ? prevPos + Math.floor(gap / 2) : prevPos + 1;
      }

      // Optimistic patch on the planner-tasks cache — the board reads from
      // useTaskItems (['planner-tasks', …]), so we must update THAT cache,
      // not just the legacy ['tasks', 'board', 'tasks'] cache the
      // useMoveBoardTask hook patches. Without this the dropped card snaps
      // back to its old slot until the invalidation round-trip completes.
      qc.setQueriesData<PlannerTask[]>({ queryKey: ['planner-tasks'] }, (old) => {
        if (!old) return old;
        return old.map((t) => {
          if (t.id !== cardId) return t;
          const next: PlannerTask = { ...t, position: targetPosition };
          if (destSlug) next.status = destSlug as PlannerTask['status'];
          return next;
        });
      });

      // useMoveBoardTask writes status_id + position in a single supabase
      // update + optimistic cache patch. destColId IS the status_id
      // (mapStatusesToColumns sets column.id = status.id).
      moveTask.mutate({
        task_id: cardId,
        target_status_id: destColId,
        target_position: targetPosition,
      });
      // Invalidate planner-tasks so the list view / other surfaces refresh.
      qc.invalidateQueries({ queryKey: ['planner-tasks'] });
    },
    [moveTask, qc, statuses],
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
