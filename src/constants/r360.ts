export const R360 = {
  primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', primaryHover: 'var(--ds-background-brand-bold-hovered)', primaryLight: 'var(--ds-background-selected)', primaryDark: 'var(--ds-text)',
  success: 'var(--ds-text-success, var(--cp-success))', successLight: 'var(--ds-background-success)', successText: 'var(--ds-text-success)',
  warning: 'var(--ds-text-warning, var(--cp-warning))', warningLight: 'var(--ds-background-warning)', warningText: 'var(--ds-text-warning)',
  danger: 'var(--ds-text-danger)', dangerLight: 'var(--ds-background-danger)', dangerText: 'var(--ds-text-danger)',
  teal: 'var(--cp-teal-60, var(--ds-chart-teal-bold))', tealLight: 'var(--ds-background-success)', tealText: 'var(--ds-text-success)',
  purple: 'var(--cp-purple-60, var(--ds-background-discovery-bold))', purpleLight: 'var(--ds-background-discovery)', purpleText: '#4C1D95',
  ink1: 'var(--ds-text)', ink2: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))', ink3: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', ink4: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
  surface: 'var(--bg-1, var(--ds-surface-sunken))', card: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))', border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))', borderLt: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
} as const;

export interface StatusDisplay { category: string; label: string; color: string; bg: string; dot: string; }

export const R360_STATUS_MAP: Record<string, StatusDisplay> = {
  'To Do':          { category:'to_do',       label:'To Do',       color:'var(--ds-text-warning)', bg:'var(--ds-background-warning)', dot:'var(--ds-text-warning, var(--cp-warning))' },
  'Open':           { category:'to_do',       label:'To Do',       color:'var(--ds-text-warning)', bg:'var(--ds-background-warning)', dot:'var(--ds-text-warning, var(--cp-warning))' },
  'Backlog':        { category:'to_do',       label:'Backlog',     color:'var(--ds-text-warning)', bg:'var(--ds-background-warning)', dot:'var(--ds-text-warning, var(--cp-warning))' },
  'In Progress':    { category:'in_progress', label:'In Progress', color:'var(--ds-text)', bg:'var(--ds-background-selected)', dot:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  'In Development': { category:'in_progress', label:'In Progress', color:'var(--ds-text)', bg:'var(--ds-background-selected)', dot:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  'Under Implementation': { category:'in_progress', label:'In Progress', color:'var(--ds-text)', bg:'var(--ds-background-selected)', dot:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  'Implementation Review': { category:'in_qa', label:'In Review', color:'var(--ds-text-success)', bg:'var(--ds-background-success)', dot:'var(--cp-teal-60, var(--ds-chart-teal-bold))' },
  'Ready for QA':   { category:'in_qa',       label:'In Review',   color:'var(--ds-text-success)', bg:'var(--ds-background-success)', dot:'var(--cp-teal-60, var(--ds-chart-teal-bold))' },
  'In Review':      { category:'in_qa',       label:'In Review',   color:'var(--ds-text-success)', bg:'var(--ds-background-success)', dot:'var(--cp-teal-60, var(--ds-chart-teal-bold))' },
  'Code Review':    { category:'in_qa',       label:'In Review',   color:'var(--ds-text-success)', bg:'var(--ds-background-success)', dot:'var(--cp-teal-60, var(--ds-chart-teal-bold))' },
  'ToDo':           { category:'to_do',       label:'To Do',       color:'var(--ds-text-warning)', bg:'var(--ds-background-warning)', dot:'var(--ds-text-warning, var(--cp-warning))' },
  'Technical validation': { category:'in_progress', label:'Validation', color:'var(--ds-text)', bg:'var(--ds-background-selected)', dot:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  'Ready for Development': { category:'to_do', label:'Ready',      color:'var(--ds-text-warning)', bg:'var(--ds-background-warning)', dot:'var(--ds-text-warning, var(--cp-warning))' },
  'Done':           { category:'done',        label:'Done',        color:'var(--ds-text-success)', bg:'var(--ds-background-success)', dot:'var(--ds-text-success, var(--cp-success))' },
  'Closed':         { category:'done',        label:'Done',        color:'var(--ds-text-success)', bg:'var(--ds-background-success)', dot:'var(--ds-text-success, var(--cp-success))' },
  'Resolved':       { category:'done',        label:'Done',        color:'var(--ds-text-success)', bg:'var(--ds-background-success)', dot:'var(--ds-text-success, var(--cp-success))' },
  'Blocked':        { category:'blocked',     label:'Blocked',     color:'var(--ds-text-danger)', bg:'var(--ds-background-danger)', dot:'var(--ds-text-danger)' },
  'hold':           { category:'blocked',     label:'On Hold',     color:'var(--ds-text-danger)', bg:'var(--ds-background-danger)', dot:'var(--ds-text-danger)' },
  'Hold':           { category:'blocked',     label:'On Hold',     color:'var(--ds-text-danger)', bg:'var(--ds-background-danger)', dot:'var(--ds-text-danger)' },
  'On Hold':        { category:'blocked',     label:'On Hold',     color:'var(--ds-text-danger)', bg:'var(--ds-background-danger)', dot:'var(--ds-text-danger)' },
};
export const R360_STATUS_DEFAULT: StatusDisplay = { category:'to_do', label:'Unknown', color:'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))', bg:'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', dot:'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))' };

export const R360_DEPT_COLORS: Record<string, string> = {
  Delivery:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', Governance:'var(--cp-teal-60, var(--ds-chart-teal-bold))', Operations:'var(--ds-text-warning, var(--cp-warning))',
  Product:'var(--cp-purple-60, var(--ds-background-discovery-bold))', 'Technical Support':'var(--ds-text-danger)',
};

export const R360_PROJECT_COLORS: Record<string, string> = {
  BAU:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', SEN:'var(--ds-text-warning, var(--cp-warning))', FAC:'var(--ds-text-success, var(--cp-success))', OPS:'var(--cp-teal-60, var(--ds-chart-teal-bold))', SUP:'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
  LND:'var(--cp-purple-60, var(--ds-background-discovery-bold))', COM:'var(--cp-teal-60, var(--ds-chart-teal-bold))', IN:'var(--ds-text-warning, var(--cp-warning))', DET:'var(--ds-text-danger)', ICP:'var(--ds-text-success, var(--cp-success))',
};
