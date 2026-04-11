import type { ViewType, ResourceMetric, CapacityProject, AiRecommendation, ResourceAllocation } from '@/modules/capacity-planner';
import type { useAssignments } from '@/modules/capacity-planner';

export type PeriodType = 'weekly' | 'monthly' | 'quarterly';
export type ProjectPeriodType = 'weekly' | 'monthly';
export type GroupByType = 'none' | 'assignment' | 'department';

// Re-export types used by sub-components
export type { ViewType, ResourceMetric, CapacityProject, AiRecommendation, ResourceAllocation };

// Department colors - Catalyst V5 compliant
export const departmentColors: Record<string, { bg: string; text: string; badge: string }> = {
  Product: { bg: 'bg-[#3b82f6]', text: 'text-white', badge: 'bg-[#3b82f6]/15 text-[#2563eb]' },
  Delivery: { bg: 'bg-[#0d9488]', text: 'text-white', badge: 'bg-[#2563eb]/10 text-[#2563eb]' },
  Support: { bg: 'bg-[#10b981]', text: 'text-white', badge: 'bg-[#10b981]/15 text-[#10b981]' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', badge: 'bg-muted text-muted-foreground' },
};

export const projectColors = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#10b981', // Green
  '#3b82f6', // Light Blue
  '#0f766e', // Teal Dark
  '#14b8a6', // Teal Light
];

// FILLED project colors for Timeline bars — Catalyst V5 compliant
export const TIMELINE_PROJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Senaei BAU': { bg: '#2563eb', text: '#ffffff' },
  'Senaei': { bg: '#2563eb', text: '#ffffff' },
  'Innovation Platform': { bg: '#1d4ed8', text: '#ffffff' },
  'Innovation': { bg: '#1d4ed8', text: '#ffffff' },
  'Inspection Project': { bg: '#0d9488', text: '#ffffff' },
  'Inspection': { bg: '#0d9488', text: '#ffffff' },
  'International Relations': { bg: '#0f766e', text: '#ffffff' },
  'International': { bg: '#0f766e', text: '#ffffff' },
  'MIM Website': { bg: '#14b8a6', text: '#ffffff' },
  'MIM': { bg: '#14b8a6', text: '#ffffff' },
  'Senaei OPS': { bg: '#3b82f6', text: '#ffffff' },
  'Sectorial Services': { bg: '#64748b', text: '#ffffff' },
  'Sectorial': { bg: '#64748b', text: '#ffffff' },
  'Tahommena': { bg: '#0d9488', text: '#ffffff' },
  'Data Platform': { bg: '#3b82f6', text: '#ffffff' },
  'Data': { bg: '#3b82f6', text: '#ffffff' },
  'ICP': { bg: '#2563eb', text: '#ffffff' },
};

// Get project color with fallback
export const getTimelineProjectColor = (name: string) => {
  if (TIMELINE_PROJECT_COLORS[name]) return TIMELINE_PROJECT_COLORS[name];

  const key = Object.keys(TIMELINE_PROJECT_COLORS).find(k =>
    name.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(name.toLowerCase())
  );

  return key ? TIMELINE_PROJECT_COLORS[key] : { bg: '#64748b', text: '#ffffff' };
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
