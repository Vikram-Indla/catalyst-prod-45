/**
 * ProductHub → CatalystKanban adapter.
 *
 * Maps `Initiative` rows (ph_initiatives / MDT backlog) into the
 * hub-agnostic `KanbanCardData` shape that CatalystKanban renders.
 * Column definitions live alongside the adapter so a single import
 * gives the host page the full wiring it needs.
 */
import type { KanbanCardData, KanbanFilterFieldDef, KanbanGroupByOption, KanbanSortOption } from '../catalyst-types';
import type { KanbanColumnDef } from '../kanban-tokens';
import type { Initiative, InitiativeStatus } from '@/types/initiative';
import { STATUS_DISPLAY } from '@/types/initiative';

/* ═════ Column lifecycle — ProductHub initiative states. ═════ */
export const PRODUCTHUB_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-new',            name: 'NEW',                   category: 'todo',        statuses: ['new'] },
  { id: 'col-portfolio',      name: 'PORTFOLIO REVIEW',      category: 'in_progress', statuses: ['portfolio_review'] },
  { id: 'col-technical',      name: 'TECHNICAL VALIDATION',  category: 'in_progress', statuses: ['technical_validation', 'analysis'] },
  { id: 'col-estimate',       name: 'ESTIMATE',              category: 'in_progress', statuses: ['estimate'] },
  { id: 'col-approved',       name: 'DEMAND APPROVED',       category: 'in_progress', statuses: ['demand_approved', 'ready_for_development'] },
  { id: 'col-implementing',   name: 'IN IMPLEMENTATION',     category: 'in_progress', statuses: ['under_implementation', 'implementation_review', 'in_support'] },
  { id: 'col-done',           name: 'DONE',                  category: 'done',        statuses: ['done', 'cancelled', 'on_hold'] },
];

const STATUS_TO_COL = new Map<string, string>();
PRODUCTHUB_COLUMNS.forEach(col => col.statuses.forEach(s => STATUS_TO_COL.set(s, col.id)));

export function producthubStatusToColumnId(status: string): string | null {
  return STATUS_TO_COL.get(status) ?? null;
}

export function producthubColumnIdToStatus(columnId: string): InitiativeStatus | null {
  const col = PRODUCTHUB_COLUMNS.find(c => c.id === columnId);
  return (col?.statuses[0] as InitiativeStatus) ?? null;
}

/* ═════ Priority mapping — initiative score band → Kanban priority word. ═════ */
function mapPriority(initiative: Initiative): string | null {
  const explicit = (initiative as { priority?: string | null }).priority;
  if (explicit) return explicit;
  const score = initiative.computed_score;
  if (score === null || score === undefined) return null;
  if (score >= 4.0) return 'High';
  if (score >= 3.0) return 'Medium';
  if (score >= 2.0) return 'Low';
  return 'Lowest';
}

/* ═════ Lozenges — primary = department, secondary = target quarter. ═════ */
function primaryLozenge(initiative: Initiative) {
  if (!initiative.department_name) return null;
  return { label: initiative.department_name, appearance: 'default' as const };
}

function secondaryLozenge(initiative: Initiative) {
  if (!initiative.target_quarter) return null;
  return { label: initiative.target_quarter, appearance: 'inprogress' as const };
}

/* ═════ Card adapter. ═════ */
export function initiativeToKanbanCard(initiative: Initiative): KanbanCardData {
  const statusEntry = STATUS_DISPLAY[initiative.status];
  const category: KanbanCardData['statusCategory'] =
    statusEntry?.lozenge === 'green' ? 'done'
    : statusEntry?.lozenge === 'blue' ? 'in_progress'
    : 'todo';

  return {
    id: initiative.id,
    key: initiative.initiative_key,
    title: initiative.title,
    type: initiative.initiative_type_key ?? 'initiative',
    priority: mapPriority(initiative),
    status: initiative.status,
    statusCategory: category,
    assigneeName: initiative.assignee_name,
    flagged: initiative.is_favorited,
    primaryLozenge: primaryLozenge(initiative),
    secondaryLozenge: secondaryLozenge(initiative),
    metaText: null,
    updatedAt: initiative.updated_at,
    createdAt: initiative.created_at,
    raw: initiative,
  };
}

/* ═════ Filter schema — ProductHub-specific. ═════ */
function uniqueCounted<T>(cards: readonly KanbanCardData[], pick: (raw: Initiative) => T | null | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const v = pick(c.raw as Initiative);
    if (v === null || v === undefined || v === '') continue;
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export const PRODUCTHUB_FILTER_FIELDS: KanbanFilterFieldDef[] = [
  {
    id: 'department',
    label: 'Department',
    width: 220,
    getOptions: (cards) => {
      const counts = uniqueCounted(cards, (i) => i.department_name);
      return Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, label: value, count }));
    },
    matches: (card, selected) => {
      const name = (card.raw as Initiative).department_name;
      return selected.length === 0 || (name !== null && selected.includes(name));
    },
  },
  {
    id: 'quarter',
    label: 'Quarter',
    width: 180,
    getOptions: (cards) => {
      const counts = uniqueCounted(cards, (i) => i.target_quarter);
      return Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, label: value, count }));
    },
    matches: (card, selected) => {
      const q = (card.raw as Initiative).target_quarter;
      return selected.length === 0 || (q !== null && selected.includes(q));
    },
  },
  {
    id: 'priority',
    label: 'Priority',
    width: 180,
    getOptions: () => [
      { value: 'High',   label: 'High' },
      { value: 'Medium', label: 'Medium' },
      { value: 'Low',    label: 'Low' },
      { value: 'Lowest', label: 'Rejected' },
    ],
    matches: (card, selected) => selected.length === 0 || (card.priority !== null && selected.includes(card.priority)),
  },
  {
    id: 'health',
    label: 'Health',
    width: 180,
    getOptions: (cards) => {
      const counts = uniqueCounted(cards, (i) => i.health_status);
      return Array.from(counts.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([value, count]) => ({ value, label: value, count }));
    },
    matches: (card, selected) => {
      const h = (card.raw as Initiative).health_status;
      return selected.length === 0 || (!!h && selected.includes(h));
    },
  },
];

/* ═════ Group-by options — the Hub declares its own swimlanes. ═════ */
export const PRODUCTHUB_GROUP_BY: KanbanGroupByOption[] = [
  {
    id: 'none',
    label: 'None',
    getKey: () => '__all__',
    getLabel: () => '',
  },
  {
    id: 'department',
    label: 'Department',
    getKey: (c) => (c.raw as Initiative).department_name ?? '__none__',
    getLabel: (c) => (c.raw as Initiative).department_name ?? 'No department',
    compareBuckets: (a, b) => (a.key === '__none__' ? 1 : b.key === '__none__' ? -1 : a.label.localeCompare(b.label)),
  },
  {
    id: 'quarter',
    label: 'Quarter',
    getKey: (c) => (c.raw as Initiative).target_quarter ?? '__none__',
    getLabel: (c) => (c.raw as Initiative).target_quarter ?? 'No quarter',
    compareBuckets: (a, b) => (a.key === '__none__' ? 1 : b.key === '__none__' ? -1 : a.label.localeCompare(b.label)),
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
export const PRODUCTHUB_SORT: KanbanSortOption[] = [
  {
    id: 'score',
    label: 'Priority score',
    compare: (a, b) => ((b.raw as Initiative).computed_score ?? -1) - ((a.raw as Initiative).computed_score ?? -1),
  },
  {
    id: 'title',
    label: 'Title (A–Z)',
    compare: (a, b) => a.title.localeCompare(b.title),
  },
  {
    id: 'created',
    label: 'Newest first',
    compare: (a, b) => {
      const av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bv - av;
    },
  },
  {
    id: 'target',
    label: 'Target date',
    compare: (a, b) => {
      const av = (a.raw as Initiative).target_complete;
      const bv = (b.raw as Initiative).target_complete;
      if (!av && !bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return new Date(av).getTime() - new Date(bv).getTime();
    },
  },
];
