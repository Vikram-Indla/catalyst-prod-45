/**
 * StatusCell — Colored lozenge button with ▼ chevron
 * Jira parity: green=done, blue=inprogress, grey=todo, button trigger
 */
import React from 'react';

function getStatusClass(category: string): string {
  const cat = category?.toLowerCase() || '';
  if (cat === 'done') return 'sp-status-btn--done';
  if (cat === 'in_progress' || cat === 'inprogress' || cat === 'indeterminate') return 'sp-status-btn--inprogress';
  return 'sp-status-btn--todo';
}

interface StatusCellProps {
  status: string;
  statusCategory: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const StatusCell = React.memo(function StatusCell({ status, statusCategory, onClick }: StatusCellProps) {
  return (
    <button
      className={`sp-status-btn ${getStatusClass(statusCategory)}`}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      aria-label={`${status} - Change status`}
      type="button"
    >
      <span>{status}</span>
      <span className="sp-status-chevron">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M2.5 3.5L5 6.5L7.5 3.5" />
        </svg>
      </span>
    </button>
  );
});
