/**
 * buildTasksTimelineTree — Pure transform from PlannerTask[] + Workstream[]
 * to TimelineIssue[] (the canonical Timeline data contract).
 *
 * Phase 3 of the Tasks Hub canonical alignment plan (2026-06-16). Lets
 * `TasksTimelineView` mount the shared `TimelineView` without forking it.
 *
 * Structure:
 *   - Top level: one synthetic group row per workstream (`isGroup: true`,
 *     `issueType: 'Epic'` so it renders with an epic-style sidebar icon —
 *     matches Project Hub's epic-grouped timeline).
 *   - Tasks with no `teamId` (workstream_id) collect under an "Unassigned"
 *     synthetic group (still `isGroup: true`).
 *   - Tasks WITHIN a group: root tasks first (`parentTaskId === null`),
 *     subtasks nested under their parent.
 *   - Orphan subtasks (parent_task_id points to a task NOT in this input)
 *     are PROMOTED to root inside their workstream — never silently
 *     dropped.
 *
 * Zero-assumption (CLAUDE.md 2026-06-11): missing data renders as null,
 * never as a typed default. No `|| 'todo'`. No `|| 'Medium'`.
 */

import type { TimelineIssue } from '@/components/shared/Timeline/types';
import type { PlannerTask, TaskStatus } from '@/modules/tasks/types';
import type { Workstream } from '@/modules/tasks/hooks/useTaskWorkstreams';

/* ─────────────────────────────── helpers ──────────────────────────────── */

/** Map PlannerTask slug → Jira-style status_category string used by the
 *  canonical StatusPill / TimelineView color logic. */
function statusCategoryFromSlug(slug: TaskStatus | null | undefined): string | null {
  if (!slug) return null;
  switch (slug) {
    case 'done':
      return 'done';
    case 'in-progress':
    case 'review':
      return 'progress';
    case 'backlog':
    case 'planned':
      return 'default';
    default:
      return null;
  }
}

/** Human-readable status label for the timeline sidebar. PlannerTask
 *  surfaces only the slug — map back to a label that matches the kanban
 *  column titles (see types.ts COLUMN_CONFIG). */
function statusLabelFromSlug(slug: TaskStatus | null | undefined): string {
  switch (slug) {
    case 'backlog': return 'Backlog';
    case 'planned': return 'Planned';
    case 'in-progress': return 'In Progress';
    case 'review': return 'Review';
    case 'done': return 'Done';
    default: return '';
  }
}

/** Map a PlannerTask priority slug to its display label. Returns null
 *  when the priority is missing — the timeline omits the priority
 *  affordance rather than rendering a lie. */
function priorityLabel(p: PlannerTask['priority'] | null | undefined): string | null {
  if (!p) return null;
  switch (p) {
    case 'critical': return 'Highest';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return null;
  }
}

/** Convert a single PlannerTask into a leaf TimelineIssue (no children). */
function toTimelineLeaf(t: PlannerTask): TimelineIssue {
  return {
    id: t.id,
    issueKey: t.key,
    projectKey: 'TASKS',
    issueType: 'Task',
    summary: t.title,
    status: statusLabelFromSlug(t.status),
    statusCategory: statusCategoryFromSlug(t.status),
    priority: priorityLabel(t.priority),
    assigneeDisplayName: t.assigneeName ?? null,
    assigneeAvatarUrl: null,
    parentKey: null,
    startDate: t.startDate ?? null,
    dueDate: t.dueDate ?? null,
    epicColor: null,
    fixVersions: [],
    children: [],
  };
}

/** Convert a Workstream into a synthetic group row. `isGroup: true` makes
 *  TimelineView render it as a collapsible header with no Gantt bar. */
function toWorkstreamGroup(
  ws: Workstream | null,
  children: TimelineIssue[],
): TimelineIssue {
  if (!ws) {
    return {
      id: 'unassigned-group',
      issueKey: 'UNASSIGNED',
      projectKey: 'TASKS',
      issueType: 'Epic',
      summary: 'Unassigned',
      status: '',
      statusCategory: null,
      priority: null,
      assigneeDisplayName: null,
      assigneeAvatarUrl: null,
      parentKey: null,
      startDate: null,
      dueDate: null,
      epicColor: null,
      fixVersions: [],
      children,
      isGroup: true,
    };
  }
  return {
    id: `ws-${ws.id}`,
    issueKey: `WS-${ws.id}`,
    projectKey: 'TASKS',
    issueType: 'Epic',
    summary: ws.name,
    status: '',
    statusCategory: null,
    priority: null,
    assigneeDisplayName: null,
    assigneeAvatarUrl: null,
    parentKey: null,
    startDate: ws.start_date ?? null,
    dueDate: ws.due_date ?? null,
    epicColor: ws.color ?? null,
    fixVersions: [],
    children,
    isGroup: true,
  };
}

/* ─────────────────────────────── main ─────────────────────────────────── */

export function buildTasksTimelineTree(
  tasks: PlannerTask[],
  workstreams: Workstream[],
): TimelineIssue[] {
  // ── Pre-index workstreams by id and pin display order via the
  //    workstream's existing sort_order (then name as a stable tiebreaker).
  const wsById = new Map<string, Workstream>();
  for (const ws of workstreams) wsById.set(ws.id, ws);

  // ── Bucket tasks by workstream id (null bucket = unassigned).
  const tasksByWs = new Map<string | null, PlannerTask[]>();
  for (const t of tasks) {
    const key = t.teamId ?? null;
    const bucket = tasksByWs.get(key);
    if (bucket) bucket.push(t);
    else tasksByWs.set(key, [t]);
  }

  // ── Build per-bucket subtask tree. Orphan subtasks (parent not in bucket)
  //    promote to root so they always appear.
  function buildBucketTree(bucketTasks: PlannerTask[]): TimelineIssue[] {
    const idSet = new Set(bucketTasks.map(t => t.id));
    const leafById = new Map<string, TimelineIssue>();
    for (const t of bucketTasks) leafById.set(t.id, toTimelineLeaf(t));

    const roots: TimelineIssue[] = [];
    for (const t of bucketTasks) {
      const leaf = leafById.get(t.id)!;
      const parentId = t.parentTaskId ?? null;
      if (parentId && idSet.has(parentId)) {
        // Nest under parent.
        const parentLeaf = leafById.get(parentId);
        if (parentLeaf) {
          parentLeaf.children.push(leaf);
          // Wire parentKey so TimelineView's parent linking is correct.
          leaf.parentKey = parentLeaf.issueKey;
          continue;
        }
      }
      // Either no parent OR parent not in this bucket → promote to root.
      roots.push(leaf);
    }
    return roots;
  }

  const groups: TimelineIssue[] = [];

  // ── Workstream groups in sort_order, then alpha by name (deterministic).
  const sortedWs = [...workstreams].sort((a, b) => {
    const sa = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const sb = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });

  for (const ws of sortedWs) {
    const bucket = tasksByWs.get(ws.id) ?? [];
    if (bucket.length === 0) continue;
    groups.push(toWorkstreamGroup(ws, buildBucketTree(bucket)));
  }

  // ── Tasks pointing at a workstream NOT present in `workstreams` input
  //    (stale FK / pre-archive) collect under their own synthetic group
  //    so they're never silently dropped.
  const allBucketKeys = Array.from(tasksByWs.keys());
  for (const key of allBucketKeys) {
    if (key === null) continue;
    if (wsById.has(key)) continue;
    const bucket = tasksByWs.get(key) ?? [];
    if (bucket.length === 0) continue;
    // Synthetic minimal workstream stub — only `name` and `id` matter.
    const stubGroup = toWorkstreamGroup(null, buildBucketTree(bucket));
    stubGroup.id = `ws-orphan-${key}`;
    stubGroup.issueKey = `WS-ORPHAN-${key}`;
    stubGroup.summary = 'Unknown workstream';
    groups.push(stubGroup);
  }

  // ── Unassigned bucket last.
  const unassignedBucket = tasksByWs.get(null) ?? [];
  if (unassignedBucket.length > 0) {
    groups.push(toWorkstreamGroup(null, buildBucketTree(unassignedBucket)));
  }

  return groups;
}
