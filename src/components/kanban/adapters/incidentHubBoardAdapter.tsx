/**
 * IncidentHub BoardAdapter — Phase 5.
 *
 * Converts the IncidentHub kanban surface (`/incident-hub/kanban`) onto
 * the canonical BoardAdapter contract consumed by KanbanBoardShell.
 *
 *   Data source : useIncidentListView (`ph_issues` filtered to
 *                 Production Incidents, sourced from Jira).
 *   Read-only    : The hub treats Jira-sourced incidents as read-only.
 *                  Dragging a card between columns surfaces a toast
 *                  telling the user to manage status in Jira, then a
 *                  refetch is triggered so the optimistic colMap is
 *                  reset once the next cards identity flows through.
 *
 * Card mapping
 *   issueKey      ← incident.incident_key   ("INC-0042")
 *   summary       ← incident.title
 *   issueType     ← 'Production Incident'
 *   priority      ← incident.priority        ('P1'-'P4')
 *   status        ← incident.status          (triage / open / in_progress / to_committee / resolved)
 *   assigneeName  ← incident.assignee_name
 *   primaryLoz.   ← severity lozenge (SEV-1 red / SEV-2 yellow / SEV-3 blue / SEV-4 neutral)
 *   secondaryLoz. ← null (incidents don't carry fix version / quarter on this board)
 *   metaText      ← 'Breached' | 'Due <date>' | null
 *   raw           ← original incident row (for adapter callbacks)
 *   isFlagged     ← resolution_breached (visual affordance — red left edge)
 *
 * Icon resolver
 *   Uses incident.type_icon_url (from Jira) when present. Falls back to
 *   a red production-incident warning icon so cards look correct even
 *   when the icon URL is missing.
 */
import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
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
   Row shape — mirrors the flattened record produced by
   useIncidentListView. We don't import the upstream type to keep the
   adapter decoupled; only the fields this adapter reads are declared.
   ═══════════════════════════════════════════════════════════════════════ */

export interface IncidentHubRow {
  id: string;
  incident_key: string;
  title: string;
  description: string | null;
  severity: string;              // 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4'
  priority: string;              // 'P1' .. 'P4'
  status: string;                // 'triage' | 'open' | 'in_progress' | 'to_committee' | 'resolved' | ...
  jira_status: string;
  project_name: string;
  assignee_name: string | null;
  reporter_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  resolution: string | null;
  labels: unknown;
  due_date: string | null;
  type_icon_url: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  resolution_breached: boolean;
  response_breached: boolean;
  resolution_due_at: string | null;
}

/* ═══════════════════════════════════════════════════════════════════════
   Column lifecycle — preserves the 5-stage IncidentHub board grouping.
   ═══════════════════════════════════════════════════════════════════════ */

export const INCIDENTHUB_BOARD_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-triage',       name: 'TRIAGE',       category: 'todo',        statuses: ['triage'] },
  { id: 'col-open',         name: 'OPEN',         category: 'todo',        statuses: ['open'] },
  { id: 'col-in-progress',  name: 'IN PROGRESS',  category: 'in_progress', statuses: ['in_progress'] },
  { id: 'col-committee',    name: 'COMMITTEE',    category: 'in_progress', statuses: ['to_committee'] },
  { id: 'col-resolved',     name: 'RESOLVED',     category: 'done',        statuses: ['resolved'] },
];

const STATUS_TO_COL = new Map<string, string>();
INCIDENTHUB_BOARD_COLUMNS.forEach(col => col.statuses.forEach(s => STATUS_TO_COL.set(s, col.id)));

export function incidentHubStatusToColumnId(status: string): string | null {
  return STATUS_TO_COL.get(status) ?? null;
}

export function incidentHubColumnIdToStatus(columnId: string): string | null {
  const col = INCIDENTHUB_BOARD_COLUMNS.find(c => c.id === columnId);
  return col?.statuses[0] ?? null;
}

/* ═══════════════════════════════════════════════════════════════════════
   Severity → Atlaskit lozenge appearance mapping. The canonical card
   surface honours the five Atlaskit appearances; we pick the closest
   semantic match for each severity tier.
   ═══════════════════════════════════════════════════════════════════════ */

function severityAppearance(severity: string): BoardLozenge['appearance'] {
  const s = severity?.toUpperCase().replace('-', '');
  switch (s) {
    case 'SEV1': return 'removed';    // red — highest severity
    case 'SEV2': return 'new';        // amber — high severity
    case 'SEV3': return 'inprogress'; // blue — medium severity
    case 'SEV4':
    default:     return 'default';    // neutral — low severity
  }
}

function statusCategory(status: string): 'todo' | 'in_progress' | 'done' {
  if (status === 'resolved') return 'done';
  if (status === 'triage' || status === 'open') return 'todo';
  return 'in_progress';
}

/* ═══════════════════════════════════════════════════════════════════════
   Meta text — surface breached SLA / due-date hints in the card footer.
   ═══════════════════════════════════════════════════════════════════════ */

function formatDueLabel(row: IncidentHubRow): string | null {
  if (row.resolution_breached) return 'SLA breached';
  if (!row.due_date) return null;
  try {
    const due = new Date(row.due_date);
    const now = Date.now();
    const diffMs = due.getTime() - now;
    const diffH = Math.round(diffMs / 3_600_000);
    if (Math.abs(diffH) < 48) {
      if (diffH >= 0) return `Due in ${diffH}h`;
      return `Overdue ${Math.abs(diffH)}h`;
    }
    const diffD = Math.round(diffH / 24);
    if (diffD >= 0) return `Due in ${diffD}d`;
    return `Overdue ${Math.abs(diffD)}d`;
  } catch { return null; }
}

/* ═══════════════════════════════════════════════════════════════════════
   IncidentHubRow → CanonicalBoardIssue.
   ═══════════════════════════════════════════════════════════════════════ */

export function incidentToCanonicalIssue(row: IncidentHubRow): CanonicalBoardIssue {
  const sevLabel = row.severity?.toUpperCase().replace('-', '');
  const primary: BoardLozenge | null = row.severity
    ? { label: sevLabel || row.severity, appearance: severityAppearance(row.severity) }
    : null;
  const issue: CanonicalBoardIssue = {
    id: row.id,
    issueKey: row.incident_key,
    summary: row.title,
    issueType: 'Production Incident',
    priority: row.priority || 'P4',
    status: row.status,
    statusCategory: statusCategory(row.status),
    assigneeName: row.assignee_name,
    labels: [],
    sprintName: null,
    storyPoints: null,
    parentKey: row.parent_key,
    parentSummary: row.parent_summary,
    fixVersion: null,
    // Breach uses the flag slot so a small red flag indicator appears on
    // the card edge — the canonical "something is wrong" affordance.
    isFlagged: row.resolution_breached,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    primaryLozenge: primary,
    secondaryLozenge: null,
    metaText: formatDueLabel(row),
    raw: row,
  };
  return issue;
}

/* ═══════════════════════════════════════════════════════════════════════
   Icon resolver — prefer the Jira-hosted type icon; fall back to a red
   warning glyph so the board reads as "incident" even when icon URLs
   are missing.
   ═══════════════════════════════════════════════════════════════════════ */

export function resolveIncidentIcon(card: BoardIssue): ReactNode | null {
  const raw = (card as CanonicalBoardIssue).raw as IncidentHubRow | undefined;
  const iconUrl = raw?.type_icon_url ?? null;
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        width={14}
        height={14}
        style={{ display: 'block', flexShrink: 0 }}
      />
    );
  }
  return <AlertTriangle size={14} strokeWidth={2} style={{ color: '#FF5630' }} />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Filter + group-by schemas — shared with KanbanToolbar.
   ═══════════════════════════════════════════════════════════════════════ */

function uniqueSeverities(rows: IncidentHubRow[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.severity) continue;
    counts.set(r.severity, (counts.get(r.severity) ?? 0) + 1);
  }
  // Preserve SEV-1 → SEV-4 order.
  const preferred = ['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4'];
  const ordered = [
    ...preferred.filter(s => counts.has(s)),
    ...Array.from(counts.keys()).filter(s => !preferred.includes(s)).sort(),
  ];
  return {
    id: 'severity',
    label: 'Severity',
    options: ordered.map(id => ({ id, label: id, labelExtra: String(counts.get(id) ?? 0) })),
  };
}

function uniquePriorities(rows: IncidentHubRow[]): FilterCategory {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.priority) continue;
    counts.set(r.priority, (counts.get(r.priority) ?? 0) + 1);
  }
  const preferred = ['P1', 'P2', 'P3', 'P4'];
  const ordered = [
    ...preferred.filter(p => counts.has(p)),
    ...Array.from(counts.keys()).filter(p => !preferred.includes(p)).sort(),
  ];
  return {
    id: 'priority',
    label: 'Priority',
    options: ordered.map(id => ({ id, label: id, labelExtra: String(counts.get(id) ?? 0) })),
  };
}

function uniqueAssignees(rows: IncidentHubRow[], avatarsByName: Map<string, string>): FilterCategory {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.assignee_name) continue;
    counts.set(r.assignee_name, (counts.get(r.assignee_name) ?? 0) + 1);
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

function slaHealthCategory(): FilterCategory {
  return {
    id: 'sla',
    label: 'SLA',
    options: [
      { id: 'breached', label: 'Breached' },
      { id: 'at_risk',  label: 'At risk' },
      { id: 'healthy',  label: 'Healthy' },
    ],
  };
}

export function buildIncidentHubFilterCategories(
  rows: IncidentHubRow[],
  avatarsByName: Map<string, string>,
): FilterCategory[] {
  return [
    uniqueSeverities(rows),
    uniquePriorities(rows),
    slaHealthCategory(),
    uniqueAssignees(rows, avatarsByName),
  ];
}

/* ═══ Group-by options — the 4 facets natural to incident triage. ═══ */
export const INCIDENTHUB_GROUP_OPTIONS: GroupByOption<string>[] = [
  { key: 'none',     label: 'None' },
  { key: 'severity', label: 'Severity' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
];

/* ═══════════════════════════════════════════════════════════════════════
   Adapter builder.
   ═══════════════════════════════════════════════════════════════════════ */

export interface BuildIncidentHubAdapterArgs {
  /** Full unfiltered list from useIncidentListView. */
  incidents: IncidentHubRow[];
  /** `displayName`.toLowerCase() → avatar URL. */
  avatarsByName: Map<string, string>;

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

  /* ── Behaviour ── */
  /**
   * Called when a user drops a card into a new column. IncidentHub data
   * is Jira-sourced and read-only, so the hosting page wires this to a
   * toast + refetch — NOT a Supabase update. The adapter does not try
   * to enforce read-only semantics itself; it only delegates.
   */
  onDropAttempt: (cardId: string, destColId: string) => void;
  onCardClick?: (cardId: string) => void;
  onCreate?: () => void;
}

export function buildIncidentHubBoardAdapter(
  args: BuildIncidentHubAdapterArgs,
): BoardAdapter<IncidentHubRow> {
  const {
    incidents, avatarsByName,
    search, onSearchChange,
    selAssignees, onSelAssigneesChange,
    filterSelected, onFilterChange, onClearFilters,
    groupBy, onGroupByChange,
    onDropAttempt,
    onCardClick,
    onCreate,
  } = args;

  /* Filtered cards — mirrors the facets declared in filter categories. */
  const filtered = incidents.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.title.toLowerCase().includes(q) &&
        !r.incident_key.toLowerCase().includes(q)
      ) return false;
    }
    if (selAssignees.size > 0) {
      if (!r.assignee_name || !selAssignees.has(r.assignee_name)) return false;
    }
    const sevs = filterSelected.severity ?? [];
    if (sevs.length > 0 && !sevs.includes(r.severity)) return false;
    const prios = filterSelected.priority ?? [];
    if (prios.length > 0 && !prios.includes(r.priority)) return false;
    const slas = filterSelected.sla ?? [];
    if (slas.length > 0) {
      const breached = r.resolution_breached;
      const atRisk = !breached && r.due_date
        ? (new Date(r.due_date).getTime() - Date.now()) < 24 * 3_600_000
        : false;
      const health = breached ? 'breached' : atRisk ? 'at_risk' : 'healthy';
      if (!slas.includes(health)) return false;
    }
    const assignees = filterSelected.assignee ?? [];
    if (assignees.length > 0 && (!r.assignee_name || !assignees.includes(r.assignee_name))) return false;
    return true;
  });

  const cards: CanonicalBoardIssue[] = filtered.map(incidentToCanonicalIssue);

  const allAssignees = Array.from(
    incidents.reduce((map, r) => {
      if (!r.assignee_name) return map;
      map.set(r.assignee_name, (map.get(r.assignee_name) ?? 0) + 1);
      return map;
    }, new Map<string, number>()).entries(),
  )
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  const persistence: BoardPersistence = {
    onDrop: (event) => {
      if (event.destColId !== event.sourceColId) {
        onDropAttempt(event.cardId, event.destColId);
      }
    },
  };

  const interactions: BoardInteractions = {
    onCardClick,
  };

  return {
    name: 'incidenthub',
    contextKey: 'incidenthub',

    cards,
    columns: INCIDENTHUB_BOARD_COLUMNS,
    statusToColumnId: incidentHubStatusToColumnId,
    columnIdToStatus: incidentHubColumnIdToStatus,
    fromHubRow: incidentToCanonicalIssue,

    filterCategories: buildIncidentHubFilterCategories(incidents, avatarsByName),
    filterSelected,
    onFilterChange,
    onClearFilters,

    groupByOptions: INCIDENTHUB_GROUP_OPTIONS,
    groupBy,
    onGroupByChange,
    groupByNoneKey: 'none',

    allAssignees,
    selAssignees,
    onSelAssigneesChange,
    avatarsByName,

    search,
    onSearchChange,

    persistence,
    interactions,

    resolveIcon: resolveIncidentIcon,
    createLabel: 'New incident',
    onCreate,
  };
}
