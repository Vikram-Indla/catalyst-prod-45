// ReleaseHub v2.1 — Design System Constants (V12 Hybrid Precision)
// BANNED: Purple (#7C3AED), Yellow/Amber, ServiceNow, Golden Hour palette

export const RH = {
  // Backgrounds
  pageBg: 'var(--ds-surface, #FFFFFF)',
  cardBg: 'var(--ds-surface, #FFFFFF)',
  surfaceBg: 'var(--bg-1, #F8FAFC)',
  sunkenBg: 'var(--ds-surface-sunken, #F1F5F9)',

  // Borders
  borderDefault: 'rgba(15,23,42,0.12)',
  borderSubtle: 'rgba(15,23,42,0.06)',
  borderStrong: 'rgba(15,23,42,0.20)',

  // Colors
  primary: 'var(--ds-text-brand, #2563EB)',
  primaryDark: 'var(--ds-background-brand-bold-hovered, #1D4ED8)',
  primaryLt: 'var(--ds-background-selected, #EFF6FF)',
  teal: '#0D9488',
  success: 'var(--ds-text-success, #16A34A)',
  successBg: '#1B7F37',
  warning: 'var(--ds-text-warning, #D97706)',
  danger: 'var(--ds-text-danger, #DC2626)',
  dangerBg: 'var(--ds-background-danger, #FEF2F2)',

  // AI = Blue, NOT purple
  ai: 'var(--ds-text-brand, #2563EB)',
  aiLt: 'var(--ds-background-selected, #EFF6FF)',
  aiBorder: '#DBEAFE',

  // Text
  ink1: 'var(--fg-1, #0F172A)',
  ink2: 'var(--ds-text-subtle, #334155)',
  ink3: 'var(--ds-text-subtlest, #64748B)',
  ink4: 'var(--ds-text-subtlest, #94A3B8)',

  // Fonts
  fontDisplay: "'Sora', system-ui, sans-serif",
  fontBody: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  // Layout
  navH: 48,
  sbW: 232,
  rowH: 36,
  drawerW: 560,
};

// ── STATUS LOZENGE 3-COLOR GUARDRAIL ──────────────────────────────
// GREY:  bg=#DFE1E6 text=#253858 → NEW, ARCHIVED, NOT_STARTED
// BLUE:  bg=#DEEBFF text=#0747A6 → IN_UAT, IN_BETA, IN_PROGRESS, PLANNING, WAITING
// GREEN: bg=#E3FCEF text=#006644 → IN_PRODUCTION, RELEASED, DONE, APPROVED, PASS

export const LOZENGE = {
  grey:  { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
  blue:  { bg: '#0C66E4', text: 'var(--ds-surface, #FFFFFF)' },
  green: { bg: '#1B7F37', text: 'var(--ds-surface, #FFFFFF)' },
} as const;

type LozengeStyle = { bg: string; text: string };

// Release statuses → map to guardrail
export const RELEASE_STATUS_LABELS: Record<string, string> = {
  planning: 'Planning', in_progress: 'In Progress', released: 'Released', archived: 'Archived',
  // Legacy compat
  todo: 'Planning', done: 'Released',
};

export const RELEASE_STATUS_LOZENGE: Record<string, LozengeStyle> = {
  planning: LOZENGE.blue,
  in_progress: LOZENGE.blue,
  released: LOZENGE.green,
  archived: LOZENGE.grey,
  todo: LOZENGE.grey,
  done: LOZENGE.green,
};

// Change statuses → map to guardrail (EXACTLY 4)
export const CHG_STATUS_LABELS: Record<string, string> = {
  new: 'New', in_uat: 'In UAT', in_beta: 'In Beta', in_production: 'In Production',
  // Legacy compat
  in_qa: 'In QA',
};

export const CHG_STATUS_LOZENGE: Record<string, LozengeStyle> = {
  new: LOZENGE.grey,
  in_uat: LOZENGE.blue,
  in_beta: LOZENGE.blue,
  in_production: LOZENGE.green,
  in_qa: LOZENGE.blue,
};

export const CHG_STATUS_ORDER: string[] = ['new', 'in_uat', 'in_beta', 'in_production'];

// Risk badges
export const RISK_BADGE: Record<string, { bg: string; text: string }> = {
  standard: { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
  low: { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
  high: { bg: 'var(--ds-background-danger, #FEF2F2)', text: 'var(--ds-text-danger, #DC2626)' },
  emergency: { bg: 'var(--ds-background-danger, #FEF2F2)', text: 'var(--ds-text-danger, #991B1B)' },
  critical: { bg: 'var(--ds-background-danger, #FEF2F2)', text: 'var(--ds-text-danger, #991B1B)' },
  medium: { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
};

// Source badges
export const SOURCE_BADGE: Record<string, { bg: string; text: string }> = {
  jira: { bg: 'var(--ds-border, #DFE1E6)', text: '#42526E' },
  catalyst: { bg: '#0C66E4', text: 'var(--ds-surface, #FFFFFF)' },
};

// Deployment result badges (only shown when status=IN_PRODUCTION)
export const DEPLOY_RESULT_BADGE: Record<string, { bg: string; text: string }> = {
  success: { bg: '#1B7F37', text: 'var(--ds-surface, #FFFFFF)' },
  rolled_back: { bg: 'var(--ds-background-danger, #FEF2F2)', text: 'var(--ds-text-danger, #991B1B)' },
  monitoring: { bg: '#0C66E4', text: 'var(--ds-surface, #FFFFFF)' },
};

// Sign-off decision lozenges
export const SIGNOFF_LOZENGE: Record<string, LozengeStyle> = {
  approved: LOZENGE.green,
  rejected: LOZENGE.grey,
  pending: LOZENGE.grey,
  waiting: LOZENGE.blue,
};

// Section accents for change timeline
export const SECTION_ACCENT: Record<string, string> = {
  past: 'var(--ds-text-subtlest, #94A3B8)',
  today: 'var(--ds-text-danger, #DC2626)',
  this_week: 'var(--ds-text-brand, #2563EB)',
  upcoming: '#0D9488',
  future: 'var(--ds-text-success, #16A34A)',
};

export const CATEGORIES = ['Landing Page', 'Senaei BAU', 'MIM Website', 'Mobile App', 'Tohammena', 'Data & AI'];

// Legacy compat exports
export const CHG_STATUS_STYLES: Record<string, string> = {};
export const RISK_STYLES: Record<string, string> = {};
