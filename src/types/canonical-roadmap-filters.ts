// Canonical Roadmap Filter Types (Single Source of Truth for all Roadmap views)

export type ProgressRange = '0_25' | '25_50' | '50_75' | '75_100';

export type KRCondition = 'HAS_OVERDUE_KRS' | 'ALL_KRS_COMPLETE' | 'NO_KRS';

export interface FilterState {
  status: string[];           // Objective status (multi-select)
  themeIds: string[];         // Theme multi-select
  ownerIds: string[];         // Owner / assignee multi-select
  progressRanges: ProgressRange[];  // Progress buckets
  krConditions: KRCondition[];     // Derived KR filters
}

export interface TimelineState {
  mode: 'default' | 'custom';
  startDate?: Date;
  endDate?: Date;
}

// Default values
export const EMPTY_FILTERS: FilterState = {
  status: [],
  themeIds: [],
  ownerIds: [],
  progressRanges: [],
  krConditions: [],
};

export const DEFAULT_TIMELINE: TimelineState = {
  mode: 'default',
};

// Progress range helpers
export const PROGRESS_RANGE_CONFIG: { key: ProgressRange; min: number; max: number; label: string }[] = [
  { key: '0_25', min: 0, max: 25, label: '0-25%' },
  { key: '25_50', min: 25, max: 50, label: '25-50%' },
  { key: '50_75', min: 50, max: 75, label: '50-75%' },
  { key: '75_100', min: 75, max: 100, label: '75-100%' },
];

// KR condition helpers
export const KR_CONDITION_CONFIG: { key: KRCondition; label: string; color: string }[] = [
  { key: 'HAS_OVERDUE_KRS', label: 'Has Overdue KRs', color: 'hsl(var(--destructive))' },
  { key: 'ALL_KRS_COMPLETE', label: 'All KRs Complete', color: 'hsl(var(--secondary-green))' },
  { key: 'NO_KRS', label: 'No Key Results', color: 'hsl(var(--muted-foreground))' },
];

// Badge count logic (excludes timeline)
export function countFilterSelections(filters: FilterState): number {
  return (
    filters.status.length +
    filters.themeIds.length +
    filters.ownerIds.length +
    filters.progressRanges.length +
    filters.krConditions.length
  );
}

// Check if filters are equal
export function areFiltersEqual(a: FilterState, b: FilterState): boolean {
  return (
    JSON.stringify([...a.status].sort()) === JSON.stringify([...b.status].sort()) &&
    JSON.stringify([...a.themeIds].sort()) === JSON.stringify([...b.themeIds].sort()) &&
    JSON.stringify([...a.ownerIds].sort()) === JSON.stringify([...b.ownerIds].sort()) &&
    JSON.stringify([...a.progressRanges].sort()) === JSON.stringify([...b.progressRanges].sort()) &&
    JSON.stringify([...a.krConditions].sort()) === JSON.stringify([...b.krConditions].sort())
  );
}
