// ReleaseHub v2.1 — Design System Constants
export const RH = {
  pageBg: '#EEF2F7',
  cardBg: '#FFFFFF',
  surfaceBg: '#F4F7FA',
  surface2Bg: '#EAEFF5',
  borderOuter: '1px solid #C9D3E0',
  borderInner: '1px solid #E2E8F0',
  teal: '#0D9488',
  tealDark: '#0B7C71',
  tealLt: '#F0FDFA',
  tealBorder: '#99F6E4',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLt: '#EFF6FF',
  success: '#15803D',
  successBg: '#F0FDF4',
  warning: '#C2840A',
  warningBg: '#FFFBEB',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  ai: '#7C3AED',
  aiLt: '#EDE9FE',
  ink1: '#080E1D',
  ink2: '#1E293B',
  ink3: '#475569',
  ink4: '#94A3B8',
  fontDisplay: '"Sora", sans-serif',
  fontBody: '"Inter", sans-serif',
  fontMono: '"JetBrains Mono", monospace',
  navH: 48,
  sbW: 232,
  rowH: 36,
  drawerW: 700,
};

export const RELEASE_STATUS_LABELS: Record<string, string> = {
  todo: 'Todo', in_progress: 'In Progress', done: 'Done', archived: 'Archive',
};
export const RELEASE_STATUS_STYLES: Record<string, string> = {
  todo: 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
  in_progress: 'bg-[#DBEAFE] text-[#1E40AF] border border-[#BFDBFE]',
  done: 'bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]',
  archived: 'bg-[#F3F4F6] text-[#6B7280] border border-[#D1D5DB]',
};

export const CHG_STATUS_LABELS: Record<string, string> = {
  new: 'New', in_qa: 'In QA', in_uat: 'In UAT', in_beta: 'In Beta', in_production: 'In Production',
};
export const CHG_STATUS_STYLES: Record<string, string> = {
  new: 'bg-[#6B7280] text-white',
  in_qa: 'bg-[#1D4ED8] text-white',
  in_uat: 'bg-[#B45309] text-white',
  in_beta: 'bg-[#7C3AED] text-white',
  in_production: 'bg-[#15803D] text-white',
};

export const CHG_STATUS_ORDER: string[] = ['new', 'in_qa', 'in_uat', 'in_beta', 'in_production'];

export const RISK_STYLES: Record<string, string> = {
  low: 'bg-[#F0FDF4] text-[#15803D] border border-[#86EFAC]',
  medium: 'bg-[#FFFBEB] text-[#C2840A] border border-[#FCD34D]',
  high: 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]',
  critical: 'bg-[#DC2626] text-white',
};

export const SECTION_ACCENT: Record<string, string> = {
  past: '#94A3B8',
  today: '#DC2626',
  this_week: '#2563EB',
  upcoming: '#0D9488',
  future: '#15803D',
};

export const CATEGORIES = ['Landing Page', 'Senaei BAU', 'MIM Website', 'Mobile App', 'Tohammena', 'Data & AI'];
