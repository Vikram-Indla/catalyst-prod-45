/**
 * StatusCell — Atlaskit-style status lozenge with editable popover.
 * 3-colour guardrail: grey (todo) · blue (in_progress) · green (done).
 */
import React from 'react';
import { StatusPopover } from '../popovers/StatusPopover';

function getStatusClass(category: string): string {
  const cat = category?.toLowerCase() || '';
  if (cat === 'done') return 'sp-status-btn--done';
  if (cat === 'in_progress' || cat === 'inprogress' || cat === 'indeterminate') return 'sp-status-btn--inprogress';
  return 'sp-status-btn--todo';
}

interface StatusCellProps {
  status: string;
  statusCategory: string;
  onChange?: (status: string, category: 'todo' | 'in_progress' | 'done') => void;
  readOnly?: boolean;
}

export const StatusCell = React.memo(function StatusCell({ status, statusCategory, onChange, readOnly }: StatusCellProps) {
  const trigger = (
    <button
      className={`sp-status-btn ${getStatusClass(statusCategory)}`}
      onClick={(e) => e.stopPropagation()}
      aria-label={`${status} — change status`}
      type="button"
      disabled={readOnly}
    >
      <span>{status}</span>
      {!readOnly && (
        <span className="sp-status-chevron" aria-hidden>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2.5 3.5L5 6.5L7.5 3.5" />
          </svg>
        </span>
      )}
    </button>
  );

  if (readOnly || !onChange) return trigger;

  return (
    <StatusPopover status={status} statusCategory={statusCategory} onChange={onChange}>
      {trigger}
    </StatusPopover>
  );
});
