/**
 * ProductHub BoardAdapter<Request>.
 *
 * Produces the canonical BoardAdapter<Request> contract that
 * KanbanBoardShell consumes.
 *
 * ───────────────────────────────────────────────────────────────────
 * Phase 3 (2026-04-26): WORKFLOW-DRIVEN COLUMNS.
 *
 * The previous static `PRODUCTHUB_BOARD_COLUMNS` array has been retired.
 * Columns are now derived from `WorkflowStatus[]` provided by the page
 * (which calls `useCatalystWorkflow('Business Request')`). One column
 * per status, in workflow `position` order. Column header label =
 * `WorkflowStatus.name`. Column category = `WorkflowStatus.category`.
 *
 * Effect: renaming a status in /admin/workflows updates the kanban
 * column header on next refetch. Adding/removing a status in the admin
 * editor adds/removes a column. No code change required for either.
 * ───────────────────────────────────────────────────────────────────
 *
 * Contract highlights:
 *   - Cards are CanonicalBoardIssue (extends BoardIssue).
 *   - Filter categories use ProjectHub's shared FilterCategory shape so
 *     the canonical toolbar renders them directly.
 *   - Group-by options use ProjectHub's shared GroupByOption<K> shape.
 *   - An request-typed icon resolver ships through so cards render with
 *     the correct hub icon instead of falling back to the Jira "Task" icon.
 *
 * Persistence wiring is forwarded by the hosting page — the adapter builder
 * is a pure function. Side effects live in the page mutations.
 */
import type { ReactNode } from 'react';
import { CircleDashed } from 'lucide-react';
import type { Request, RequestStatus } from '@/types/request';
import { BusinessRequestIcon } from '@/components/producthub/shared/BusinessRequestBadge';
import type { WorkflowStatus } from '@/hooks/useCatalystWorkflow';
import type { KanbanColumnDef } from '../kanban-tokens';
import type { BoardIssue } from '../kanban-types';
import type {
  BoardAdapter,
  CanonicalBoardIssue,
  BoardPersistence,
  BoardInteractions,
  BoardLozenge,
} from './BoardAdapter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import type { GroupByOption } from '@/components/shared/GroupByPopover';

/* ═══════════════════════════════════════════════════════════════════════
   Workflow → columns.

   One column per workflow status, sorted by `position`. The column id
   format `col-${slug}` is preserved for compatibility with any persisted
   UI state (URL query params, localStorage column-collapse prefs).
   ═══════════════════════════════════════════════════════════════════════ */

export function buildColumnsFromWorkflowStatuses(
  statuses: WorkflowStatus[],
): KanbanColumnDef[] {
  return statuses
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((status) => {
      // Multi-status mapping — primary slug + any aliases from
      // catalyst_workflow_statuses.slug_aliases. Mirrors Jira's column→N-status
      // model (board 597 has 0..7 statuses per column). The aliases array is
      // populated for ph_requests.status enum values that don't share a
      // workflow slug (e.g. column 'done' aliases ['closed','delivered',
      // 'cancelled']).
      const aliases = (status as WorkflowStatus & { slug_aliases?: string[] | null })
        .slug_aliases ?? [];
      const allStatuses = [status.slug, ...aliases];
      return {
        id: `col-${status.slug}`,
        name: status.name.toUpperCase(),
        category: status.category,
        statuses: allStatuses,
        wipLimit: status.wip_limit ?? null,
      } as KanbanColumnDef;
    });
}

/**
 * Catalyst-native fallback alias map.
 *
 * The post-Phase-3 design routes raw `ph_requests.status` enum values
 * into workflow columns via `catalyst_workflow_statuses.slug_aliases`.
 * That assumes the DB has the slug_aliases populated (cycle-4 migration).
 * On any DB where the migration hasn't landed (e.g. dev DB without admin
 * access), we still want the kanban to render every request in a
 * sensible column instead of dropping cards on the floor.
 *
 * This map ships a Catalyst-canonical routing for every base
 * `initiative_status` enum value to a legacy or post-migration column slug.
 * It's consulted ONLY when the workflow row's slug_aliases didn't match.
 *
 * Routing logic, in order:
 *   1. Exact match on column.slug.
 *   2. Match on column.slug_aliases.
 *   3. Fallback alias map below.
 *   4. null (card drops to "no column" — should be impossible after this).
 */
const CATALYST_DB_STATUS_FALLBACK: Record<string, string[]> = {
  new_demand:    ['demand_intake', 'new'],
  under_review:  ['demand_validation'],
  approved:      ['pending_approval'],
  in_progress:   ['implementation'],
  on_hold:       ['on_hold'],
  delivered:     ['done'],
  closed:        ['done'],
  cancelled:     ['done', 'canceled'],
};

function buildStatusToColumnId(
  columns: KanbanColumnDef[],
): (status: string) => string | null {
  const map = new Map<string, string>();
  columns.forEach((col) => col.statuses.forEach((s) => map.set(s, col.id)));
  // Layer the Catalyst fallback aliases on top — only fills slots the
  // workflow rows didn't already own, so DB-driven slug_aliases always win.
  Object.entries(CATALYST_DB_STATUS_FALLBACK).forEach(([dbStatus, candidates]) => {
    if (map.has(dbStatus)) return;
    for (const candidateSlug of candidates) {
      const target = columns.find((c) => c.id === `col-${candidateSlug}`);
      if (target) {
        map.set(dbStatus, target.id);
        return;
      }
    }
  });
  return (status) => map.get(status) ?? null;
}

/**
 * Map a column id back to a value safe to write into
 * `ph_requests.status`. The column's `statuses` array is
 * `[slug, ...slug_aliases]` per `buildColumnsFromWorkflowStatuses`.
 *
 * Slug-aliases are populated by the cycle-4 migration to route legacy
 * `initiative_status` enum values (`new_demand`, `in_progress`,
 * `closed`, etc.) into renamed columns. Those alias values are
 * GUARANTEED to be in the enum (that's their purpose), while the
 * column's primary slug may or may not be in the enum yet
 * (post-migration both work; pre-migration only legacy values do).
 *
 * So for write-safety on drag-drop: prefer the first alias when
 * present, fall back to the slug otherwise. Result is always a value
 * the existing column-routing accepts (statusToColumnId reads slug
 * + slug_aliases) AND that the DB enum accepts.
 */
function buildColumnIdToStatus(
  columns: KanbanColumnDef[],
): (columnId: string) => RequestStatus | null {
  return (columnId) => {
    const col = columns.find((c) => c.id === columnId);
    if (!col) return null;
    // statuses = [slug, ...slug_aliases]. Prefer the first alias for
    // write-safety; if no aliases were declared, the slug itself is
    // the only choice.
    const writeValue = col.statuses[1] ?? col.statuses[0] ?? null;
    return (writeValue as RequestStatus) ?? null;
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Priority — request score band → Jira-flavored bucket.
   ═══════════════════════════════════════════════════════════════════════ */
function mapPriority(request: Request): string {
  const explicit = (request as { priority?: string | null }).priority;
  if (explicit) return explicit;
  const score = request.computed_score;
  if (score === null || score === undefined) {
    // Jira parity — every card on board 597 shows a priority indicator.
    // Catalyst requests often have neither explicit priority nor a
    // computed score; default to 'Medium' so the priority bars always
    // render and the card never looks half-baked.
    return 'Medium';
  }
  if (score >= 4.0) return 'High';
  if (score >= 3.0) return 'Medium';
  if (score >= 2.0) return 'Low';
  return 'Lowest';
}

/* ═══════════════════════════════════════════════════════════════════════
   Status-category bucket — workflow-driven, with a heuristic fallback
   for the brief render window before workflow data resolves.
   ═══════════════════════════════════════════════════════════════════════ */
function buildStatusCategoryResolver(
  statuses: WorkflowStatus[],
): (status: RequestStatus) => 'todo' | 'in_progress' | 'done' {
  const map = new Map<string, 'todo' | 'in_progress' | 'done'>();
  statuses.forEach((s) => map.set(s.slug, s.category));
  return (status) => {
    const found = map.get(status);
    if (found) return found;
    // Fallback heuristic — only reached if statuses haven't loaded yet.
    if (status === 'done' || status === 'cancelled') return 'done';
    if (status === 'new') return 'todo';
    return 'in_progress';
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Request → CanonicalBoardIssue adapter.
   ═══════════════════════════════════════════════════════════════════════ */
function makeInitiativeToCanonicalIssue(
  resolveCategory: (status: RequestStatus) => 'todo' | 'in_progress' | 'done',
): (request: Request) => CanonicalBoardIssue {
  return (request) => {
    const primary: BoardLozenge | null = request.department_name
      ? { label: request.department_name, appearance: 'default' }
      : null;
    const secondary: BoardLozenge | null = request.target_quarter
      ? { label: request.target_quarter, appearance: 'inprogress' }
      : null;
    // Catalyst-canonical: every request is Catalyst's own row. The
    // historical `sourceTag === 'jira'` rendering chip ("Jira-MDT") is
    // dropped now that we treat Catalyst as standalone — provenance no
    // longer drives card chrome. Field intentionally omitted from the
    // canonical card so `WorkItemCard` doesn't render a SourceBadge for
    // requests. Other hubs that still want provenance signaling
    // (e.g. cross-system imports) keep it via their own adapters.
    // Raw DB enum value — the kanban routes columns off this so
    // `catalyst_workflow_statuses.slug_aliases` actually maps the legacy
    // statuses (`new_demand`, `in_progress`, `closed` etc.) into their
    // post-rename column homes. Falls back to UI status for older rows.
    const dbStatus =
      ((request as { db_status?: string }).db_status ?? null) ||
      (request.status as string);
    const issue: CanonicalBoardIssue = {
      id: request.id,
      issueKey: request.initiative_key,
      summary: request.title,
      // Jira board 597 filter is `worktype = "Business Request"` — match
      // that string so JiraIssueTypeIcon falls back to the amber-lightbulb
      // glyph defined in jira-issue-type-icons.tsx (line 201) when the
      // adapter's resolveIcon returns null.
      issueType: 'Business Request',
      priority: mapPriority(request),
      status: request.status,
      boardStatus: dbStatus,
      statusCategory: resolveCategory(request.status),
      assigneeName: request.assignee_name,
      labels: [],
      sprintName: null,
      storyPoints: null,
      parentKey: null,
      parentSummary: null,
      fixVersion: null,
      isFlagged: request.is_favorited,
      updatedAt: request.updated_at,
      createdAt: request.created_at,
      // sourceTag intentionally omitted — see comment above.
      primaryLozenge: primary,
      secondaryLozenge: secondary,
      metaText: null,
      raw: request,
    };
    return issue;
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   Request type icon — single Business Request icon (Atlaskit lightbulb).
   ═══════════════════════════════════════════════════════════════════════ */
export function resolveInitiativeIcon(_card: BoardIssue): ReactNode | null {
  return <BusinessRequestIcon size={14} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Filter + group-by schemas — shared FilterCategory / GroupByOption so
   KanbanToolbar (the canonical toolbar) renders them directly.
   ═══════════════════════════════════════════════════════════════════════ */

function uniqueDepartments(requests: Request[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of requests) {
    if (!i.department_name) continue;
    counts.set(i.department_name, (counts.get(i.department_name) ?? 0) + 1);
  }
  return {
    id: 'department',
    label: 'Department',
    searchPlaceholder: 'Search departments...',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ id: name, label: name, labelExtra: String(count) })),
  };
}

function uniqueQuarters(requests: Request[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of requests) {
    if (!i.target_quarter) continue;
    counts.set(i.target_quarter, (counts.get(i.target_quarter) ?? 0) + 1);
  }
  return {
    id: 'quarter',
    label: 'Quarter',
    searchPlaceholder: 'Search quarters...',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([q, count]) => ({ id: q, label: q, labelExtra: String(count) })),
  };
}

function uniquePriorities(): FilterCategory {
  return {
    id: 'priority',
    label: 'Priority',
    options: [
      { id: 'High',   label: 'High' },
      { id: 'Medium', label: 'Medium' },
      { id: 'Low',    label: 'Low' },
      { id: 'Lowest', label: 'Rejected' },
    ],
  };
}

function uniqueAssignees(requests: Request[], avatarsByName: Map<string, string>): FilterCategory {
  const counts = new Map<string, number>();
  for (const i of requests) {
    if (!i.assignee_name) continue;
    counts.set(i.assignee_name, (counts.get(i.assignee_name) ?? 0) + 1);
  }
  return {
    id: 'assignee',
    label: 'Assignee',
    searchPlaceholder: 'Search people...',
    options: Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({
        id: name,
        label: name,
        labelExtra: String(count),
        avatarUrl: avatarsByName.get(name.toLowerCase()),
        avatarType: 'photo' as const,
      })),
  };
}

export function buildFilterCategories(
  requests: Request[],
  avatarsByName: Map<string, string>,
): FilterCategory[] {
  return [
    uniqueDepartments(requests),
    uniqueQuarters(requests),
    uniquePriorities(),
    uniqueAssignees(requests, avatarsByName),
  ];
}

/* ═══════════════════════════════════════════════════════════════════════
   Group-by options (match the ProductHub lineup from the legacy adapter).
   ═══════════════════════════════════════════════════════════════════════ */
export const PRODUCTHUB_GROUP_OPTIONS: GroupByOption<string>[] = [
  { key: 'none',       label: 'None' },
  { key: 'department', label: 'Department' },
  { key: 'quarter',    label: 'Quarter' },
  { key: 'assignee',   label: 'Assignee' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Adapter builder.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BuildProductHubAdapterArgs {
  /** Full, unfiltered request set from the hub's data hook. */
  requests: Request[];
  /** `displayName`.toLowerCase() → avatar URL. */
  avatarsByName: Map<string, string>;

  /**
   * Workflow statuses from useCatalystWorkflow('Business Request').
   * Drives column structure, header labels, categories, and order.
   * Pass an empty array while loading — the adapter renders zero columns
   * in that window; the page should gate adapter construction on
   * `!workflowLoading` to avoid the empty-board flash.
   */
  workflowStatuses: WorkflowStatus[];

  /* ── Filter state (page-owned so it drives TanStack Query keys) ── */
  search: string;
  onSearchChange: (v: string) => void;
  selAssignees: Set<string>;
  onSelAssigneesChange: (next: Set<string>) => void;
  filterSelected: Record<string, string[]>;
  onFilterChange: (categoryId: string, values: string[]) => void;
  onClearFilters: () => void;
  groupBy: string;
  onGroupByChange: (key: string) => void;

  /* ── Persistence callbacks ── */
  onStatusChange: (requestId: string, newStatus: RequestStatus) => void | Promise<void>;
  onToggleFavorite?: (requestId: string) => void | Promise<void>;

  /* ── Interactions ── */
  onCardClick?: (requestId: string) => void;
  /**
   * Per-column "+ Create" — host opens its create flow with the
   * destination status pre-filled. Forwarded straight to
   * `BoardInteractions.onCreateInColumn`.
   */
  onCreateInColumn?: (colId: string) => void;
}

export function buildProductHubBoardAdapter(
  args: BuildProductHubAdapterArgs,
): BoardAdapter<Request> {
  const {
    requests, avatarsByName, workflowStatuses,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onStatusChange, onToggleFavorite,
    onCardClick, onCreateInColumn,
  } = args;

  /* ── Workflow-derived structures. ── */
  const columns = buildColumnsFromWorkflowStatuses(workflowStatuses);
  const statusToColumnId = buildStatusToColumnId(columns);
  const columnIdToStatus = buildColumnIdToStatus(columns);
  const resolveCategory = buildStatusCategoryResolver(workflowStatuses);
  const initiativeToCanonicalIssue = makeInitiativeToCanonicalIssue(resolveCategory);

  /* Filtered cards — mirrors the legacy adapter's filter order. */
  const filtered = requests.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.initiative_key.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selAssignees.size > 0) {
      if (!i.assignee_name || !selAssignees.has(i.assignee_name)) return false;
    }
    const deps = filterSelected.department ?? [];
    if (deps.length > 0 && (!i.department_name || !deps.includes(i.department_name))) return false;
    const quarters = filterSelected.quarter ?? [];
    if (quarters.length > 0 && (!i.target_quarter || !quarters.includes(i.target_quarter))) return false;
    const prios = filterSelected.priority ?? [];
    if (prios.length > 0 && !prios.includes(mapPriority(i))) return false;
    const assignees = filterSelected.assignee ?? [];
    if (assignees.length > 0 && (!i.assignee_name || !assignees.includes(i.assignee_name))) return false;
    return true;
  });

  const cards: CanonicalBoardIssue[] = filtered.map(initiativeToCanonicalIssue);

  const allAssignees = Array.from(
    requests.reduce((map, i) => {
      if (!i.assignee_name) return map;
      map.set(i.assignee_name, (map.get(i.assignee_name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  const persistence: BoardPersistence = {
    onDrop: (event) => {
      if (event.destColId !== event.sourceColId) {
        const newStatus = columnIdToStatus(event.destColId);
        if (newStatus) return onStatusChange(event.cardId, newStatus);
      }
    },
    onToggleFlag: onToggleFavorite,
    onStatusChange: (cardId, status) => onStatusChange(cardId, status as RequestStatus),
  };

  const interactions: BoardInteractions = {
    onCardClick,
    onCreateInColumn,
    createInColumnLabel: 'Create request',
  };

  /**
   * Swimlane resolver — Catalyst-canonical groupings:
   *   department → primaryLozenge.label (department_name)
   *   quarter    → secondaryLozenge.label (target_quarter)
   *   assignee   → assigneeName
   * Cards whose field is null fall into the synthetic "Unassigned" lane.
   */
  const swimlaneOf = (groupByKey: string): ((card: CanonicalBoardIssue) => string | null) | null => {
    if (groupByKey === 'none') return null;
    if (groupByKey === 'department') return (card) => card.primaryLozenge?.label ?? null;
    if (groupByKey === 'quarter')    return (card) => card.secondaryLozenge?.label ?? null;
    if (groupByKey === 'assignee')   return (card) => card.assigneeName ?? null;
    return null;
  };

  return {
    name: 'producthub',
    contextKey: 'producthub',

    cards,
    columns,
    statusToColumnId,
    columnIdToStatus,
    fromHubRow: initiativeToCanonicalIssue,

    filterCategories: buildFilterCategories(requests, avatarsByName),
    filterSelected,
    onFilterChange,
    onClearFilters,

    groupByOptions: PRODUCTHUB_GROUP_OPTIONS,
    groupBy,
    onGroupByChange,
    groupByNoneKey: 'none',
    swimlaneOf,

    allAssignees,
    selAssignees,
    onSelAssigneesChange,
    avatarsByName,

    search,
    onSearchChange,

    persistence,
    interactions,

    resolveIcon: resolveInitiativeIcon,
    createLabel: 'New business request',
  };
}
