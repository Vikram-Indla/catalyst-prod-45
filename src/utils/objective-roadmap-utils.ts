import { Objective, Theme, ObjectiveGroup, TimeUnit, Scale, GroupBy, ActiveFilters } from '../types/objective-roadmap';

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function calcPosition(date: Date, timelineStart: Date, timelineEnd: Date): number {
  const total = timelineEnd.getTime() - timelineStart.getTime();
  const pos = date.getTime() - timelineStart.getTime();
  return Math.max(0, Math.min(100, (pos / total) * 100));
}

export function getQuarter(date: Date): string {
  return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
}

export function generateTimeUnits(scale: Scale, timelineStart: Date, timelineEnd: Date): TimeUnit[] {
  const units: TimeUnit[] = [];
  const start = new Date(timelineStart);
  const end = new Date(timelineEnd);
  const now = new Date();
  
  if (scale === 'weekly') {
    // Start from beginning of week containing timelineStart
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);
    
    while (start <= end) {
      const weekEnd = new Date(start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const isCurrent = now >= start && now <= weekEnd;
      units.push({
        label: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        isCurrent
      });
      start.setDate(start.getDate() + 7);
    }
  } else if (scale === 'monthly') {
    while (start <= end) {
      const isCurrent = start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
      units.push({
        label: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        isCurrent
      });
      start.setMonth(start.getMonth() + 1);
    }
  } else if (scale === 'quarterly') {
    while (start <= end) {
      const quarter = Math.floor(start.getMonth() / 3) + 1;
      const nowQuarter = Math.floor(now.getMonth() / 3) + 1;
      const isCurrent = quarter === nowQuarter && start.getFullYear() === now.getFullYear();
      units.push({
        label: `Q${quarter} ${start.getFullYear()}`,
        isCurrent
      });
      start.setMonth(start.getMonth() + 3);
    }
  } else {
    // yearly
    while (start <= end) {
      const isCurrent = start.getFullYear() === now.getFullYear();
      units.push({
        label: start.getFullYear().toString(),
        isCurrent
      });
      start.setFullYear(start.getFullYear() + 1);
    }
  }
  return units;
}

export function groupObjectives(
  objectives: Objective[],
  groupBy: GroupBy,
  themes: Theme[]
): ObjectiveGroup[] {
  if (groupBy === 'none') {
    return [{ key: 'all', name: 'All Objectives', items: objectives, color: 'var(--brand-gold)' }];
  }
  
  if (groupBy === 'theme') {
    const groups: Record<string, ObjectiveGroup> = {};
    objectives.forEach(obj => {
      const theme = themes.find(t => t.id === obj.themeId) || { id: 'unassigned', name: 'Unassigned', color: 'var(--secondary-grey)' };
      if (!groups[obj.themeId]) {
        groups[obj.themeId] = { key: obj.themeId, name: theme.name, items: [], color: theme.color };
      }
      groups[obj.themeId].items.push(obj);
    });
    return Object.values(groups);
  }
  
  if (groupBy === 'quarter') {
    const groups: Record<string, ObjectiveGroup> = {};
    objectives.forEach(obj => {
      const q = getQuarter(obj.startDate);
      if (!groups[q]) {
        groups[q] = { key: q, name: q, items: [], color: 'var(--brand-gold)' };
      }
      groups[q].items.push(obj);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }
  
  return [];
}

export function countNeedAttention(objectives: Objective[]): number {
  return objectives.filter(o => o.status === 'at-risk' || o.status === 'off-track').length;
}

export function hasOverdueKRs(obj: Objective): boolean {
  return obj.keyResults.some(kr => kr.status === 'overdue');
}

export function hasAllCompleteKRs(obj: Objective): boolean {
  return obj.keyResults.length > 0 && obj.keyResults.every(kr => kr.status === 'complete');
}

export function hasNoKRs(obj: Objective): boolean {
  return obj.keyResults.length === 0;
}

export function filterObjectives(
  objectives: Objective[],
  filters: ActiveFilters,
  searchQuery: string
): Objective[] {
  return objectives.filter(obj => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!obj.name.toLowerCase().includes(q) && !obj.id.toLowerCase().includes(q)) {
        return false;
      }
    }
    
    if (filters.status.length > 0 && !filters.status.includes(obj.status)) {
      return false;
    }
    
    if (filters.theme.length > 0 && !filters.theme.includes(obj.themeId)) {
      return false;
    }
    
    if (obj.progress < filters.progressMin || obj.progress > filters.progressMax) {
      return false;
    }
    
    if (filters.owner.length > 0 && !filters.owner.includes(obj.ownerId)) {
      return false;
    }
    
    if (filters.kr.length > 0) {
      let matches = false;
      if (filters.kr.includes('has-overdue') && hasOverdueKRs(obj)) matches = true;
      if (filters.kr.includes('all-complete') && hasAllCompleteKRs(obj)) matches = true;
      if (filters.kr.includes('no-kr') && hasNoKRs(obj)) matches = true;
      if (!matches) return false;
    }
    
    return true;
  });
}

export function countActiveFilters(filters: ActiveFilters): number {
  let count = 0;
  count += filters.status.length;
  count += filters.theme.length;
  count += filters.owner.length;
  count += filters.kr.length;
  if (filters.progressMin > 0 || filters.progressMax < 100) count++;
  return count;
}

export const DATE_FILTER_PRESETS = [
  { key: 'q1', label: 'Q1 2025', start: '2025-01-01', end: '2025-03-31' },
  { key: 'q2', label: 'Q2 2025', start: '2025-04-01', end: '2025-06-30' },
  { key: 'q3', label: 'Q3 2025', start: '2025-07-01', end: '2025-09-30' },
  { key: 'q4', label: 'Q4 2025', start: '2025-10-01', end: '2025-12-31' },
  { key: 'h1', label: 'H1 2025', start: '2025-01-01', end: '2025-06-30' },
  { key: 'h2', label: 'H2 2025', start: '2025-07-01', end: '2025-12-31' },
  { key: 'year', label: 'Full Year', start: '2025-01-01', end: '2025-12-31' },
];

export const DEFAULT_FILTERS: ActiveFilters = {
  status: [],
  theme: [],
  progressMin: 0,
  progressMax: 100,
  owner: [],
  kr: []
};
