/**
 * StatusCell — Jira-exact status pill + chevron, wrapped in StatusPopover for editing.
 *
 * jira-compare 2026-05-17: Replaced @atlaskit/lozenge with a custom inline span that
 * uses exact Jira-measured hex colors (K.11). The ADS bold tokens for success/inprogress
 * render wrong colors (dark forest green / saturated blue) vs Jira's actual lime green /
 * medium blue. This matches the same statusBg logic in CatalystStatusPill.tsx.
 *
 * 3 colours only (Jira subtask panel uses only these three status categories):
 *   todo        → near-transparent grey  rgba(5,21,36,0.06)
 *   in_progress → medium blue            #669DF1
 *   done        → lime green             #94C748
 */
import React from 'react';
import { StatusPopover } from '../popovers/StatusPopover';

type AllowedAppearance = 'default' | 'inprogress' | 'success';

/** Jira-exact background/foreground per status category — matches CatalystStatusPill.tsx */
function statusBg(appearance: AllowedAppearance): { bg: string; fg: string } {
  const fg = '#292A2E'; // universal dark text — same for all Jira status pills
  switch (appearance) {
    case 'success':    return { bg: '#94C748',                fg }; // Done — lime green
    case 'inprogress': return { bg: '#669DF1',                fg }; // In Progress — medium blue
    default:           return { bg: 'rgba(5, 21, 36, 0.06)', fg }; // To Do — near-transparent
  }
}

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
  const { bg, fg } = statusBg(appearance);

  const trigger = (
    <button
      type="button"
      className="sp-status-btn-ak"
      // No stopPropagation here — StatusPopover's wrapper span handles
      // both setIsOpen toggle AND stopPropagation (row-navigation guard).
      // Stopping here prevented the span's onClick from firing (T03 bug).
      aria-label={readOnly ? `Status ${status}` : `${status} — change status`}
      disabled={readOnly}
    >
      {/* jira-compare 2026-05-17: custom pill with exact Jira hex colors (K.11).
          @atlaskit/lozenge bold tokens don't match Jira's actual status category
          colors. Matches CatalystStatusPill.tsx statusBg pattern. */}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 6px',
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: '16px',
        letterSpacing: '0.165px',
        textTransform: 'uppercase',
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
        maxWidth: 100,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {status}
      </span>
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
