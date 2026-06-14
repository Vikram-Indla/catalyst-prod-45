/**
 * WorkItemStatusLozenge — Jira-parity status pill for cards/rows/columns.
 *
 * Color category sourced directly from ph_issues.status_category (Supabase DB),
 * which is authoritative and updated by the workflow admin at /admin/workflows.
 * No legacy WorkflowProvider dependency.
 */
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import type { WorkItem } from '../../types/workItem.types';

type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'new' | 'moved';

function categoryToAppearance(statusCategory: string | null | undefined): LozengeAppearance {
  if (statusCategory === 'in_progress') return 'inprogress';
  if (statusCategory === 'done') return 'success';
  return 'default';
}

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
  const isBoldEffective = variant === 'bold' && appearance !== 'default';

  return (
    <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
      <Lozenge
        appearance={appearance}
        isBold={isBoldEffective}
        maxWidth={maxWidth}
      >
        {displayName}
      </Lozenge>
    </span>
  );
}
