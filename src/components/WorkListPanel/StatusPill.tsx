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
  statusCategory: 'todo' | 'inprogress' | 'done' | 'default' | 'removed' | 'success' | string;
}

const categoryColors: Record<
  'todo' | 'inprogress' | 'done' | 'default',
  { bg: string; text: string }
> = {
  todo: {
    bg: 'rgba(5,21,36,0.06)',
    text: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
  },
  inprogress: {
    // Jira DOM probe 2026-05-16: rgb(143,184,246) = #8FB8F6
    bg: '#8FB8F6',
    text: '#FFFFFF',
  },
  done: {
    // Jira DOM probe 2026-05-16: rgb(179,223,114) = #B3DF72
    bg: '#B3DF72',
    text: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
  },
  default: {
    bg: 'rgba(5,21,36,0.06)',
    text: 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))',
  },
};

export const StatusPill = memo(function StatusPill({
  status,
  statusCategory,
}: StatusPillProps) {
  const colors = categoryColors[statusCategory as keyof typeof categoryColors] ?? categoryColors.default;

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
