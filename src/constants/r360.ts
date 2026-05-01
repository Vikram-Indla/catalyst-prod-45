export const R360 = {
  primary: 'var(--ds-text-brand, #2563EB)', primaryHover: 'var(--ds-background-brand-bold-hovered, #1D4ED8)', primaryLight: 'var(--ds-background-selected, #EFF6FF)', primaryDark: '#1E3A5F',
  success: 'var(--ds-text-success, #16A34A)', successLight: '#F0FDF4', successText: '#14532D',
  warning: 'var(--ds-text-warning, #D97706)', warningLight: '#FFFBEB', warningText: '#78350F',
  danger: 'var(--ds-text-danger, #EF4444)', dangerLight: 'var(--ds-background-danger, #FEF2F2)', dangerText: '#7F1D1D',
  teal: '#0D9488', tealLight: '#F0FDFA', tealText: '#134E4A',
  purple: '#7C3AED', purpleLight: '#F5F3FF', purpleText: '#4C1D95',
  ink1: '#020617', ink2: 'var(--fg-1, #0F172A)', ink3: 'var(--ds-text-subtle, #334155)', ink4: 'var(--ds-text-subtlest, #64748B)',
  surface: 'var(--bg-1, #F8FAFC)', card: 'var(--ds-surface, #FFFFFF)', border: 'var(--bd-default, #E2E8F0)', borderLt: 'var(--ds-surface-sunken, #F1F5F9)',
} as const;

export interface StatusDisplay { category: string; label: string; color: string; bg: string; dot: string; }

export const R360_STATUS_MAP: Record<string, StatusDisplay> = {
  'To Do':          { category:'to_do',       label:'To Do',       color:'#78350F', bg:'#FFFBEB', dot:'var(--ds-text-warning, #D97706)' },
  'Open':           { category:'to_do',       label:'To Do',       color:'#78350F', bg:'#FFFBEB', dot:'var(--ds-text-warning, #D97706)' },
  'Backlog':        { category:'to_do',       label:'Backlog',     color:'#78350F', bg:'#FFFBEB', dot:'var(--ds-text-warning, #D97706)' },
  'In Progress':    { category:'in_progress', label:'In Progress', color:'#1E3A5F', bg:'var(--ds-background-selected, #EFF6FF)', dot:'var(--ds-text-brand, #2563EB)' },
  'In Development': { category:'in_progress', label:'In Progress', color:'#1E3A5F', bg:'var(--ds-background-selected, #EFF6FF)', dot:'var(--ds-text-brand, #2563EB)' },
  'Under Implementation': { category:'in_progress', label:'In Progress', color:'#1E3A5F', bg:'var(--ds-background-selected, #EFF6FF)', dot:'var(--ds-text-brand, #2563EB)' },
  'Implementation Review': { category:'in_qa', label:'In Review', color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'Ready for QA':   { category:'in_qa',       label:'In Review',   color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'In Review':      { category:'in_qa',       label:'In Review',   color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'Code Review':    { category:'in_qa',       label:'In Review',   color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'ToDo':           { category:'to_do',       label:'To Do',       color:'#78350F', bg:'#FFFBEB', dot:'var(--ds-text-warning, #D97706)' },
  'Technical validation': { category:'in_progress', label:'Validation', color:'#1E3A5F', bg:'var(--ds-background-selected, #EFF6FF)', dot:'var(--ds-text-brand, #2563EB)' },
  'Ready for Development': { category:'to_do', label:'Ready',      color:'#78350F', bg:'#FFFBEB', dot:'var(--ds-text-warning, #D97706)' },
  'Done':           { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'var(--ds-text-success, #16A34A)' },
  'Closed':         { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'var(--ds-text-success, #16A34A)' },
  'Resolved':       { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'var(--ds-text-success, #16A34A)' },
  'Blocked':        { category:'blocked',     label:'Blocked',     color:'#7F1D1D', bg:'var(--ds-background-danger, #FEF2F2)', dot:'var(--ds-text-danger, #EF4444)' },
  'hold':           { category:'blocked',     label:'On Hold',     color:'#7F1D1D', bg:'var(--ds-background-danger, #FEF2F2)', dot:'var(--ds-text-danger, #EF4444)' },
  'Hold':           { category:'blocked',     label:'On Hold',     color:'#7F1D1D', bg:'var(--ds-background-danger, #FEF2F2)', dot:'var(--ds-text-danger, #EF4444)' },
  'On Hold':        { category:'blocked',     label:'On Hold',     color:'#7F1D1D', bg:'var(--ds-background-danger, #FEF2F2)', dot:'var(--ds-text-danger, #EF4444)' },
};
export const R360_STATUS_DEFAULT: StatusDisplay = { category:'to_do', label:'Unknown', color:'var(--ds-text-subtle, #334155)', bg:'var(--ds-surface-sunken, #F1F5F9)', dot:'var(--ds-text-subtlest, #64748B)' };

export const R360_DEPT_COLORS: Record<string, string> = {
  Delivery:'var(--ds-text-brand, #2563EB)', Governance:'#0D9488', Operations:'var(--ds-text-warning, #D97706)',
  Product:'#7C3AED', 'Technical Support':'var(--ds-text-danger, #EF4444)',
};

export const R360_PROJECT_COLORS: Record<string, string> = {
  BAU:'var(--ds-text-brand, #2563EB)', SEN:'var(--ds-text-warning, #D97706)', FAC:'var(--ds-text-success, #16A34A)', OPS:'#0D9488', SUP:'var(--ds-text-subtlest, #64748B)',
  LND:'#7C3AED', COM:'#0D9488', IN:'var(--ds-text-warning, #D97706)', DET:'var(--ds-text-danger, #EF4444)', ICP:'var(--ds-text-success, #16A34A)',
};
