/**
 * Project Color Registry
 * Centralized project-to-color mapping for Resource Allocation Grid
 * Strategy D: Horizontal Bar
 */

export const PROJECT_COLORS = {
  sectorial: {
    slug: 'sectorial',
    name: 'Sectorial Services',
    bar: '#3b82f6',
  },
  dataplatform: {
    slug: 'dataplatform',
    name: 'Data Platform',
    bar: '#10b981',
  },
  senaei: {
    slug: 'senaei',
    name: 'Senaei 3.0',
    bar: '#f59e0b',
  },
  tahommena: {
    slug: 'tahommena',
    name: 'Tahommena 2.0',
    bar: '#ec4899',
  },
  inspection: {
    slug: 'inspection',
    name: 'Inspection Project',
    bar: '#8b5cf6',
  },
  irplatform: {
    slug: 'irplatform',
    name: 'IR Platform - Phase 1',
    bar: '#06b6d4',
  },
} as const;

export type ProjectSlug = keyof typeof PROJECT_COLORS;

/**
 * Get project slug from assignment name
 * Normalizes name to lowercase, removes spaces/special chars
 */
export function getProjectSlug(assignmentName: string): ProjectSlug | 'default' {
  const normalized = assignmentName.toLowerCase().replace(/[\s\-_.]/g, '');
  
  if (normalized.includes('sectorial')) return 'sectorial';
  if (normalized.includes('dataplatform') || normalized.includes('data')) return 'dataplatform';
  if (normalized.includes('senaei')) return 'senaei';
  if (normalized.includes('tahommena')) return 'tahommena';
  if (normalized.includes('inspection')) return 'inspection';
  if (normalized.includes('irplatform') || normalized.includes('ir')) return 'irplatform';
  
  return 'default';
}

/**
 * Get bar color for a project
 */
export function getProjectBarColor(assignmentName: string): string {
  const slug = getProjectSlug(assignmentName);
  if (slug === 'default') return '#3b82f6'; // Default blue
  return PROJECT_COLORS[slug].bar;
}

/**
 * Default color for unknown projects
 */
export const DEFAULT_PROJECT_COLOR = '#3b82f6';
