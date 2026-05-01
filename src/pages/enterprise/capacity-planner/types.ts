import type { ViewType, ResourceMetric, CapacityProject, AiRecommendation, ResourceAllocation } from '@/modules/capacity-planner';
import type { useAssignments } from '@/modules/capacity-planner';

export type PeriodType = 'weekly' | 'monthly' | 'quarterly';
export type ProjectPeriodType = 'weekly' | 'monthly';
export type GroupByType = 'none' | 'assignment' | 'department';

// Re-export types used by sub-components
export type { ViewType, ResourceMetric, CapacityProject, AiRecommendation, ResourceAllocation };

// Department colors - Catalyst V5 compliant
export const departmentColors: Record<string, { bg: string; text: string; badge: string }> = {
  Product: { bg: 'bg-[var(--ds-text-brand,#3b82f6)]', text: 'text-white', badge: 'bg-[var(--ds-text-brand,#3b82f6)]/15 text-[var(--ds-text-brand,#2563eb)]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white', badge: 'bg-[var(--ds-text-brand,#2563eb)]/10 text-[var(--ds-text-brand,#2563eb)]' },
  Support: { bg: 'bg-[#10b981]', text: 'text-white', badge: 'bg-[#10b981]/15 text-[#10b981]' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

export const projectColors = [
  'var(--ds-text-brand, #2563eb)', // Blue
  '#0d9488', // Teal
  '#10b981', // Green
  'var(--ds-text-brand, #3b82f6)', // Light Blue
  '#0f766e', // Teal Dark
  '#14b8a6', // Teal Light
];

// FILLED project colors for Timeline bars — Catalyst V5 compliant
export const TIMELINE_PROJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Senaei BAU': { bg: 'var(--ds-text-brand, #2563eb)', text: 'var(--ds-surface, #ffffff)' },
  'Senaei': { bg: 'var(--ds-text-brand, #2563eb)', text: 'var(--ds-surface, #ffffff)' },
  'Innovation Platform': { bg: 'var(--ds-background-brand-bold-hovered, #1d4ed8)', text: 'var(--ds-surface, #ffffff)' },
  'Innovation': { bg: 'var(--ds-background-brand-bold-hovered, #1d4ed8)', text: 'var(--ds-surface, #ffffff)' },
  'Inspection Project': { bg: '#0d9488', text: 'var(--ds-surface, #ffffff)' },
  'Inspection': { bg: '#0d9488', text: 'var(--ds-surface, #ffffff)' },
  'International Relations': { bg: '#0f766e', text: 'var(--ds-surface, #ffffff)' },
  'International': { bg: '#0f766e', text: 'var(--ds-surface, #ffffff)' },
  'MIM Website': { bg: '#14b8a6', text: 'var(--ds-surface, #ffffff)' },
  'MIM': { bg: '#14b8a6', text: 'var(--ds-surface, #ffffff)' },
  'Senaei OPS': { bg: 'var(--ds-text-brand, #3b82f6)', text: 'var(--ds-surface, #ffffff)' },
  'Sectorial Services': { bg: 'var(--ds-text-subtlest, #64748b)', text: 'var(--ds-surface, #ffffff)' },
  'Sectorial': { bg: 'var(--ds-text-subtlest, #64748b)', text: 'var(--ds-surface, #ffffff)' },
  'Tahommena': { bg: '#0d9488', text: 'var(--ds-surface, #ffffff)' },
  'Data Platform': { bg: 'var(--ds-text-brand, #3b82f6)', text: 'var(--ds-surface, #ffffff)' },
  'Data': { bg: 'var(--ds-text-brand, #3b82f6)', text: 'var(--ds-surface, #ffffff)' },
  'ICP': { bg: 'var(--ds-text-brand, #2563eb)', text: 'var(--ds-surface, #ffffff)' },
};

// Get project color with fallback
export const getTimelineProjectColor = (name: string) => {
  if (TIMELINE_PROJECT_COLORS[name]) return TIMELINE_PROJECT_COLORS[name];

  const key = Object.keys(TIMELINE_PROJECT_COLORS).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(name.toLowerCase())
  );

  return key ? TIMELINE_PROJECT_COLORS[key] : { bg: 'var(--ds-text-subtlest, #64748b)', text: 'var(--ds-surface, #ffffff)' };
};

// Short form names for project display in timeline cells
export const PROJECT_SHORT_NAMES: Record<string, string> = {
  'Senaei BAU': 'Senaei',
  'Innovation Platform': 'Innovation',
  'Inspection Project': 'Inspection',
  'International Relations': 'International',
  'MIM Website': 'MIM',
  'Senaei OPS': 'Senaei OPS',
  'Sectorial Services': 'Sectorial',
  'Tahommena': 'Tahommena',
  'Data Platform': 'Data',
};

// Get short name for a project, with fallback to first word
export const getProjectShortName = (fullName: string): string => {
  if (PROJECT_SHORT_NAMES[fullName]) return PROJECT_SHORT_NAMES[fullName];
  const firstWord = fullName.split(' ')[0];
  return firstWord.length > 10 ? firstWord.substring(0, 10) : firstWord;
};
