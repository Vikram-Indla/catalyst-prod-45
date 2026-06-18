/**
 * Release BoardAdapter — Phase 6.
 *
 * Mounts the Releases board view (toggle on /release-hub/releases) onto the
 * canonical BoardAdapter contract consumed by KanbanBoardShell — the same
 * project-module board the Project / Incident / Portfolio hubs use. No new
 * board, card, or column primitive: release rows are adapted to
 * CanonicalBoardIssue, columns are the 9 release-lifecycle stages.
 *
 *   summary       ← release.name
 *   issueKey      ← release.jira_key | ''
 *   issueType     ← 'Release' (Rocket icon via resolveIcon)
 *   status        ← release.status (lifecycle stage; legacy aliases routed)
 *   primaryLoz.   ← health (at_risk red / on_track blue / done green)
 *   secondaryLoz. ← target environment
 *   metaText      ← target date + change count
 *   raw           ← original release row
 */
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { Rocket } from '@/lib/atlaskit-icons';
import type { KanbanColumnDef } from '../kanban-tokens';
import type { BoardIssue } from '../kanban-types';
import type {
  BoardAdapter,
  CanonicalBoardIssue,
  BoardPersistence,
  BoardInteractions,
  BoardLozenge,
} from './BoardAdapter';
import type { ReleaseListRow } from '@/hooks/useReleaseHub';

export const RELEASE_BOARD_COLUMNS: KanbanColumnDef[] = [
  { id: 'col-draft',          name: 'DRAFT',               category: 'todo',        statuses: ['draft', 'todo'] },
  { id: 'col-planned',        name: 'PLANNED',             category: 'todo',        statuses: ['planned', 'planning'] },
  { id: 'col-readiness',      name: 'IN READINESS',        category: 'todo',        statuses: ['in_readiness'] },
  { id: 'col-ready-signoff',  name: 'READY FOR SIGN-OFF',  category: 'in_progress', statuses: ['ready_for_signoff'] },
  { id: 'col-approved',       name: 'APPROVED',            category: 'in_progress', statuses: ['approved'] },
  { id: 'col-scheduled',      name: 'SCHEDULED',           category: 'in_progress', statuses: ['scheduled'] },
  { id: 'col-deploying',      name: 'DEPLOYING',           category: 'in_progress', statuses: ['deploying', 'in_progress'] },
  { id: 'col-monitoring',     name: 'MONITORING',          category: 'in_progress', statuses: ['monitoring'] },
  { id: 'col-completed',      name: 'COMPLETED',           category: 'done',        statuses: ['completed', 'released', 'done'] },
];

const STATUS_TO_COL = new Map<string, string>();
RELEASE_BOARD_COLUMNS.forEach((col) => col.statuses.forEach((s) => STATUS_TO_COL.set(s, col.id)));

export function releaseStatusToColumnId(status: string): string | null {
  return STATUS_TO_COL.get(status) ?? null;
}
export function releaseColumnIdToStatus(columnId: string): string | null {
  const col = RELEASE_BOARD_COLUMNS.find((c) => c.id === columnId);
  return col?.statuses[0] ?? null;
}

function statusCategory(status: string): 'todo' | 'in_progress' | 'done' {
  if (['completed', 'released', 'done'].includes(status)) return 'done';
  if (['draft', 'todo', 'planned', 'planning', 'in_readiness'].includes(status)) return 'todo';
  return 'in_progress';
}

function healthLozenge(health: string | null): BoardLozenge | null {
  if (!health) return null;
  const appearance: BoardLozenge['appearance'] =
    health === 'at_risk' ? 'removed' : health === 'done' ? 'success' : 'inprogress';
  const label = health.replace(/_/g, ' ');
  return { label, appearance };
}

function metaFor(row: ReleaseListRow): string | null {
  const d = row.planned_release_date ?? row.target_date;
  const parts: string[] = [];
  if (d) {
    try { parts.push(format(new Date(d), 'MMM d')); } catch { /* ignore */ }
  }
  if (row.changeCount > 0) parts.push(`${row.changeCount} ${row.changeCount === 1 ? 'change' : 'changes'}`);
  return parts.length ? parts.join(' · ') : null;
}

export function releaseToCanonicalIssue(row: ReleaseListRow): CanonicalBoardIssue {
  return {
    id: row.id,
    issueKey: row.jira_key ?? '',
    summary: row.name,
    issueType: 'Release',
    priority: 'P4',
    status: row.status,
    statusCategory: statusCategory(row.status),
    assigneeName: null,
    labels: [],
    sprintName: null,
    storyPoints: null,
    parentKey: null,
    parentSummary: null,
    fixVersion: row.version ?? null,
    isFlagged: row.health === 'at_risk',
    updatedAt: row.updated_at,
    createdAt: null,
    primaryLozenge: healthLozenge(row.health),
    secondaryLozenge: row.target_env ? { label: row.target_env, appearance: 'default' } : null,
    metaText: metaFor(row),
    raw: row,
  };
}

export function resolveReleaseIcon(_card: BoardIssue): ReactNode {
  return <Rocket size={14} strokeWidth={2} style={{ color: 'var(--ds-icon-subtle, #626F86)' }} />;
}

export interface BuildReleaseBoardAdapterArgs {
  releases: ReleaseListRow[];
  search: string;
  onSearchChange: (v: string) => void;
  onCardClick?: (cardId: string) => void;
  onCreate?: () => void;
  /** Persist a release status change after a drag between columns. */
  onStatusChange?: (cardId: string, newStatus: string) => void | Promise<void>;
}

export function buildReleaseBoardAdapter(args: BuildReleaseBoardAdapterArgs): BoardAdapter<ReleaseListRow> {
  const { releases, search, onSearchChange, onCardClick, onCreate, onStatusChange } = args;

  const filtered = releases.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${r.name} ${r.version ?? ''} ${r.jira_key ?? ''}`.toLowerCase().includes(q);
  });

  const cards: CanonicalBoardIssue[] = filtered.map(releaseToCanonicalIssue);

  const persistence: BoardPersistence = {
    onDrop: (event) => {
      if (event.destColId !== event.sourceColId) {
        const next = releaseColumnIdToStatus(event.destColId);
        if (next && onStatusChange) onStatusChange(event.cardId, next);
      }
    },
  };

  const interactions: BoardInteractions = { onCardClick };

  return {
    name: 'release-ops',
    contextKey: 'release-ops',

    cards,
    columns: RELEASE_BOARD_COLUMNS,
    statusToColumnId: releaseStatusToColumnId,
    columnIdToStatus: releaseColumnIdToStatus,
    fromHubRow: releaseToCanonicalIssue,

    filterCategories: [],
    filterSelected: {},
    onFilterChange: () => {},
    onClearFilters: () => {},

    groupByOptions: [{ key: 'none', label: 'None' }],
    groupBy: 'none',
    onGroupByChange: () => {},
    groupByNoneKey: 'none',

    allAssignees: [],
    selAssignees: new Set<string>(),
    onSelAssigneesChange: () => {},
    avatarsByName: new Map<string, string>(),

    search,
    onSearchChange,

    persistence,
    interactions,

    resolveIcon: resolveReleaseIcon,
    createLabel: 'New release',
    onCreate,
  };
}
