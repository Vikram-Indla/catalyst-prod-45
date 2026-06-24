import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import Button from '@atlaskit/button/new';
import ProgressBar from '@atlaskit/progress-bar';
import { Release, ReleaseStatus, ReleaseProgress } from '@/types/phase3-releases';
import { ActionsMenu } from './ActionsMenu';

// ── Release Name Cell (link to detail)
export function makeReleaseNameCell(
  getReleaseName: (row: Release) => string,
  onOpenDetail: (id: string) => void,
  getHref?: (id: string) => string
) {
  return {
    key: 'release_name',
    header: 'Release',
    width: 300,
    render: (row: Release) => {
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
            fontSize: 'var(--ds-font-size-100, 14px)',
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
export function makeStatusCell() {
  return {
    key: 'status',
    header: 'Status',
    width: 120,
    render: (row: Release) => {
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
) {
  return {
    key: 'progress',
    header: 'Progress',
    width: 200,
    render: (row: Release) => {
      const progress = calculateProgress(row);
      // No linked work items — match Jira's "No work items" empty state (no fabricated %).
      if (!progress || !progress.total) {
        return (
          <span style={{ fontSize: '14px', color: 'var(--ds-text-subtlest, #6B778C)' }}>
            No work items
          </span>
        );
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
                  backgroundColor: 'var(--ds-background-success-bold, #1F845A)', // done green
                }}
              />
            )}
            {inProgressPercent > 0 && (
              <div
                style={{
                  width: `${inProgressPercent}%`,
                  backgroundColor: 'var(--ds-background-information-bold, #1868DB)', // in-progress blue
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
export function makeStartDateCell() {
  return {
    key: 'start_date',
    header: 'Start date',
    width: 130,
    render: (row: Release) => {
      if (!row.start_date) return '—';
      return new Date(row.start_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    },
  };
}

// ── Release Date Cell (red if overdue)
export function makeReleaseDateCell() {
  return {
    key: 'release_date',
    header: 'Release date',
    width: 130,
    render: (row: Release) => {
      if (!row.release_date) return '—';

      const isOverdue =
        row.status === 'unreleased' && new Date(row.release_date) < new Date();
      const dateStr = new Date(row.release_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      return (
        <span style={{ color: isOverdue ? 'var(--ds-text-danger, #C9372C)' : 'inherit' }}>
          {dateStr}
          {isOverdue && ' — Overdue'}
        </span>
      );
    },
  };
}

// ── Description Cell (truncated)
export function makeDescriptionCell() {
  return {
    key: 'description',
    header: 'Description',
    width: 200,
    render: (row: Release) => {
      if (!row.description) return '—';
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
  onDelete: (release: Release) => void,
  onMerge?: (release: Release) => void
) {
  return {
    key: 'actions',
    header: '',
    width: 140,
    render: (row: Release) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
        {row.status === 'unreleased' && (
          <Button appearance="default" spacing="compact" onClick={() => onRelease(row)}>
            Release
          </Button>
        )}
        <ActionsMenu
          release={row}
          onEdit={onEdit}
          onArchive={onArchive}
          onRelease={onRelease}
          onDelete={onDelete}
          onMerge={onMerge}
        />
      </div>
    ),
  };
}
