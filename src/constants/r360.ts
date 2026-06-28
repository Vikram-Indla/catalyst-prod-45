export const R360 = {
  primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', primaryHover: 'var(--ds-background-brand-bold-hovered, #1D4ED8)', primaryLight: 'var(--ds-background-selected, #EFF6FF)', primaryDark: 'var(--ds-text, #172B4D)',
  success: 'var(--ds-text-success, var(--cp-success, #16A34A))', successLight: 'var(--ds-background-success, #DFFCF0)', successText: 'var(--ds-text-success, #216E4E)',
  warning: 'var(--ds-text-warning, var(--cp-warning, #D97706))', warningLight: 'var(--ds-background-warning, #FFF7D6)', warningText: 'var(--ds-text-warning, #974F0C)',
  danger: 'var(--ds-text-danger, #EF4444)', dangerLight: 'var(--ds-background-danger, #FEF2F2)', dangerText: 'var(--ds-text-danger, #AE2A19)',
  teal: 'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))', tealLight: 'var(--ds-background-success, #DFFCF0)', tealText: 'var(--ds-text-success, #216E4E)',
// TODO: ads-unmapped — #4C1D95 context unclear
  purple: 'var(--cp-purple-60, var(--ds-background-discovery-bold, #7C3AED))', purpleLight: 'var(--ds-background-discovery, #F3F0FF)', purpleText: '#4C1D95',
  ink1: 'var(--ds-text, #172B4D)', ink2: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text, #172B4D))))', ink3: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle, #44546F))))', ink4: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))',
  surface: 'var(--bg-1, var(--ds-surface-sunken, #F8FAFC))', card: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))', border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border, #DFE1E6))))', borderLt: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))',
} as const;

export interface StatusDisplay { category: string; label: string; color: string; bg: string; dot: string; }

export const R360_STATUS_MAP: Record<string, StatusDisplay> = {
  'To Do':          { category:'to_do',       label:'To Do',       color:'var(--ds-text-warning, #974F0C)', bg:'var(--ds-background-warning, #FFF7D6)', dot:'var(--ds-text-warning, var(--cp-warning, #D97706))' },
  'Open':           { category:'to_do',       label:'To Do',       color:'var(--ds-text-warning, #974F0C)', bg:'var(--ds-background-warning, #FFF7D6)', dot:'var(--ds-text-warning, var(--cp-warning, #D97706))' },
  'Backlog':        { category:'to_do',       label:'Backlog',     color:'var(--ds-text-warning, #974F0C)', bg:'var(--ds-background-warning, #FFF7D6)', dot:'var(--ds-text-warning, var(--cp-warning, #D97706))' },
  'In Progress':    { category:'in_progress', label:'In Progress', color:'var(--ds-text, #172B4D)', bg:'var(--ds-background-selected, #EFF6FF)', dot:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' },
  'In Development': { category:'in_progress', label:'In Progress', color:'var(--ds-text, #172B4D)', bg:'var(--ds-background-selected, #EFF6FF)', dot:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' },
  'Under Implementation': { category:'in_progress', label:'In Progress', color:'var(--ds-text, #172B4D)', bg:'var(--ds-background-selected, #EFF6FF)', dot:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' },
  'Implementation Review': { category:'in_qa', label:'In Review', color:'var(--ds-text-success, #216E4E)', bg:'var(--ds-background-success, #DFFCF0)', dot:'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))' },
  'Ready for QA':   { category:'in_qa',       label:'In Review',   color:'var(--ds-text-success, #216E4E)', bg:'var(--ds-background-success, #DFFCF0)', dot:'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))' },
  'In Review':      { category:'in_qa',       label:'In Review',   color:'var(--ds-text-success, #216E4E)', bg:'var(--ds-background-success, #DFFCF0)', dot:'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))' },
  'Code Review':    { category:'in_qa',       label:'In Review',   color:'var(--ds-text-success, #216E4E)', bg:'var(--ds-background-success, #DFFCF0)', dot:'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))' },
  'ToDo':           { category:'to_do',       label:'To Do',       color:'var(--ds-text-warning, #974F0C)', bg:'var(--ds-background-warning, #FFF7D6)', dot:'var(--ds-text-warning, var(--cp-warning, #D97706))' },
  'Technical validation': { category:'in_progress', label:'Validation', color:'var(--ds-text, #172B4D)', bg:'var(--ds-background-selected, #EFF6FF)', dot:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' },
  'Ready for Development': { category:'to_do', label:'Ready',      color:'var(--ds-text-warning, #974F0C)', bg:'var(--ds-background-warning, #FFF7D6)', dot:'var(--ds-text-warning, var(--cp-warning, #D97706))' },
  'Done':           { category:'done',        label:'Done',        color:'var(--ds-text-success, #216E4E)', bg:'var(--ds-background-success, #DFFCF0)', dot:'var(--ds-text-success, var(--cp-success, #16A34A))' },
  'Closed':         { category:'done',        label:'Done',        color:'var(--ds-text-success, #216E4E)', bg:'var(--ds-background-success, #DFFCF0)', dot:'var(--ds-text-success, var(--cp-success, #16A34A))' },
  'Resolved':       { category:'done',        label:'Done',        color:'var(--ds-text-success, #216E4E)', bg:'var(--ds-background-success, #DFFCF0)', dot:'var(--ds-text-success, var(--cp-success, #16A34A))' },
  'Blocked':        { category:'blocked',     label:'Blocked',     color:'var(--ds-text-danger, #AE2A19)', bg:'var(--ds-background-danger, #FEF2F2)', dot:'var(--ds-text-danger, #EF4444)' },
  'hold':           { category:'blocked',     label:'On Hold',     color:'var(--ds-text-danger, #AE2A19)', bg:'var(--ds-background-danger, #FEF2F2)', dot:'var(--ds-text-danger, #EF4444)' },
  'Hold':           { category:'blocked',     label:'On Hold',     color:'var(--ds-text-danger, #AE2A19)', bg:'var(--ds-background-danger, #FEF2F2)', dot:'var(--ds-text-danger, #EF4444)' },
  'On Hold':        { category:'blocked',     label:'On Hold',     color:'var(--ds-text-danger, #AE2A19)', bg:'var(--ds-background-danger, #FEF2F2)', dot:'var(--ds-text-danger, #EF4444)' },
};
export const R360_STATUS_DEFAULT: StatusDisplay = { category:'to_do', label:'Unknown', color:'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle, #44546F))))', bg:'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))', dot:'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))' };

export const R360_DEPT_COLORS: Record<string, string> = {
  Delivery:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', Governance:'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))', Operations:'var(--ds-text-warning, var(--cp-warning, #D97706))',
  Product:'var(--cp-purple-60, var(--ds-background-discovery-bold, #7C3AED))', 'Technical Support':'var(--ds-text-danger, #EF4444)',
};

export const R360_PROJECT_COLORS: Record<string, string> = {
  BAU:'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', SEN:'var(--ds-text-warning, var(--cp-warning, #D97706))', FAC:'var(--ds-text-success, var(--cp-success, #16A34A))', OPS:'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))', SUP:'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))',
  LND:'var(--cp-purple-60, var(--ds-background-discovery-bold, #7C3AED))', COM:'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))', IN:'var(--ds-text-warning, var(--cp-warning, #D97706))', DET:'var(--ds-text-danger, #EF4444)', ICP:'var(--ds-text-success, var(--cp-success, #16A34A))',
};
