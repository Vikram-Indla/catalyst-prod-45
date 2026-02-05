// ============================================================
// PRIORITIES MODULE — Helper Functions
// ============================================================
// File: src/modules/priorities/utils/priorities.helpers.ts
// ============================================================

import type {
  PriItemStatus,
  PriWeekStatus,
  PriWorkstream,
  PriItemFull,
  PriItemsSplit,
  PriListFull,
} from '../types';

// ======================== STATUS HELPERS ========================

/**
 * Get the next status in the cycle: todo → in_progress → completed → todo
 */
export function getNextStatus(current: PriItemStatus): PriItemStatus {
  const cycle: Record<PriItemStatus, PriItemStatus> = {
    todo: 'in_progress',
    in_progress: 'completed',
    completed: 'todo',
  };
  return cycle[current];
}

/**
 * Get status display label
 */
export function getStatusLabel(status: PriItemStatus): string {
  const labels: Record<PriItemStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed',
  };
  return labels[status];
}

/**
 * Get week status display label
 */
export function getWeekStatusLabel(status: PriWeekStatus): string {
  const labels: Record<PriWeekStatus, string> = {
    active: 'Active',
    checked_out: 'Checked Out',
    archived: 'Archived',
  };
  return labels[status];
}

/**
 * Get CSS class suffix for status
 */
export function getStatusClass(status: PriItemStatus): string {
  const classes: Record<PriItemStatus, string> = {
    todo: 'todo',
    in_progress: 'in-progress',
    completed: 'completed',
  };
  return classes[status];
}

// ======================== WORKSTREAM HELPERS ========================

/**
 * Workstream configuration with colors and labels
 */
export const WORKSTREAM_CONFIG: Record<PriWorkstream, { label: string; color: string }> = {
  senaie:     { label: 'Senaie',      color: '#06b6d4' },
  catalyst:   { label: 'Catalyst',    color: '#8b5cf6' },
  tahommona:  { label: 'Tahommona',   color: '#6366f1' },
  delivery:   { label: 'Delivery',    color: '#f97316' },
  mim:        { label: 'MIM',         color: '#ec4899' },
  standalone: { label: 'Stand-Alone', color: '#84cc16' },
  dataai:     { label: 'Data & AI',   color: '#14b8a6' },
};

export function getWorkstreamColor(ws: PriWorkstream | null): string {
  if (!ws) return '#9ca3af';
  return WORKSTREAM_CONFIG[ws]?.color ?? '#9ca3af';
}

export function getWorkstreamLabel(ws: PriWorkstream | null): string {
  if (!ws) return 'General';
  return WORKSTREAM_CONFIG[ws]?.label ?? 'General';
}

// ======================== DATE HELPERS ========================

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format a date string to "Feb 5" or "Feb 5, 2026"
 */
export function formatShortDate(dateStr: string, includeYear = false): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = MONTH_SHORT[d.getMonth()];
  const day = d.getDate();
  return includeYear ? `${month} ${day}, ${d.getFullYear()}` : `${month} ${day}`;
}

/**
 * Format a week range: "Feb 2 – Feb 6, 2026"
 * If same month: "Feb 2 – 6, 2026"
 */
export function formatWeekRange(startStr: string, endStr: string): string {
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');

  const startMonth = MONTH_SHORT[start.getMonth()];
  const endMonth = MONTH_SHORT[end.getMonth()];
  const year = end.getFullYear();

  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${year}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`;
}

/**
 * Get the Monday of the current week
 */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(now.setDate(diff));
}

/**
 * Check if a date is in the current week
 */
export function isCurrentWeek(weekStartStr: string): boolean {
  const weekStart = new Date(weekStartStr + 'T00:00:00');
  const currentStart = getCurrentWeekStart();
  return weekStart.getTime() === currentStart.getTime();
}

/**
 * Format relative time: "2 hours ago", "Yesterday", "Feb 2"
 */
export function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatShortDate(dateStr);
}

// ======================== ITEM HELPERS ========================

/**
 * Split items into top 10 and overflow, sorted by rank
 */
export function splitItems(items: PriItemFull[]): PriItemsSplit {
  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  return {
    top: sorted.filter((i) => i.rank <= 10),
    overflow: sorted.filter((i) => i.rank > 10),
    all: sorted,
  };
}

/**
 * Calculate next rank for a new item in a week
 */
export function getNextRank(items: PriItemFull[]): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.rank)) + 1;
}

/**
 * Get completion percentage for a week
 */
export function getCompletionPercent(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Get progress bar color class based on completion
 */
export function getProgressColor(percent: number): string {
  if (percent >= 80) return 'success';
  if (percent >= 40) return 'primary';
  return 'warning';
}

// ======================== LIST HELPERS ========================

/**
 * Generate the next list key (T10-001, T10-002, etc.)
 */
export function generateListKey(existingLists: PriListFull[]): string {
  const maxNum = existingLists.reduce((max, list) => {
    // This is display-only, not stored in DB
    return max + 1;
  }, 0);
  return `T10-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Pluralize with count: "1 list", "3 lists"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : plural ?? singular + 's'}`;
}

// ======================== FILTER HELPERS ========================

/**
 * Filter lists by tab view
 */
export function filterListsByTab(
  lists: PriListFull[],
  tab: 'this_week' | 'completed' | 'archived'
): PriListFull[] {
  switch (tab) {
    case 'this_week':
      return lists.filter(
        (l) => l.status === 'active' && l.current_week_id !== null
      );
    case 'completed':
      return lists.filter(
        (l) => l.status === 'active' && l.current_week_id === null
      );
    case 'archived':
      return lists.filter((l) => l.status === 'archived');
  }
}

// ======================== QUERY KEYS ========================

export const PRI_QUERY_KEYS = {
  lists: ['pri', 'lists'] as const,
  list: (id: string) => ['pri', 'lists', id] as const,
  weeks: (listId: string) => ['pri', 'weeks', listId] as const,
  week: (weekId: string) => ['pri', 'week', weekId] as const,
  currentWeek: (listId: string) => ['pri', 'currentWeek', listId] as const,
  items: (weekId: string) => ['pri', 'items', weekId] as const,
  labels: (listId: string) => ['pri', 'labels', listId] as const,
  notes: (itemId: string) => ['pri', 'notes', itemId] as const,
  history: (itemId: string) => ['pri', 'history', itemId] as const,
} as const;
