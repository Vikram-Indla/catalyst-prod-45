import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';
import type { Column, CellProps } from '@/components/shared/JiraTable/types';
import { ActionsMenu } from './ActionsMenu';

// ── Release Name Cell (link to detail)
export function makeReleaseNameCell(
  getReleaseName: (row: Release) => string,
  onOpenDetail: (id: string) => void,
  getHref?: (id: string) => string
): Column<Release> {
  return {
    id: 'release_name',
    label: 'Release',
    width: 25,
    cell: ({ row }: CellProps<Release>) => {
      const name = getReleaseName(row);
      const href = getHref?.(row.id) || `#`;
      return (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onOpenDetail(row.id);
          }}
          style={{
            color: 'var(--ds-link, #0052CC)',
            fontWeight: 500,
            textDecoration: 'none',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          {name}
        </a>
      );
    },
  };
}

// ── Status Lozenge Cell
export function makeStatusCell(): Column<Release> {
  return {
    id: 'status',
    label: 'Status',
    width: 10,
    cell: ({ row }: CellProps<Release>) => {
      const appearanceMap: Record<ReleaseStatus, string> = {
        unreleased: 'inprogress',
        released: 'success',
        archived: 'default',
      };

      const isOverdue =
        row.status === 'unreleased' &&
        row.release_date &&
        new Date(row.release_date) < new Date();

      const status = isOverdue ? 'overdue' : row.status;
      const appearance = isOverdue ? 'removed' : appearanceMap[row.status];
      const label = isOverdue ? 'OVERDUE' : status.toUpperCase();

      return (
        <Lozenge appearance={appearance as any} isBold={false}>
          {label}
        </Lozenge>
      );
    },
  };
}

// ── Progress Bar Cell
export function makeProgressCell(
  calculateProgress: (row: Release) => ReleaseProgress | null
): Column<Release> {
  return {
    id: 'progress',
    label: 'Progress',
    width: 17,
    cell: ({ row }: CellProps<Release>) => {
      const progress = calculateProgress(row);
      if (!progress || !progress.total) {
        return <span style={{ color: 'var(--ds-text-subtlest, #6B778C)' }}>—</span>;
      }
      const donePercent = Math.round((progress.done / progress.total) * 100);
      const inProgressPercent = Math.round(
        (progress.inProgress / progress.total) * 100
      );

      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              height: '8px',
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: 'var(--ds-background-neutral, #F1F2F4)',
            }}
            title={`Done: ${progress.done}, In Progress: ${progress.inProgress}, To Do: ${progress.toDo}`}
          >
            {donePercent > 0 && (
              <div
                style={{
                  width: `${donePercent}%`,
                  backgroundColor: '#00875A',
                }}
              />
            )}
            {inProgressPercent > 0 && (
              <div
                style={{
                  width: `${inProgressPercent}%`,
                  backgroundColor: '#0052CC',
                }}
              />
            )}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--ds-text-subtlest, #6B778C)' }}>
            {donePercent}%
          </span>
        </div>
      );
    },
  };
}

// ── Start Date Cell
export function makeStartDateCell(): Column<Release> {
  return {
    id: 'start_date',
    label: 'Start date',
    width: 11,
    cell: ({ row }: CellProps<Release>) => {
      if (!row.start_date) return <>—</>;
      return (
        <>
          {new Date(row.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </>
      );
    },
  };
}

// ── Release Date Cell (red if overdue)
export function makeReleaseDateCell(): Column<Release> {
  return {
    id: 'release_date',
    label: 'Release date',
    width: 11,
    cell: ({ row }: CellProps<Release>) => {
      if (!row.release_date) return <>—</>;

      const isOverdue =
        row.status === 'unreleased' && new Date(row.release_date) < new Date();
      const dateStr = new Date(row.release_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      return (
        <span style={{ color: isOverdue ? '#DE350B' : 'inherit' }}>
          {dateStr}
          {isOverdue && ' — Overdue'}
        </span>
      );
    },
  };
}

// ── Description Cell (truncated)
export function makeDescriptionCell(): Column<Release> {
  return {
    id: 'description',
    label: 'Description',
    width: 17,
    flex: true,
    cell: ({ row }: CellProps<Release>) => {
      if (!row.description) return <>—</>;
      const truncated =
        row.description.length > 60
          ? row.description.substring(0, 60) + '…'
          : row.description;
      return <span title={row.description}>{truncated}</span>;
    },
  };
}

// ── Actions Menu Cell (kebab)
export function makeActionsCell(
  onEdit: (release: Release) => void,
  onArchive: (release: Release) => void,
  onRelease: (release: Release) => void,
  onDelete: (release: Release) => void
): Column<Release> {
  return {
    id: 'actions',
    label: '',
    width: 6,
    align: 'end',
    cell: ({ row }: CellProps<Release>) => (
      <ActionsMenu
        release={row}
        onEdit={onEdit}
        onArchive={onArchive}
        onRelease={onRelease}
        onDelete={onDelete}
      />
    ),
  };
}
