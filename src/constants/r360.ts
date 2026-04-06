export const R360 = {
  primary: '#2563EB', primaryHover: '#1D4ED8', primaryLight: '#EFF6FF', primaryDark: '#1E3A5F',
  success: '#16A34A', successLight: '#F0FDF4', successText: '#14532D',
  warning: '#D97706', warningLight: '#FFFBEB', warningText: '#78350F',
  danger: '#EF4444', dangerLight: '#FEF2F2', dangerText: '#7F1D1D',
  teal: '#0D9488', tealLight: '#F0FDFA', tealText: '#134E4A',
  purple: '#7C3AED', purpleLight: '#F5F3FF', purpleText: '#4C1D95',
  ink1: '#020617', ink2: 'var(--fg-1, #0F172A)', ink3: '#334155', ink4: '#64748B',
  surface: 'var(--bg-1, #F8FAFC)', card: '#FFFFFF', border: 'var(--bd-default, #E2E8F0)', borderLt: '#F1F5F9',
} as const;

export interface StatusDisplay { category: string; label: string; color: string; bg: string; dot: string; }

export const R360_STATUS_MAP: Record<string, StatusDisplay> = {
  'To Do':          { category:'to_do',       label:'To Do',       color:'#78350F', bg:'#FFFBEB', dot:'#D97706' },
  'Open':           { category:'to_do',       label:'To Do',       color:'#78350F', bg:'#FFFBEB', dot:'#D97706' },
  'Backlog':        { category:'to_do',       label:'Backlog',     color:'#78350F', bg:'#FFFBEB', dot:'#D97706' },
  'In Progress':    { category:'in_progress', label:'In Progress', color:'#1E3A5F', bg:'#EFF6FF', dot:'#2563EB' },
  'In Development': { category:'in_progress', label:'In Progress', color:'#1E3A5F', bg:'#EFF6FF', dot:'#2563EB' },
  'Under Implementation': { category:'in_progress', label:'In Progress', color:'#1E3A5F', bg:'#EFF6FF', dot:'#2563EB' },
  'Implementation Review': { category:'in_qa', label:'In Review', color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'Ready for QA':   { category:'in_qa',       label:'In Review',   color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'In Review':      { category:'in_qa',       label:'In Review',   color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'Code Review':    { category:'in_qa',       label:'In Review',   color:'#134E4A', bg:'#F0FDFA', dot:'#0D9488' },
  'ToDo':           { category:'to_do',       label:'To Do',       color:'#78350F', bg:'#FFFBEB', dot:'#D97706' },
  'Technical validation': { category:'in_progress', label:'Validation', color:'#1E3A5F', bg:'#EFF6FF', dot:'#2563EB' },
  'Ready for Development': { category:'to_do', label:'Ready',      color:'#78350F', bg:'#FFFBEB', dot:'#D97706' },
  'Done':           { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'#16A34A' },
  'Closed':         { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'#16A34A' },
  'Resolved':       { category:'done',        label:'Done',        color:'#14532D', bg:'#F0FDF4', dot:'#16A34A' },
  'Blocked':        { category:'blocked',     label:'Blocked',     color:'#7F1D1D', bg:'#FEF2F2', dot:'#EF4444' },
  'hold':           { category:'blocked',     label:'On Hold',     color:'#7F1D1D', bg:'#FEF2F2', dot:'#EF4444' },
  'Hold':           { category:'blocked',     label:'On Hold',     color:'#7F1D1D', bg:'#FEF2F2', dot:'#EF4444' },
  'On Hold':        { category:'blocked',     label:'On Hold',     color:'#7F1D1D', bg:'#FEF2F2', dot:'#EF4444' },
};
export const R360_STATUS_DEFAULT: StatusDisplay = { category:'to_do', label:'Unknown', color:'#334155', bg:'#F1F5F9', dot:'#64748B' };

export const R360_DEPT_COLORS: Record<string, string> = {
  Delivery:'#2563EB', Governance:'#0D9488', Operations:'#D97706',
  Product:'#7C3AED', 'Technical Support':'#EF4444',
};

export const R360_PROJECT_COLORS: Record<string, string> = {
  BAU:'#2563EB', SEN:'#D97706', FAC:'#16A34A', OPS:'#0D9488', SUP:'#64748B',
  LND:'#7C3AED', COM:'#0D9488', IN:'#D97706', DET:'#EF4444', ICP:'#16A34A',
};
