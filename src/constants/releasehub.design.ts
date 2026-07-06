// ReleaseHub v2.1 — Design System Constants (V12 Hybrid Precision)
// BANNED: Purple (var(--cp-purple-60)), Yellow/Amber, ServiceNow, Golden Hour palette

export const RH = {
  // Backgrounds
  pageBg: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  cardBg: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))',
  surfaceBg: 'var(--bg-1)',
  sunkenBg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',

  // Borders
  borderDefault: 'var(--ds-shadow-overlay, rgba(15,23,42,0.12))',
  borderSubtle: 'var(--ds-shadow-overlay, rgba(15,23,42,0.06))',
  borderStrong: 'var(--ds-shadow-overlay, rgba(15,23,42,0.20))',

  // Colors
  primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  primaryDark: 'var(--ds-background-brand-bold-hovered)',
  primaryLt: 'var(--ds-background-selected)',
  teal: 'var(--cp-teal-60)',
  success: 'var(--ds-text-success, var(--cp-success))',
  successBg: 'var(--cp-lozenge-green-bg)',
  warning: 'var(--ds-text-warning, var(--cp-warning))',
  danger: 'var(--ds-text-danger, var(--cp-danger))',
  dangerBg: 'var(--ds-background-danger)',

  // AI = Blue, NOT purple
  ai: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  aiLt: 'var(--ds-background-selected)',
  aiBorder: 'var(--ds-background-information)',

  // Text
  ink1: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1)))',
  ink2: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2)))',
  ink3: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
  ink4: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',

  // Fonts
  fontDisplay: "var(--ds-font-family-heading)",
  fontBody: "var(--ds-font-family-body)",
  fontMono: "var(--ds-font-family-code)",

  // Layout
  navH: 48,
  sbW: 232,
  rowH: 36,
  drawerW: 560,
  canvasMaxWidth: 1440,
};

// ── STATUS LOZENGE 3-COLOR GUARDRAIL ──────────────────────────────
// GREY:  bg=var(--cp-lozenge-grey-bg, var(--cp-border-neutral)) text=var(--ds-text) → NEW, ARCHIVED, NOT_STARTED
// BLUE:  bg=#DEEBFF text=var(--ds-link-pressed) → IN_UAT, IN_BETA, IN_PROGRESS, PLANNING, WAITING
// GREEN: bg=var(--ds-background-success) text=var(--ds-text-success) → IN_PRODUCTION, RELEASED, DONE, APPROVED, PASS

export const LOZENGE = {
  grey:  { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
  blue:  { bg: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  green: { bg: 'var(--cp-lozenge-green-bg)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
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
  standard: { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
  low: { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
  high: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger, var(--cp-danger))' },
  emergency: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)' },
  critical: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)' },
  medium: { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
};

// Source badges
export const SOURCE_BADGE: Record<string, { bg: string; text: string }> = {
  jira: { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))', text: 'var(--ds-text-subtle)' },
  catalyst: { bg: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
};

// Deployment result badges (only shown when status=IN_PRODUCTION)
export const DEPLOY_RESULT_BADGE: Record<string, { bg: string; text: string }> = {
  success: { bg: 'var(--cp-lozenge-green-bg)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  rolled_back: { bg: 'var(--ds-background-danger)', text: 'var(--ds-text-danger)' },
  monitoring: { bg: 'var(--ds-link)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
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
  past: 'var(--ds-text-subtlest, var(--cp-ink-4, var(--cp-border-neutral-light)))',
  today: 'var(--ds-text-danger, var(--cp-danger))',
  this_week: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  upcoming: 'var(--cp-teal-60)',
  future: 'var(--ds-text-success, var(--cp-success))',
};

export const CATEGORIES = ['Landing Page', 'Senaei BAU', 'MIM Website', 'Mobile App', 'Tohammena', 'Data & AI'];

// Legacy compat exports
export const CHG_STATUS_STYLES: Record<string, string> = {};
export const RISK_STYLES: Record<string, string> = {};
