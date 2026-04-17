/**
 * StatusCell — Atlaskit Lozenge + chevron, wrapped in StatusPopover for editing.
 *
 * CLAUDE.md §5 "3 colours only" guardrail:
 *   Only three of Atlaskit Lozenge's six appearances are ever rendered:
 *     todo         -> 'default'     (grey)
 *     in_progress  -> 'inprogress'  (blue)
 *     done         -> 'success'     (green)
 *   `removed`, `new`, `moved` are NEVER used. Any unknown category falls
 *   back to 'default'.
 */
import React from 'react';
import Lozenge from '@atlaskit/lozenge';
import { StatusPopover } from '../popovers/StatusPopover';

type AllowedAppearance = 'default' | 'inprogress' | 'success';

function categoryToAppearance(category: string): AllowedAppearance {
  const c = (category ?? '').toLowerCase();
  if (c === 'done') return 'success';
  if (c === 'in_progress' || c === 'inprogress' || c === 'indeterminate') {
    return 'inprogress';
  }
  return 'default';
}

interface StatusCellProps {
  status: string;
  statusCategory: string;
  onChange?: (status: string, category: 'todo' | 'in_progress' | 'done') => void;
  readOnly?: boolean;
}

export const StatusCell = React.memo(function StatusCell({
  status, statusCategory, onChange, readOnly,
}: StatusCellProps) {
  const appearance = categoryToAppearance(statusCategory);

  const trigger = (
    <button
      type="button"
      className="sp-status-btn-ak"
      onClick={(e) => e.stopPropagation()}
      aria-label={readOnly ? `Status ${status}` : `${status} — change status`}
      disabled={readOnly}
    >
      <Lozenge appearance={appearance} isBold>{status}</Lozenge>
      {!readOnly && (
        <span className="sp-status-chevron-ak" aria-hidden>
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
