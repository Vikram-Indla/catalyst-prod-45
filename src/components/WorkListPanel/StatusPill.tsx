/**
 * StatusPill — Jira-measured status badge (F1.4)
 *
 * Displays status with exact Jira colors (from 2026-05-08 DOM probe):
 *   - todo/default: rgba(5,21,36,0.06) [light grey] + dark text
 *   - inprogress: #669DF1 [blue] + white text
 *   - done: #94C748 [green] + dark text
 *
 * Contract:
 *   - Renders status text (uppercase, 11px, 600 weight, letterSpacing)
 *   - Background color matches category
 *   - Text color has proper contrast
 *   - Compact size (suitable for table cells, row items)
 */
import React, { memo } from 'react';

export interface StatusPillProps {
  status: string;
  statusCategory: 'todo' | 'inprogress' | 'done' | 'default';
}

const categoryColors: Record<
  'todo' | 'inprogress' | 'done' | 'default',
  { bg: string; text: string }
> = {
  todo: {
    bg: 'rgba(5,21,36,0.06)',
    text: '#172B4D',
  },
  inprogress: {
    bg: '#669DF1',
    text: '#FFFFFF',
  },
  done: {
    bg: '#94C748',
    text: '#172B4D',
  },
  default: {
    bg: 'rgba(5,21,36,0.06)',
    text: '#172B4D',
  },
};

export const StatusPill = memo(function StatusPill({
  status,
  statusCategory,
}: StatusPillProps) {
  const colors = categoryColors[statusCategory];

  return (
    <span
      data-testid="status-pill"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px 6px',
        borderRadius: '3px',
        background: colors.bg,
        color: colors.text,
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.165px',
      }}
    >
      {status.toUpperCase()}
    </span>
  );
});
