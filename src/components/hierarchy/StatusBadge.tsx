/**
 * StatusBadge — V12 Pale Lozenge 3-colour guardrail (ABSOLUTE)
 * GREY  (#DFE1E6 bg, #253858 text) = not started / waiting
 * BLUE  (#DEEBFF bg, #0747A6 text) = in progress / active
 * GREEN (#E3FCEF bg, #006644 text) = done / resolved
 */

import React from 'react';
import { useTheme } from '@/hooks/useTheme';

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
  'Open': 'grey',
  'Cancelled': 'grey',

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
  'Active': 'blue',
  'Planning': 'blue',

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
  'Completed': 'green',
  'Approved': 'green',
  'Merged': 'green',
};

const STATUS_STYLES_LIGHT: Record<StatusCategory, { background: string; color: string }> = {
  grey:  { background: '#DFE1E6', color: '#253858' },
  blue:  { background: '#DEEBFF', color: '#0747A6' },
  green: { background: '#E3FCEF', color: '#006644' },
};

const STATUS_STYLES_DARK: Record<StatusCategory, { background: string; color: string }> = {
  grey:  { background: '#2E2E2E', color: '#A1A1A1' },
  blue:  { background: 'rgba(59,130,246,0.10)', color: '#7DB8FC' },
  green: { background: 'rgba(74,222,128,0.10)', color: '#4ADE80' },
};

const STATUS_DISPLAY_NAMES: Record<string, string> = {
  'Ready for Production': 'READY FOR PROD',
  'Ready For Production': 'READY FOR PROD',
  'Awaiting Information': 'AWAITING INFO',
  'Ready for QA': 'READY FOR QA',
};

export function getStatusCategory(status: string): StatusCategory {
  return STATUS_CATEGORY_MAP[status] || STATUS_CATEGORY_MAP[status.toUpperCase()] || 'grey';
}

export function getStatusStyle(status: string, dark?: boolean) {
  const styles = dark ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT;
  return styles[getStatusCategory(status)];
}

export function getStatusDisplayName(status: string): string {
  return STATUS_DISPLAY_NAMES[status] || status.toUpperCase();
}

/** @deprecated Use getStatusStyle instead */
export const STATUS_COLORS: Record<string, string> = {};
/** @deprecated Use getStatusStyle instead */
export function getStatusColor(status: string, dark?: boolean): string {
  return getStatusStyle(status, dark).background;
}

interface StatusBadgeProps {
  status: string;
  onClick?: (e: React.MouseEvent) => void;
  mini?: boolean;
}

export function StatusBadge({ status, onClick, mini = false }: StatusBadgeProps) {
  const { isDark } = useTheme();
  const style = getStatusStyle(status, isDark);
  const displayName = getStatusDisplayName(status);

  return (
    <button
      onClick={onClick}
      className="status-badge"
      style={{
        height: 20,
        padding: '0 6px',
        borderRadius: 4,
        background: style.background,
        color: style.color,
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase' as const,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        whiteSpace: 'nowrap' as const,
        lineHeight: '20px',
        flexShrink: 0,
        maxWidth: mini ? 120 : 140,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={status}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
      {onClick && !mini && <span style={{ opacity: 0.6, fontSize: 8, color: style.color }}>▾</span>}
    </button>
  );
}
