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
  Initiative: { bg: '#DBEAFE', color: '#1E40AF' },
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
