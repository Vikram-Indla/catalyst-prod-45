/**
 * StatusBadge — Shared filled status badge (Jira-style)
 * Used in WorkItemTree, WorkItemTable, and DetailPanel
 */

import React from 'react';

export const STATUS_COLORS: Record<string, string> = {
  'Backlog': '#64748B',
  'Todo': '#2563EB',
  'To Do': '#2563EB',
  'In Progress': '#0D9488',
  'In Development': '#0D9488',
  'In Review': '#D97706',
  'In QA': '#D97706',
  'In UAT': '#8B5CF6',
  'UAT Ready': '#8B5CF6',
  'Ready for QA': '#D946EF',
  'Ready for Production': '#F97316',
  'In BETA': '#F97316',
  'Portfolio Review': '#6366F1',
  'Awaiting Info': '#D97706',
  'Done': '#16A34A',
  'Closed': '#475569',
  'Resolved': '#475569',
  'Blocked': '#DC2626',
  'Deferred for INT': '#94A3B8',
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || '#64748B';
}

interface StatusBadgeProps {
  status: string;
  onClick?: (e: React.MouseEvent) => void;
  mini?: boolean;
}

export function StatusBadge({ status, onClick, mini = false }: StatusBadgeProps) {
  const color = getStatusColor(status);
  const h = mini ? 18 : 24;

  return (
    <button
      onClick={onClick}
      style={{
        height: h,
        padding: mini ? '0 6px' : '0 8px',
        borderRadius: 4,
        background: color,
        color: '#FFFFFF',
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
        flexShrink: 0,
      }}
    >
      {status}
      {onClick && !mini && <span style={{ opacity: 0.7, fontSize: 8 }}>▾</span>}
    </button>
  );
}
