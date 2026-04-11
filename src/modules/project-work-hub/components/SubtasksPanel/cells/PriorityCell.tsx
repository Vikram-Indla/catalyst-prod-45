/**
 * PriorityCell — Priority icon SVG + text label
 * Jira parity: icon + "Medium" text, NOT a colored dot
 */
import React from 'react';

const PRIORITY_ICONS: Record<string, { color: string; svg: React.ReactNode }> = {
  Highest: {
    color: '#CF2600',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 10L8 5L13 10" stroke="#CF2600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 14L8 9L13 14" stroke="#CF2600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  High: {
    color: '#E56910',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 12L8 7L13 12" stroke="#E56910" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  Medium: {
    color: '#EA9310',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 6H13" stroke="#EA9310" strokeWidth="2" strokeLinecap="round" />
        <path d="M3 10H13" stroke="#EA9310" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  Low: {
    color: '#1868DB',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 4L8 9L13 4" stroke="#1868DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  Lowest: {
    color: '#1868DB',
    svg: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2L8 7L13 2" stroke="#1868DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 6L8 11L13 6" stroke="#1868DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

interface PriorityCellProps {
  priority: string;
}

export const PriorityCell = React.memo(function PriorityCell({ priority }: PriorityCellProps) {
  const config = PRIORITY_ICONS[priority] ?? PRIORITY_ICONS.Medium;

  return (
    <div className="sp-priority-cell">
      <span className="sp-priority-icon">{config.svg}</span>
      <span className="sp-priority-label">{priority}</span>
    </div>
  );
});
