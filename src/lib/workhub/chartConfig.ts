/**
 * Chart Configuration — Shared colors and styles for WorkHub analytics
 * Phase 11
 */

export const STATUS_CHART_COLORS: Record<string, string> = {
  'To Do':       '#94a3b8',
  'In Progress': '#2563eb',
  'In Review':   '#7c3aed',
  'Done':        '#16a34a',
  'Blocked':     '#ef4444',
  'Cancelled':   '#6b7280',
};

export const TYPE_CHART_COLORS: Record<string, string> = {
  'Epic':     '#1e40af',
  'Story':    '#065f46',
  'Subtask':  '#312e81',
  'Bug':      '#dc2626',
  'Task':     '#475569',
  'Incident': '#92400e',
};

export const PRIORITY_CHART_COLORS: Record<string, string> = {
  'Critical': '#dc2626',
  'High':     '#f97316',
  'Medium':   '#eab308',
  'Low':      '#22c55e',
  'Unset':    '#94a3b8',
};

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#1e293b',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '12px',
  border: 'none',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
};
