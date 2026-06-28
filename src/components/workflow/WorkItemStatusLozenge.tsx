/**
 * WorkItemStatusLozenge — Jira-parity status pill for cards/rows/columns.
 *
 * Color category sourced directly from ph_issues.status_category (Supabase DB),
 * which is authoritative and updated by the workflow admin at /admin/workflows.
 * No legacy WorkflowProvider dependency.
 */
import React from 'react';
import type { WorkItem } from '../../types/workItem.types';
import { statusBg, statusFg, categoryToAppearance } from '@/components/catalyst-detail-views/shared/sections/statusPalette';

export interface WorkItemStatusLozengeProps {
  item: WorkItem;
  variant?: 'bold' | 'subtle';
  maxWidth?: number;
}

export function WorkItemStatusLozenge({ item, variant = 'bold', maxWidth }: WorkItemStatusLozengeProps) {
  return (
    <StatusLozengeByType
      statusName={item.statusName || item.status}
      statusCategory={item.statusCategory}
      variant={variant}
      maxWidth={maxWidth}
    />
  );
}

export interface StatusLozengeByTypeProps {
  /** Kept for call-site compat — no longer used for color lookup. */
  issueType?: string | undefined | null;
  /** Current status display name, e.g. "In Progress". */
  statusName: string | undefined | null;
  /** DB status_category from ph_issues: 'todo' | 'in_progress' | 'done'. */
  statusCategory?: 'todo' | 'in_progress' | 'done' | string | null;
  variant?: 'bold' | 'subtle';
  maxWidth?: number;
}

export function StatusLozengeByType({
  statusName,
  statusCategory,
  variant = 'bold',
  maxWidth,
}: StatusLozengeByTypeProps) {
  const displayName = statusName || '—';
  const appearance = categoryToAppearance(statusCategory);

  // Canonical status pill (statusPalette.ts). Was @atlaskit/lozenge whose bold
  // success rendered the dark var(--ds-background-success-bold)/white that diverged from the canonical
  // #94C748 pastel; unified 2026-06-17 with all other work-item status pills.
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: statusBg(appearance),
      borderRadius: 3,
      padding: '0 6px',
      height: 20,
      maxWidth: maxWidth ?? undefined,
    }}>
      <span style={{
        font: `653 11px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
        color: statusFg(appearance),
        textTransform: 'uppercase',
        letterSpacing: '0.165px',
        padding: '2px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {displayName}
      </span>
    </span>
  );
}
