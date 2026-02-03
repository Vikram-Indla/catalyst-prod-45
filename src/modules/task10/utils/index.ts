// ═══════════════════════════════════════════════════════════════════════════════
// UTILS INDEX
// Helper functions for Task¹⁰ module
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format date for display
 */
export function formatT10Date(dateString: string | null): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Check if today
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  
  // Check if tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  
  // Check if yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Format as "Feb 3" or "Feb 3, 2025" if different year
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' }),
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format week date (alias)
 */
export function formatWeekDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format short date
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format week range for display
 */
export function formatT10WeekRange(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startFormatted = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  const endFormatted = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Format week range (Date objects)
 */
export function formatWeekRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function formatT10RelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatT10Date(dateString);
}

/**
 * Get relative time (alias)
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatWeekDate(dateString);
}

/**
 * Get initials from name
 */
export function getT10Initials(name: string | null): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Calculate progress percentage
 */
export function getT10Progress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Get slots available (10 - total)
 */
export function getT10SlotsAvailable(total: number): number {
  return Math.max(0, 10 - total);
}

/**
 * Check if date is overdue
 */
export function isT10Overdue(dateString: string | null): boolean {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date < today;
}

/**
 * Get rank tier
 */
export function getRankTier(rank: number): 'top' | 'mid' | 'buffer' {
  if (rank <= 5) return 'top';
  if (rank <= 10) return 'mid';
  return 'buffer';
}

/**
 * Get due status
 */
export function getDueStatus(dueDate: string): 'normal' | 'today' | 'overdue' {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return 'normal';
}

/**
 * Get week start date (Monday) from any date
 */
export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Get week end date (Sunday) from any date
 */
export function getWeekEndDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Add weeks to date
 */
export function addWeeks(dateString: string, weeks: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString();
}

/**
 * Generate list key
 */
export function generateListKey(index: number): string {
  return `T10-${String(index).padStart(3, '0')}`;
}

/**
 * Generate task key
 */
export function generateTaskKey(index: number): string {
  return `TSK-${String(index).padStart(3, '0')}`;
}

/**
 * Debounce function for search
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Generate contrasting text color for background
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
