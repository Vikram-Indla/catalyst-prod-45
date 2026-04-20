/**
 * IncidentHub → CatalystKanban adapter.
 *
 * Maps rows from `useIncidentListView` (a flattened projection over
 * `ph_issues` where issue_type = 'Production Incident') into the
 * canonical `KanbanCardData` shape. Owns the incident column lifecycle,
 * filter schema, group-by swimlanes and sort options.
 *
 * Status mutations: the underlying data model is Jira-derived — a single
 * bucket (e.g. "resolved") covers many Jira statuses (Done, Closed,
 * Resolved). We don't currently have a canonical Jira-status-per-bucket
 * map for incident write-back, so this adapter ships as READ-ONLY. The
 * host page omits `onStatusChange`; dragging is still enabled by the
 * primitive but no-ops on drop. When a canonical write-back is agreed,
 * add it here and wire `ph_issues.status` update in the host.
 */
import type { KanbanCardData, KanbanFilterFieldDef, KanbanGroupByOption, KanbanSortOption } from '../catalyst-types';
import type { KanbanColumnDef } from '../kanban-tokens';

/* ═════ Row shape — matches useIncidentListView's projection. ═════ */
export interface IncidentRow {
  id: string;
  incident_key: string;
  title: string;
  description: string | null;
  severity: string;          // SEV-1..SEV-4
  priority: string;          // P1..P4
  status: string;            // triage | open | in_progress | to_committee | resolved
  jira_status: string;
  project_name: string;
  assignee_name: string | null;
  reporter_name: string | null;
  created_at: string;
  updated_at: string | null;
  resolution_breached: boolean;
  resolution_due_at: string | null;
  type_icon_url: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  labels: unknown;
  due_date: string | null;
}

/* ═════ Columns — one bucket per normalised incident status. ═════ */
export const INCIDENTHUB_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-triage',       name: 'TRIAGE',       category: 'todo',        statuses: ['triage'] },
  { id: 'col-open',         name: 'OPEN',         category: 'todo',        statuses: ['open'] },
  { id: 'col-in-progress',  name: 'IN PROGRESS',  category: 'in_progress', statuses: ['in_progress'] },
  { id: 'col-committee',    name: 'COMMITTEE',    category: 'in_progress', statuses: ['to_committee'] },
  { id: 'col-resolved',     name: 'RESOLVED',     category: 'done',        statuses: ['resolved'] },
];

const STATUS_TO_COL = new Map<string, string>();
INCIDENTHUB_COLUMNS.forEach(col => col.statuses.forEach(s => STATUS_TO_COL.set(s, col.id)));

export function incidentStatusToColumnId(status: string): string | null {
  return STATUS_TO_COL.get(status) ?? null;
}

export function incidentColumnIdToStatus(columnId: string): string | null {
  const col = INCIDENTHUB_COLUMNS.find(c => c.id === columnId);
  return col?.statuses[0] ?? null;
}

/* ═════ Severity → Atlaskit lozenge appearance. ═════ */
type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'moved' | 'new' | 'removed';

function severityAppearance(sev: string): LozengeAppearance {
  const key = (sev || '').toUpperCase().replace('-', '');
  switch (key) {
    case 'SEV1': return 'removed';     // red
    case 'SEV2': return 'moved';       // amber
    case 'SEV3': return 'inprogress';  // blue
    default:     return 'default';     // grey
  }
}

/* ═════ Card adapter. ═════ */
export function incidentToKanbanCard(row: IncidentRow): KanbanCardData {
  const category: KanbanCardData['statusCategory'] =
    row.status === 'resolved' ? 'done'
    : (row.status === 'in_progress' || row.status === 'to_committee') ? 'in_progress'
    : 'todo';

  return {
    id: row.id,
    key: row.incident_key,
    title: row.title,
    type: 'Incident',
    priority: row.priority === 'P1' ? 'Highest'
      : row.priority === 'P2' ? 'High'
      : row.priority === 'P3' ? 'Medium'
      : 'Low',
    status: row.status,
    statusCategory: category,
    assigneeName: row.assignee_name,
    flagged: row.resolution_breached,
    primaryLozenge: { label: row.severity, appearance: severityAppearance(row.severity) },
    secondaryLozenge: row.project_name ? { label: row.project_name, appearance: 'default' } : null,
    metaText: row.resolution_breached ? 'SLA breached' : null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    raw: row,
  };
}

/* ═════ Filter schema. ═════ */
function uniqueCounted(cards: readonly KanbanCardData[], pick: (raw: IncidentRow) => string | null | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const v = pick(c.raw as IncidentRow);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

export const INCIDENTHUB_FILTER_FIELDS: KanbanFilterFieldDef[] = [
  {
    id: 'severity',
    label: 'Severity',
    width: 200,
    getOptions: (cards) => {
      const counts = uniqueCounted(cards, (r) => r.severity);
      return ['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4']
        .filter(s => counts.has(s))
        .map(value => ({ value, label: value, count: counts.get(value) }));
    },
    matches: (card, selected) =>
      selected.length === 0 || selected.includes((card.raw as IncidentRow).severity),
  },
  {
    id: 'project',
    label: 'Project',
    width: 240,
    getOptions: (cards) => {
      const counts = uniqueCounted(cards, (r) => r.project_name);
      return Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, label: value, count }));
    },
    matches: (card, selected) =>
      selected.length === 0 || selected.includes((card.raw as IncidentRow).project_name),
  },
  {
    id: 'priority',
    label: 'Priority',
    width: 180,
    getOptions: () => [
      { value: 'P1', label: 'P1 – Highest' },
      { value: 'P2', label: 'P2 – High' },
      { value: 'P3', label: 'P3 – Medium' },
      { value: 'P4', label: 'P4 – Low' },
    ],
    matches: (card, selected) =>
      selected.length === 0 || selected.includes((card.raw as IncidentRow).priority),
  },
  {
    id: 'breached',
    label: 'SLA',
    width: 180,
    getOptions: () => [
      { value: 'breached',   label: 'Breached' },
      { value: 'on-track',   label: 'On track' },
    ],
    matches: (card, selected) => {
      if (selected.length === 0) return true;
      const breached = (card.raw as IncidentRow).resolution_breached;
      return (breached && selected.includes('breached')) || (!breached && selected.includes('on-track'));
    },
  },
];

/* ═════ Group-by options. ═════ */
export const INCIDENTHUB_GROUP_BY: KanbanGroupByOption[] = [
  { id: 'none', label: 'None', getKey: () => '__all__', getLabel: () => '' },
  {
    id: 'severity',
    label: 'Severity',
    getKey: (c) => (c.raw as IncidentRow).severity || '__none__',
    getLabel: (c) => (c.raw as IncidentRow).severity || 'No severity',
    compareBuckets: (a, b) => a.key.localeCompare(b.key),
  },
  {
    id: 'project',
    label: 'Project',
    getKey: (c) => (c.raw as IncidentRow).project_name || '__none__',
    getLabel: (c) => (c.raw as IncidentRow).project_name || 'No project',
    compareBuckets: (a, b) => a.label.localeCompare(b.label),
  },
  {
    id: 'assignee',
    label: 'Assignee',
    getKey: (c) => c.assigneeName ?? '__unassigned__',
    getLabel: (c) => c.assigneeName ?? 'Unassigned',
    compareBuckets: (a, b) => (a.key === '__unassigned__' ? 1 : b.key === '__unassigned__' ? -1 : a.label.localeCompare(b.label)),
  },
];

/* ═════ Sort options. ═════ */
export const INCIDENTHUB_SORT: KanbanSortOption[] = [
  {
    id: 'created-desc',
    label: 'Newest first',
    compare: (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  },
  {
    id: 'severity',
    label: 'Severity (high → low)',
    compare: (a, b) => {
      const sa = (a.raw as IncidentRow).severity;
      const sb = (b.raw as IncidentRow).severity;
      return (sa || 'SEV-9').localeCompare(sb || 'SEV-9');
    },
  },
  {
    id: 'breached-first',
    label: 'Breached first',
    compare: (a, b) => {
      const ab = (a.raw as IncidentRow).resolution_breached ? 0 : 1;
      const bb = (b.raw as IncidentRow).resolution_breached ? 0 : 1;
      return ab - bb;
    },
  },
  {
    id: 'title',
    label: 'Title (A–Z)',
    compare: (a, b) => a.title.localeCompare(b.title),
  },
];
