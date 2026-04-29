// src/constants/resource360.ts — Design tokens and constants for Resource 360° View

export const HUB_COLORS: Record<string, string> = {
  StrategyHub: '#0EA5E9',
  ProductHub: '#8B5CF6',
  ProjectHub: '#2563EB',
  ReleaseHub: '#0D9488',
  TestHub: '#D97706',
  IncidentHub: '#DC2626',
  TaskHub: '#059669',
};

export const HUB_SHORT: Record<string, string> = {
  StrategyHub: 'STRAT',
  ProductHub: 'PROD',
  ProjectHub: 'PROJ',
  ReleaseHub: 'REL',
  TestHub: 'TEST',
  IncidentHub: 'INC',
  TaskHub: 'TASK',
};

export const STATUS_CATEGORY_COLORS = {
  todo: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5', dot: '#DC2626' },
  progress: { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD', dot: '#2563EB' },
  done: { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7', dot: '#059669' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#D97706',
  Low: '#64748B',
};

export const PRIORITY_ICONS: Record<string, string> = {
  Critical: '🔴',
  High: '🟠',
  Medium: '🟡',
  Low: '⚪',
};

export const WIT_STYLES: Record<string, { bg: string; color: string }> = {
  Request: { bg: '#DBEAFE', color: '#1E40AF' },
  Epic: { bg: '#EDE9FE', color: '#6D28D9' },
  Feature: { bg: '#E0E7FF', color: '#3730A3' },
  Story: { bg: '#DBEAFE', color: '#1D4ED8' },
  Subtask: { bg: '#E0E7FF', color: '#3730A3' },
  Bug: { bg: '#FEE2E2', color: '#B91C1C' },
  Task: { bg: '#F1F5F9', color: '#334155' },
  'Test Case': { bg: '#FEF3C7', color: '#92400E' },
  'Test Plan': { bg: '#FEF3C7', color: '#92400E' },
  Incident: { bg: '#FEE2E2', color: '#991B1B' },
  Release: { bg: '#CCFBF1', color: '#0F766E' },
  Requirement: { bg: '#FCE7F3', color: '#9D174D' },
};

// BANNED COLORS — Golden Hour palette. If any of these appear in code, it is a bug.
// #C69C6D, #5C7C5C, #8B7355, #D4B896 — NEVER USE

// ═══════════════════════════════════════════════════════════
// RESOURCE 360° — Member Detail Design System Constants
// Ring-fenced tokens that override Catalyst V11 when needed
// ═══════════════════════════════════════════════════════════

export const R360_TOKENS = {
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryLight: '#EFF6FF',
  primaryDark: '#1E3A5F',
  success: '#16A34A',
  successLight: '#F0FDF4',
  successText: '#14532D',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  warningText: '#78350F',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  dangerText: '#7F1D1D',
  teal: '#0D9488',
  tealLight: '#F0FDFA',
  tealText: '#134E4A',
  purple: '#7C3AED',
  purpleLight: '#F5F3FF',
  purpleText: '#4C1D95',
  ink1: '#020617',
  ink2: 'var(--fg-1, #0F172A)',
  ink3: '#334155',
  ink4: '#64748B',
  surface: 'var(--bg-1, #F8FAFC)',
  card: '#FFFFFF',
  border: 'var(--bd-default, #E2E8F0)',
  borderLt: '#F1F5F9',
} as const;

// Status mental model — CG-05 enforced
export const R360_STATUS_STYLES: Record<string, {
  color: string; bg: string; dot: string; label: string;
}> = {
  'ToDo':        { color: '#78350F', bg: '#FFFBEB', dot: '#D97706', label: 'ToDo' },
  'In Progress': { color: '#1E3A5F', bg: '#EFF6FF', dot: '#2563EB', label: 'In Progress' },
  'In Review':   { color: '#134E4A', bg: '#F0FDFA', dot: '#0D9488', label: 'In Review' },
  'Done':        { color: '#14532D', bg: '#F0FDF4', dot: '#16A34A', label: 'Done' },
  'Blocked':     { color: '#7F1D1D', bg: '#FEF2F2', dot: '#EF4444', label: 'Blocked' },
  'Re-Open':     { color: '#78350F', bg: '#FFFBEB', dot: '#D97706', label: 'Re-Open' },
};

// Project colors
export const R360_PROJECT_COLORS: Record<string, string> = {
  BAU: '#2563EB',
  SEN: '#D97706',
  FAC: '#16A34A',
  OPS: '#0D9488',
  SUP: '#64748B',
  LND: '#7C3AED',
};

// Jira issue type icon colors
export const R360_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  bug:     { bg: '#FEF2F2', color: '#E5493A' },
  task:    { bg: '#EFF6FF', color: '#4BADE8' },
  story:   { bg: '#F0FDF4', color: '#63BA3C' },
  epic:    { bg: '#F5F3FF', color: '#904EE2' },
  subtask: { bg: '#F0FDFA', color: '#4BADE8' },
};

// Days sitting thresholds
export const R360_AGE_THRESHOLDS = {
  green: 7,
  amber: 14,
} as const;

// BANNED: Golden Hour palette — NEVER use these as primary
export const BANNED_COLORS = [
  '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A',
  '#D97706', // ONLY allowed as status warning, never as primary accent
] as const;
