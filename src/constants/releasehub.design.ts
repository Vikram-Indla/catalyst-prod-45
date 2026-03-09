// ReleaseHub v2.1 — Design System Constants (Token-correct)
export const RH = {
  pageBg: 'var(--cp-bg-sunken)',
  cardBg: 'var(--cp-bg-elevated)',
  surfaceBg: 'var(--cp-bg-surface)',
  surface2Bg: 'var(--cp-bg-sunken)',
  borderOuter: '1px solid var(--cp-border-strong)',
  borderInner: '1px solid var(--cp-border-default)',
  teal: 'var(--cp-teal-60)',
  tealDark: '#0B7C71',
  tealLt: '#F0FDFA',
  tealBorder: '#99F6E4',
  primary: 'var(--cp-primary-60)',
  primaryDark: 'var(--cp-primary-70)',
  primaryLt: 'var(--cp-primary-5)',
  success: 'var(--cp-success-60)',
  successBg: 'var(--cp-success-5)',
  warning: 'var(--cp-warning-60)',
  warningBg: 'var(--cp-warning-5)',
  danger: 'var(--cp-danger-60)',
  dangerBg: 'var(--cp-danger-5)',
  ai: '#7C3AED',
  aiLt: '#EDE9FE',
  ink1: 'var(--cp-text-primary)',
  ink2: 'var(--cp-text-secondary)',
  ink3: 'var(--cp-text-tertiary)',
  ink4: 'var(--cp-text-muted)',
  fontDisplay: 'var(--cp-font-heading)',
  fontBody: 'var(--cp-font-body)',
  fontMono: 'var(--cp-font-mono)',
  navH: 48,
  sbW: 232,
  rowH: 36,
  drawerW: 700,
};

export const RELEASE_STATUS_LABELS: Record<string, string> = {
  todo: 'Todo', in_progress: 'In Progress', done: 'Done', archived: 'Archive',
};
export const RELEASE_STATUS_STYLES: Record<string, string> = {
  todo: 'bg-[var(--cp-lozenge-grey-bg)] text-[var(--cp-lozenge-grey-text)]',
  in_progress: 'bg-[var(--cp-lozenge-blue-bg)] text-[var(--cp-lozenge-blue-text)]',
  done: 'bg-[var(--cp-lozenge-green-bg)] text-[var(--cp-lozenge-green-text)]',
  archived: 'bg-[var(--cp-lozenge-grey-bg)] text-[var(--cp-lozenge-grey-text)]',
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
  low: 'bg-[var(--cp-success-5)] text-[var(--cp-success-60)] border border-green-200',
  medium: 'bg-[var(--cp-warning-5)] text-[var(--cp-warning-60)] border border-amber-200',
  high: 'bg-[var(--cp-danger-5)] text-[var(--cp-danger-60)] border border-red-200',
  critical: 'bg-[var(--cp-danger-60)] text-white',
};

export const SECTION_ACCENT: Record<string, string> = {
  past: 'var(--cp-text-muted)',
  today: 'var(--cp-danger-60)',
  this_week: 'var(--cp-primary-60)',
  upcoming: 'var(--cp-teal-60)',
  future: 'var(--cp-success-60)',
};

export const CATEGORIES = ['Landing Page', 'Senaei BAU', 'MIM Website', 'Mobile App', 'Tohammena', 'Data & AI'];
