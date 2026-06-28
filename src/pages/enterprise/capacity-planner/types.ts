import type { ViewType, ResourceMetric, CapacityProject, AiRecommendation, ResourceAllocation } from '@/modules/capacity-planner';
import type { useAssignments } from '@/modules/capacity-planner';

export type PeriodType = 'weekly' | 'monthly' | 'quarterly';
export type ProjectPeriodType = 'weekly' | 'monthly';
export type GroupByType = 'none' | 'assignment' | 'department';

// Re-export types used by sub-components
export type { ViewType, ResourceMetric, CapacityProject, AiRecommendation, ResourceAllocation };

// Department colors - Catalyst V5 compliant
export const departmentColors: Record<string, { bg: string; text: string; badge: string }> = {
  Product: { bg: 'bg-[var(--ds-text-brand)]', text: 'text-white', badge: 'bg-[var(--ds-text-brand)]/15 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]' },
  Delivery: { bg: 'bg-[var(--ds-chart-teal-bold)]', text: 'text-white', badge: 'bg-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]/10 text-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary))]' },
  Support: { bg: 'bg-[var(--ds-background-success-bold)]', text: 'text-white', badge: 'bg-[var(--ds-background-success-bold)]/15 text-[var(--ds-background-success-bold)]' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

export const projectColors = [
  'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', // Blue
  'var(--ds-chart-teal-bold)', // Teal
  'var(--ds-background-success-bold)', // Green
  'var(--ds-text-brand)', // Light Blue
  'var(--ds-chart-teal-bolder)', // Teal Dark
  'var(--ds-background-accent-teal-bolder)', // Teal Light
];

// FILLED project colors for Timeline bars — Catalyst V5 compliant
export const TIMELINE_PROJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Senaei BAU': { bg: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Senaei': { bg: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Innovation Platform': { bg: 'var(--ds-background-brand-bold-hovered)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Innovation': { bg: 'var(--ds-background-brand-bold-hovered)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Inspection Project': { bg: 'var(--ds-chart-teal-bold)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Inspection': { bg: 'var(--ds-chart-teal-bold)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'International Relations': { bg: 'var(--ds-chart-teal-bolder)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'International': { bg: 'var(--ds-chart-teal-bolder)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'MIM Website': { bg: 'var(--ds-background-accent-teal-bolder)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'MIM': { bg: 'var(--ds-background-accent-teal-bolder)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Senaei OPS': { bg: 'var(--ds-text-brand)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Sectorial Services': { bg: 'var(--ds-text-subtlest)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Sectorial': { bg: 'var(--ds-text-subtlest)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Tahommena': { bg: 'var(--ds-chart-teal-bold)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Data Platform': { bg: 'var(--ds-text-brand)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'Data': { bg: 'var(--ds-text-brand)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
  'ICP': { bg: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' },
};

// Get project color with fallback
export const getTimelineProjectColor = (name: string) => {
  if (TIMELINE_PROJECT_COLORS[name]) return TIMELINE_PROJECT_COLORS[name];

  const key = Object.keys(TIMELINE_PROJECT_COLORS).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(name.toLowerCase())
  );

  return key ? TIMELINE_PROJECT_COLORS[key] : { bg: 'var(--ds-text-subtlest)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated)))' };
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
