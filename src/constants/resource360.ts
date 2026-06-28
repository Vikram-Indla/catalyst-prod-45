// src/constants/resource360.ts — Design tokens and constants for Resource 360° View

export const HUB_COLORS: Record<string, string> = {
  StrategyHub: 'var(--ds-text, #0EA5E9)',
  ProductHub: 'var(--ds-text-discovery, #8B5CF6)',
  ProjectHub: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))',
  ReleaseHub: 'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))',
  TestHub: 'var(--ds-text-warning, var(--cp-warning, #D97706))',
  IncidentHub: 'var(--ds-text-danger, var(--cp-danger, #DC2626))',
  Tasks: 'var(--quality-high, var(--ds-background-success-bold, #059669))',
};

export const HUB_SHORT: Record<string, string> = {
  StrategyHub: 'STRAT',
  ProductHub: 'PROD',
  ProjectHub: 'PROJ',
  ReleaseHub: 'REL',
  TestHub: 'TEST',
  IncidentHub: 'INC',
  Tasks: 'TASK',
};

export const STATUS_CATEGORY_COLORS = {
  todo: { bg: 'var(--ds-surface, #FEE2E2)', text: 'var(--ds-text-danger, var(--cp-danger, #DC2626))', border: 'var(--ds-border-danger, #FCA5A5)', dot: 'var(--ds-text-danger, var(--cp-danger, #DC2626))' },
  progress: { bg: 'var(--ds-background-selected, #DBEAFE)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', border: 'var(--ds-border, #93C5FD)', dot: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))' },
  done: { bg: 'var(--ds-surface, #D1FAE5)', text: 'var(--quality-high, #059669)', border: 'var(--ds-border, #6EE7B7)', dot: 'var(--quality-high, #059669)' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'var(--ds-text-danger, var(--cp-danger, #DC2626))',
  High: 'var(--ds-text-warning, #EA580C)',
  Medium: 'var(--ds-text-warning, var(--cp-warning, #D97706))',
  Low: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))',
};

export const PRIORITY_ICONS: Record<string, string> = {
  Critical: '🔴',
  High: '🟠',
  Medium: '🟡',
  Low: '⚪',
};

export const WIT_STYLES: Record<string, { bg: string; color: string }> = {
  Request: { bg: 'var(--ds-background-selected, #DBEAFE)', color: 'var(--ds-link, #1E40AF)' },
  Epic: { bg: 'var(--ds-surface, #EDE9FE)', color: 'var(--ds-text-discovery, #6D28D9)' },
  Feature: { bg: 'var(--ds-surface, #E0E7FF)', color: 'var(--ds-text-discovery, #3730A3)' },
  Story: { bg: 'var(--ds-background-selected, #DBEAFE)', color: 'var(--ds-background-brand-bold-hovered, #1D4ED8)' },
  Subtask: { bg: 'var(--ds-surface, #E0E7FF)', color: 'var(--ds-text-discovery, #3730A3)' },
  Bug: { bg: 'var(--ds-surface, #FEE2E2)', color: 'var(--ds-text-danger, #B91C1C)' },
  Task: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle, #44546F))))' },
  'Test Case': { bg: 'var(--ds-surface, #FEF3C7)', color: 'var(--ds-text-warning, #92400E)' },
  'Test Plan': { bg: 'var(--ds-surface, #FEF3C7)', color: 'var(--ds-text-warning, #92400E)' },
  Incident: { bg: 'var(--ds-background-danger, #FFECEB)', color: 'var(--ds-text-danger, #991B1B)' },
  Release: { bg: 'var(--ds-surface, #CCFBF1)', color: 'var(--ds-text-success, #0F766E)' },
  Requirement: { bg: 'var(--ds-surface, #FCE7F3)', color: 'var(--ds-text, #9D174D)' },
};

// BANNED COLORS — Golden Hour palette. If any of these appear in code, it is a bug.
// TODO: ads-unmapped — #5C7C5C context unclear
// #C69C6D, #5C7C5C, #8B7355, var(--ds-background-neutral-subtle, #D4B896) — NEVER USE

// ═══════════════════════════════════════════════════════════
// RESOURCE 360° — Member Detail Design System Constants
// Ring-fenced tokens that override Catalyst V11 when needed
// ═══════════════════════════════════════════════════════════

export const R360_TOKENS = {
  primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))',
  primaryHover: 'var(--ds-background-brand-bold-hovered, #1D4ED8)',
  primaryLight: 'var(--ds-background-selected, #EFF6FF)',
  primaryDark: 'var(--ds-text, #1E3A5F)',
  success: 'var(--ds-text-success, var(--cp-success, #16A34A))',
  successLight: 'var(--ds-surface, #F0FDF4)',
  successText: 'var(--ds-text-success, #14532D)',
  warning: 'var(--ds-text-warning, var(--cp-warning, #D97706))',
  warningLight: 'var(--ds-surface, #FFFBEB)',
  warningText: 'var(--ds-text-warning, #78350F)',
  danger: 'var(--ds-text-danger, #EF4444)',
  dangerLight: 'var(--ds-background-danger, #FEF2F2)',
  dangerText: 'var(--ds-text-danger, #7F1D1D)',
  teal: 'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))',
  tealLight: 'var(--ds-surface, #F0FDFA)',
  tealText: 'var(--ds-text-success, #134E4A)',
  purple: 'var(--cp-purple-60, var(--ds-background-discovery-bold, #7C3AED))',
  purpleLight: 'var(--ds-surface, #F5F3FF)',
  purpleText: 'var(--ds-text-discovery, #4C1D95)',
  ink1: 'var(--ds-text, #020617)',
  ink2: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text, #172B4D))))',
  ink3: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle, #44546F))))',
  ink4: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))',
  surface: 'var(--bg-1, var(--ds-surface-sunken, #F8FAFC))',
  card: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface, #FFFFFF))))',
  border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border, #DFE1E6))))',
  borderLt: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))',
} as const;

// Status mental model — CG-05 enforced
export const R360_STATUS_STYLES: Record<string, {
  color: string; bg: string; dot: string; label: string;
}> = {
  'ToDo':        { color: 'var(--ds-text-warning, #78350F)', bg: 'var(--ds-surface, #FFFBEB)', dot: 'var(--ds-text-warning, var(--cp-warning, #D97706))', label: 'ToDo' },
  'In Progress': { color: 'var(--ds-text, #1E3A5F)', bg: 'var(--ds-background-selected, #EFF6FF)', dot: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))', label: 'In Progress' },
  'In Review':   { color: 'var(--ds-text-success, #134E4A)', bg: 'var(--ds-surface, #F0FDFA)', dot: 'var(--cp-teal-60, #0D9488)', label: 'In Review' },
  'Done':        { color: 'var(--ds-text-success, #14532D)', bg: 'var(--ds-surface, #F0FDF4)', dot: 'var(--ds-text-success, var(--cp-success, #16A34A))', label: 'Done' },
  'Blocked':     { color: 'var(--ds-text-danger, #7F1D1D)', bg: 'var(--ds-background-danger, #FEF2F2)', dot: 'var(--ds-text-danger, #EF4444)', label: 'Blocked' },
  'Re-Open':     { color: 'var(--ds-text-warning, #78350F)', bg: 'var(--ds-surface, #FFFBEB)', dot: 'var(--ds-text-warning, var(--cp-warning, #D97706))', label: 'Re-Open' },
};

// Project colors
export const R360_PROJECT_COLORS: Record<string, string> = {
  BAU: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary, #2563EB))',
  SEN: 'var(--ds-text-warning, var(--cp-warning, #D97706))',
  FAC: 'var(--ds-text-success, var(--cp-success, #16A34A))',
  OPS: 'var(--cp-teal-60, var(--ds-chart-teal-bold, #0d9488))',
  SUP: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))',
  LND: 'var(--cp-purple-60, var(--ds-background-discovery-bold, #7C3AED))',
};

// Jira issue type icon colors
export const R360_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  bug:     { bg: 'var(--ds-background-danger, #FEF2F2)', color: 'var(--ds-text-danger, #E5493A)' },
  task:    { bg: 'var(--ds-background-selected, #EFF6FF)', color: 'var(--ds-link, #4BADE8)' },
  story:   { bg: 'var(--ds-surface, #F0FDF4)', color: 'var(--ds-text-success, #63BA3C)' },
  epic:    { bg: 'var(--ds-surface, #F5F3FF)', color: 'var(--ds-text-discovery, #904EE2)' },
  subtask: { bg: 'var(--ds-surface, #F0FDFA)', color: 'var(--ds-link, #4BADE8)' },
};

// Days sitting thresholds
export const R360_AGE_THRESHOLDS = {
  green: 7,
  amber: 14,
} as const;

// BANNED: Golden Hour palette — NEVER use these as primary
export const BANNED_COLORS = [
  'var(--ds-text-warning, var(--cp-amber, #F59E0B))', 'var(--ds-text-warning, #FBBF24)', 'var(--ds-text-warning, #FCD34D)', 'var(--ds-text-warning, #FDE68A)',
  'var(--ds-text-warning, var(--cp-warning, #D97706))', // ONLY allowed as status warning, never as primary accent
] as const;
