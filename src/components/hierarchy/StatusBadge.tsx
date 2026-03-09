/**
 * StatusBadge — 3-color Jira/Atlassian lozenge system
 * GREY (#DFE1E6) = not started / waiting
 * BLUE (#DEEBFF) = in progress / active
 * GREEN (#E3FCEF) = done / resolved
 */

import React from 'react';

type StatusCategory = 'grey' | 'blue' | 'green';

const STATUS_CATEGORY_MAP: Record<string, StatusCategory> = {
  'Backlog': 'grey',
  'To Do': 'grey',
  'Todo': 'grey',
  'Ready for QA': 'grey',
  'Ready For QA': 'grey',
  'Awaiting Info': 'grey',
  'Awaiting Information': 'grey',
  'AWAITING INFO': 'grey',
  'Blocked': 'grey',
  'Deferred': 'grey',
  'Deferred for INT': 'grey',
  'Portfolio Review': 'grey',
  'In Requirements': 'grey',
  'On Hold': 'grey',
  'Reopened': 'grey',
  'New': 'grey',

  'In Progress': 'blue',
  'In Development': 'blue',
  'In Review': 'blue',
  'In QA': 'blue',
  'In UAT': 'blue',
  'UAT Ready': 'blue',
  'UAT READY': 'blue',
  'In BETA': 'blue',
  'Beta Ready': 'blue',
  'In Testing': 'blue',
  'Code Review': 'blue',
  'In Analysis': 'blue',
  'In Design': 'blue',
  'Selected for Development': 'blue',

  'Done': 'green',
  'Closed': 'green',
  'Resolved': 'green',
  'RESOLVED': 'green',
  'Ready for Production': 'green',
  'In Production': 'green',
  'Released': 'green',
  'Verified': 'green',
  'Accepted': 'green',
  'Deployed': 'green',
};

const STATUS_STYLES: Record<StatusCategory, { background: string; color: string }> = {
  grey:  { background: '#DFE1E6', color: '#42526E' },
  blue:  { background: '#DEEBFF', color: '#0747A6' },
  green: { background: '#E3FCEF', color: '#006644' },
};

export function getStatusCategory(status: string): StatusCategory {
  return STATUS_CATEGORY_MAP[status] || 'grey';
}

export function getStatusStyle(status: string) {
  return STATUS_STYLES[getStatusCategory(status)];
}

/** @deprecated Use getStatusStyle instead */
export const STATUS_COLORS: Record<string, string> = {};
/** @deprecated Use getStatusStyle instead */
export function getStatusColor(status: string): string {
  return getStatusStyle(status).background;
}

interface StatusBadgeProps {
  status: string;
  onClick?: (e: React.MouseEvent) => void;
  mini?: boolean;
}

export function StatusBadge({ status, onClick, mini = false }: StatusBadgeProps) {
  const style = getStatusStyle(status);
  const h = mini ? 20 : 24;

  return (
    <button
      onClick={onClick}
      style={{
        height: h,
        padding: mini ? '0 6px' : '0 8px',
        borderRadius: 3,
        background: style.background,
        color: style.color,
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: "'Inter', sans-serif",
        fontSize: mini ? 9 : 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap' as const,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {status}
      {onClick && !mini && <span style={{ opacity: 0.6, fontSize: 8, color: style.color }}>▾</span>}
    </button>
  );
}
