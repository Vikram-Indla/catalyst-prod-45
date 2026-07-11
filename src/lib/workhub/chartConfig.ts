/**
 * Chart Configuration — Shared colors and styles for WorkHub analytics
 * Phase 11
 */

export const STATUS_CHART_COLORS: Record<string, string> = {
  'To Do':       'var(--ds-text-disabled)',
  'In Progress': 'var(--ds-link)',
  'In Review':   'var(--ds-background-discovery-bold)',
  'Done':        'var(--ds-background-success-bold)',
  'Blocked':     'var(--ds-background-danger-bold)',
  'Cancelled':   'var(--ds-text-subtlest)',
};

export const TYPE_CHART_COLORS: Record<string, string> = {
  'Epic':     'var(--ds-link-pressed)',
  'Story':    'var(--ds-text-success)',
  'Subtask':  '#312e81', // ads-scanner:ignore-line — intentional design color, no ADS token equivalent
  'Bug':      'var(--ds-background-danger-bold)',
  'Task':     'var(--ds-text-subtle)',
  'Incident': 'var(--ds-text-warning)',
};

export const PRIORITY_CHART_COLORS: Record<string, string> = {
  'Critical': 'var(--ds-background-danger-bold)',
  'High':     'var(--ds-background-warning-bold)',
  'Medium':   'var(--ds-background-warning-bold)',
  'Low':      'var(--ds-background-success-bold)',
  'Unset':    'var(--ds-text-disabled)',
};

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--ds-text)',
  color: 'var(--ds-text-inverse)',
  borderRadius: '8px',
  padding: '8px 14px',
  fontSize: '12px',
  border: 'none',
  boxShadow: '0 4px 12px var(--ds-shadow-raised)',
};
