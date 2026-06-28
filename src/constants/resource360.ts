// src/constants/resource360.ts — Design tokens and constants for Resource 360° View

export const HUB_COLORS: Record<string, string> = {
  StrategyHub: 'var(--ds-text)',
  ProductHub: 'var(--ds-text-discovery)',
  ProjectHub: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  ReleaseHub: 'var(--cp-teal-60, var(--ds-chart-teal-bold))',
  TestHub: 'var(--ds-text-warning, var(--cp-warning))',
  IncidentHub: 'var(--ds-text-danger, var(--cp-danger))',
  Tasks: 'var(--quality-high, var(--ds-background-success-bold))',
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
  todo: { bg: 'var(--ds-surface)', text: 'var(--ds-text-danger, var(--cp-danger))', border: 'var(--ds-border-danger)', dot: 'var(--ds-text-danger, var(--cp-danger))' },
  progress: { bg: 'var(--ds-background-selected)', text: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', border: 'var(--ds-border)', dot: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
  done: { bg: 'var(--ds-surface)', text: 'var(--quality-high)', border: 'var(--ds-border)', dot: 'var(--quality-high)' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'var(--ds-text-danger, var(--cp-danger))',
  High: 'var(--ds-text-warning)',
  Medium: 'var(--ds-text-warning, var(--cp-warning))',
  Low: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
};

export const PRIORITY_ICONS: Record<string, string> = {
  Critical: '🔴',
  High: '🟠',
  Medium: '🟡',
  Low: '⚪',
};

export const WIT_STYLES: Record<string, { bg: string; color: string }> = {
  Request: { bg: 'var(--ds-background-selected)', color: 'var(--ds-link)' },
  Epic: { bg: 'var(--ds-surface)', color: 'var(--ds-text-discovery)' },
  Feature: { bg: 'var(--ds-surface)', color: 'var(--ds-text-discovery)' },
  Story: { bg: 'var(--ds-background-selected)', color: 'var(--ds-background-brand-bold-hovered)' },
  Subtask: { bg: 'var(--ds-surface)', color: 'var(--ds-text-discovery)' },
  Bug: { bg: 'var(--ds-surface)', color: 'var(--ds-text-danger)' },
  Task: { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))', color: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))' },
  'Test Case': { bg: 'var(--ds-surface)', color: 'var(--ds-text-warning)' },
  'Test Plan': { bg: 'var(--ds-surface)', color: 'var(--ds-text-warning)' },
  Incident: { bg: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)' },
  Release: { bg: 'var(--ds-surface)', color: 'var(--ds-text-success)' },
  Requirement: { bg: 'var(--ds-surface)', color: 'var(--ds-text)' },
};

// BANNED COLORS — Golden Hour palette. If any of these appear in code, it is a bug.
// #C69C6D, #5C7C5C, #8B7355, var(--ds-background-neutral-subtle) — NEVER USE

// ═══════════════════════════════════════════════════════════
// RESOURCE 360° — Member Detail Design System Constants
// Ring-fenced tokens that override Catalyst V11 when needed
// ═══════════════════════════════════════════════════════════

export const R360_TOKENS = {
  primary: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  primaryHover: 'var(--ds-background-brand-bold-hovered)',
  primaryLight: 'var(--ds-background-selected)',
  primaryDark: 'var(--ds-text)',
  success: 'var(--ds-text-success, var(--cp-success))',
  successLight: 'var(--ds-surface)',
  successText: 'var(--ds-text-success)',
  warning: 'var(--ds-text-warning, var(--cp-warning))',
  warningLight: 'var(--ds-surface)',
  warningText: 'var(--ds-text-warning)',
  danger: 'var(--ds-text-danger)',
  dangerLight: 'var(--ds-background-danger)',
  dangerText: 'var(--ds-text-danger)',
  teal: 'var(--cp-teal-60, var(--ds-chart-teal-bold))',
  tealLight: 'var(--ds-surface)',
  tealText: 'var(--ds-text-success)',
  purple: 'var(--cp-purple-60, var(--ds-background-discovery-bold))',
  purpleLight: 'var(--ds-surface)',
  purpleText: 'var(--ds-text-discovery)',
  ink1: 'var(--ds-text)',
  ink2: 'var(--fg-1, var(--cp-ink-1, var(--cp-ink-1, var(--ds-text))))',
  ink3: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, var(--ds-text-subtle))))',
  ink4: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
  surface: 'var(--bg-1, var(--ds-surface-sunken))',
  card: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, var(--ds-surface))))',
  border: 'var(--bd-default, var(--cp-border, var(--cp-bg-sunken, var(--ds-border))))',
  borderLt: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken)))',
} as const;

// Status mental model — CG-05 enforced
export const R360_STATUS_STYLES: Record<string, {
  color: string; bg: string; dot: string; label: string;
}> = {
  'ToDo':        { color: 'var(--ds-text-warning)', bg: 'var(--ds-surface)', dot: 'var(--ds-text-warning, var(--cp-warning))', label: 'ToDo' },
  'In Progress': { color: 'var(--ds-text)', bg: 'var(--ds-background-selected)', dot: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', label: 'In Progress' },
  'In Review':   { color: 'var(--ds-text-success)', bg: 'var(--ds-surface)', dot: 'var(--cp-teal-60)', label: 'In Review' },
  'Done':        { color: 'var(--ds-text-success)', bg: 'var(--ds-surface)', dot: 'var(--ds-text-success, var(--cp-success))', label: 'Done' },
  'Blocked':     { color: 'var(--ds-text-danger)', bg: 'var(--ds-background-danger)', dot: 'var(--ds-text-danger)', label: 'Blocked' },
  'Re-Open':     { color: 'var(--ds-text-warning)', bg: 'var(--ds-surface)', dot: 'var(--ds-text-warning, var(--cp-warning))', label: 'Re-Open' },
};

// Project colors
export const R360_PROJECT_COLORS: Record<string, string> = {
  BAU: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
  SEN: 'var(--ds-text-warning, var(--cp-warning))',
  FAC: 'var(--ds-text-success, var(--cp-success))',
  OPS: 'var(--cp-teal-60, var(--ds-chart-teal-bold))',
  SUP: 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary)))',
  LND: 'var(--cp-purple-60, var(--ds-background-discovery-bold))',
};

// Jira issue type icon colors
export const R360_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  bug:     { bg: 'var(--ds-background-danger)', color: 'var(--ds-text-danger)' },
  task:    { bg: 'var(--ds-background-selected)', color: 'var(--ds-link)' },
  story:   { bg: 'var(--ds-surface)', color: 'var(--ds-text-success)' },
  epic:    { bg: 'var(--ds-surface)', color: 'var(--ds-text-discovery)' },
  subtask: { bg: 'var(--ds-surface)', color: 'var(--ds-link)' },
};

// Days sitting thresholds
export const R360_AGE_THRESHOLDS = {
  green: 7,
  amber: 14,
} as const;

// BANNED: Golden Hour palette — NEVER use these as primary
export const BANNED_COLORS = [
  'var(--ds-text-warning, var(--cp-amber))', 'var(--ds-text-warning)', 'var(--ds-text-warning)', 'var(--ds-text-warning)',
  'var(--ds-text-warning, var(--cp-warning))', // ONLY allowed as status warning, never as primary accent
] as const;
