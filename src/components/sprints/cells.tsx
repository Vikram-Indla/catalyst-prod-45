/**
 * Sprint list cell factories (CAT-SPRINTS-NATIVE-20260702-002 S1.1a).
 *
 * JiraTable-shaped consumer code (Column<SprintRow> factories) per the
 * canonical table's design — composed from ADS primitives (@atlaskit/lozenge,
 * @atlaskit/dropdown-menu) + CatalystAvatar. Colors are component-owned or
 * ADS tokens only. Zero-assumption: unknown status/dates render a dash.
 *
 * Typography: cell text takes its size from JiraTable's own cell wrapper
 * (d.cellFontSize, --ds-font-size-400/14px body scale — src/styles/theme-
 * tokens.css). Cells must NOT set their own fontSize unless the text is
 * deliberately a smaller secondary label (e.g. the progress fraction below
 * uses --ds-font-size-200/12px "small — secondary labels" on purpose). No
 * var(--ds-*, <px fallback>) — token-only, no fallback (CLAUDE.md ADS rule).
 */
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import MoreIcon from '@atlaskit/icon/core/show-more-horizontal';
import type { Column, CellProps } from '@/components/shared/JiraTable/types';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import { ToolbarMenuButton } from '@/components/shared/JiraTable';
import {
  isSprintStatus,
  SPRINT_STATUS_LABEL,
  SPRINT_STATUS_LOZENGE,
} from '@/lib/sprints/sprintStatus';

/** Raw sprint row — native status vocabulary, no bucket mapping. */
export interface SprintRow {
  id: string;
  slug: string | null;
  project_id: string;
  name: string;
  description?: string | null;
  status: string | null;
  start_date?: string | null;
  end_date?: string | null;
  release_date?: string | null;
  length_weeks?: number | null;
  created_by?: string | null;
  release_id?: string | null;
}

export interface LinkedRelease {
  name: string;
  date: string | null;
}

export interface SprintProgress {
  done: number;
  inProgress: number;
  toDo: number;
  total: number;
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const TERMINAL = new Set(['completed', 'canceled', 'archived']);

// ── Sprint (name link + 1W/2W lozenge) ──────────────────────────────────────
export function makeSprintNameCell(
  onOpenDetail: (row: SprintRow) => void,
): Column<SprintRow> {
  return {
    id: 'sprint',
    label: 'Sprint',
    /* Fixed 30 units (360px), not flex: JiraTable reserves a 640px sum-floor
     * for flex columns, which pushed the trailing Release/Owner columns past
     * the viewport edge (header rendered as "O…"). */
    width: 30,
    alwaysVisible: true,
    cell: ({ row }: CellProps<SprintRow>) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <a
          href={`#`}
          onClick={(e) => { e.preventDefault(); onOpenDetail(row); }}
          style={{
            color: 'var(--ds-link)',
            fontWeight: 500,
            textDecoration: 'none',
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.name}
        </a>
        {(row.length_weeks === 1 || row.length_weeks === 2) && (
          <Lozenge appearance="new" isBold={false}>
            {row.length_weeks === 2 ? '2W' : '1W'}
          </Lozenge>
        )}
      </span>
    ),
  };
}

// ── Status (native vocabulary pill; unknown → dash) ─────────────────────────
export function makeSprintStatusCell(): Column<SprintRow> {
  return {
    id: 'status',
    label: 'Status',
    width: 10,
    cell: ({ row }: CellProps<SprintRow>) => {
      if (!isSprintStatus(row.status)) return <>—</>;
      return (
        <Lozenge appearance={SPRINT_STATUS_LOZENGE[row.status]} isBold={false}>
          {SPRINT_STATUS_LABEL[row.status].toUpperCase()}
        </Lozenge>
      );
    },
  };
}

// ── Progress (fraction + segmented bar by status category) ──────────────────
export function makeSprintProgressCell(
  getProgress: (row: SprintRow) => SprintProgress | null,
): Column<SprintRow> {
  return {
    id: 'progress',
    label: 'Progress',
    width: 12,
    cell: ({ row }: CellProps<SprintRow>) => {
      const p = getProgress(row);
      if (!p || !p.total) {
        return (
          <span style={{ color: 'var(--ds-text-subtlest)' }}>
            No work items
          </span>
        );
      }
      const donePct = Math.round((p.done / p.total) * 100);
      const inProgPct = Math.round((p.inProgress / p.total) * 100);
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              height: 8,
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: 'var(--ds-background-neutral)',
            }}
            title={`Done: ${p.done}, In progress: ${p.inProgress}, To do: ${p.toDo}`}
          >
            {donePct > 0 && (
              <div style={{ width: `${donePct}%`, backgroundColor: 'var(--ds-background-success-bold)' }} />
            )}
            {inProgPct > 0 && (
              <div style={{ width: `${inProgPct}%`, backgroundColor: 'var(--ds-background-information-bold)' }} />
            )}
          </div>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest)' }}>
            {p.done} of {p.total}
          </span>
        </div>
      );
    },
  };
}

// ── Start date ───────────────────────────────────────────────────────────────
export function makeSprintStartDateCell(): Column<SprintRow> {
  return {
    id: 'start_date',
    label: 'Start date',
    width: 10,
    cell: ({ row }: CellProps<SprintRow>) => (row.start_date ? <>{fmtDate(row.start_date)}</> : <>—</>),
  };
}

// ── Sprint end (danger text when overdue and not terminal) ──────────────────
export function makeSprintEndCell(): Column<SprintRow> {
  return {
    id: 'sprint_end',
    label: 'Sprint end',
    width: 10,
    cell: ({ row }: CellProps<SprintRow>) => {
      const end = row.end_date ?? row.release_date;
      if (!end) return <>—</>;
      const overdue =
        !TERMINAL.has(String(row.status)) &&
        new Date(`${end}T23:59:59`) < new Date();
      return (
        <span style={{ color: overdue ? 'var(--ds-text-danger)' : 'inherit' }}>
          {fmtDate(end)}
          {overdue && ' — Overdue'}
        </span>
      );
    },
  };
}

// ── Release (linked release name + date; dash when unlinked) ────────────────
export function makeSprintReleaseCell(
  getRelease: (row: SprintRow) => LinkedRelease | null,
): Column<SprintRow> {
  return {
    id: 'release',
    label: 'Release',
    width: 9,
    cell: ({ row }: CellProps<SprintRow>) => {
      const release = getRelease(row);
      if (!release) return <>—</>;
      return (
        <span title={release.date ? fmtDate(release.date) : undefined}>
          {release.name}
        </span>
      );
    },
  };
}

// ── Owner (creator avatar + name) ────────────────────────────────────────────
export function makeSprintOwnerCell(
  getOwner: (row: SprintRow) => { name: string | null; avatarUrl: string | null } | null,
): Column<SprintRow> {
  return {
    id: 'owner',
    label: 'Owner',
    /* 48px clipped the header to "O…" — 5 units (60px) fits the label. */
    width: 5,
    cell: ({ row }: CellProps<SprintRow>) => {
      const owner = getOwner(row);
      if (!owner || !owner.name) return <>—</>;
      // Icon contract: face avatar only, name via tooltip.
      return (
        <span style={{ display: 'inline-flex' }} title={owner.name}>
          <CatalystAvatar size="small" name={owner.name} src={owner.avatarUrl || undefined} />
        </span>
      );
    },
  };
}

// ── ⋯ actions (sprint verbs: Complete, not Release) ─────────────────────────
export interface SprintRowActions {
  onEdit: (row: SprintRow) => void;
  onComplete: (row: SprintRow) => void;
  onArchive: (row: SprintRow) => void;
  onDelete: (row: SprintRow) => void;
  onMerge?: (row: SprintRow) => void;
}

const actionsButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  border: 'none',
  background: 'transparent',
  borderRadius: 3,
  color: 'var(--ds-text-subtle)',
  cursor: 'pointer',
};

export function makeSprintActionsCell(actions: SprintRowActions): Column<SprintRow> {
  return {
    id: 'actions',
    label: '',
    width: 4,
    align: 'end',
    alwaysVisible: true,
    cell: ({ row }: CellProps<SprintRow>) => {
      const active = !TERMINAL.has(String(row.status));
      return (
        <ToolbarMenuButton
          icon={<MoreIcon label="" />}
          ariaLabel="Actions"
          tooltipContent="Actions"
          buttonStyle={actionsButtonStyle}
          groups={[
            {
              items: [
                ...(active
                  ? [{ id: 'complete', label: 'Complete sprint', onClick: () => actions.onComplete(row) }]
                  : []),
                { id: 'edit', label: 'Edit', onClick: () => actions.onEdit(row) },
                ...(actions.onMerge
                  ? [{ id: 'merge', label: 'Merge', onClick: () => actions.onMerge!(row) }]
                  : []),
                ...(!active
                  ? [{ id: 'delete', label: 'Delete', onClick: () => actions.onDelete(row) }]
                  : []),
              ],
            },
            {
              items: [
                { id: 'archive', label: 'Archive', onClick: () => actions.onArchive(row) },
              ],
            },
          ]}
        />
      );
    },
  };
}
