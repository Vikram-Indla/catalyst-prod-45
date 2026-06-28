/**
 * Chart Configuration — Shared colors and styles for WorkHub analytics
 * Phase 11
 */

export const STATUS_CHART_COLORS: Record<string, string> = {
  'To Do':       'var(--ds-text-disabled, #8590A2)',
  'In Progress': 'var(--ds-link, #2563eb)',
  'In Review':   'var(--ds-background-discovery-bold, #7C3AED)',
  'Done':        'var(--ds-background-success-bold, #1F845A)',
  'Blocked':     'var(--ds-background-danger-bold, #ef4444)',
  'Cancelled':   'var(--ds-text-subtlest, #626F86)',
};

export const TYPE_CHART_COLORS: Record<string, string> = {
  'Epic':     'var(--ds-link-pressed, #1e40af)',
  'Story':    'var(--ds-text-success, #216E4E)',
  'Subtask':  '#312e81',
  'Bug':      'var(--ds-background-danger-bold, #dc2626)',
  'Task':     'var(--ds-text-subtle, #44546F)',
  'Incident': 'var(--ds-text-warning, #974F0C)',
};

export const PRIORITY_CHART_COLORS: Record<string, string> = {
  'Critical': 'var(--ds-background-danger-bold, #dc2626)',
  'High':     'var(--ds-background-warning-bold, #f97316)',
  'Medium':   'var(--ds-background-warning-bold, #E2B203)',
  'Low':      'var(--ds-background-success-bold, #1F845A)',
  'Unset':    'var(--ds-text-disabled, #8590A2)',
};

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--ds-text, #172B4D)',
  color: 'var(--ds-text-inverse, #FFFFFF)',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '12px',
  border: 'none',
  boxShadow: '0 4px 12px var(--ds-shadow-raised, rgba(0,0,0,0.15))',
};
