/**
 * StatusCell — thin adapter around the canonical StatusLozengeDropdown.
 *
 * Previously rendered a hand-rolled inline <span> with hex-coded Jira
 * colours and a custom SVG chevron, plus its own StatusPopover editor.
 * 2026-07-02: replaced with the canonical StatusLozengeDropdown used
 * across the detail view, sidebar, backlog list, kanban, etc. — one
 * canonical pill component + workflow, no forks.
 */
import React from 'react';
import { StatusLozengeDropdown } from '@/components/shared/StatusLozenge';

interface StatusCellProps {
  status: string;
  statusCategory: string;
  issueType?: string | null;
  onChange?: (status: string, category: 'todo' | 'in_progress' | 'done') => void;
  readOnly?: boolean;
}

function categoryFromCanonical(next: string): 'todo' | 'in_progress' | 'done' {
  const c = next.toLowerCase();
  if (c === 'done') return 'done';
  if (c === 'in progress' || c === 'inprogress' || c === 'in_progress' || c === 'indeterminate') {
    return 'in_progress';
  }
  return 'todo';
}

export const StatusCell = React.memo(function StatusCell({
  status, statusCategory, issueType, onChange, readOnly,
}: StatusCellProps) {
  return (
    <StatusLozengeDropdown
      status={status}
      statusCategory={statusCategory}
      issueType={issueType}
      interactive={!readOnly}
      size="sm"
      onStatusChange={(newStatus) => {
        onChange?.(newStatus, categoryFromCanonical(newStatus));
      }}
    />
  );
});
