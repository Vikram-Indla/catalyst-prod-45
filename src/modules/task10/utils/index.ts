// Task10 Utilities

export function formatWeekDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function generateListKey(index: number): string {
  return `T10-${String(index).padStart(3, '0')}`;
}

export function generateTaskKey(index: number): string {
  return `TSK-${String(index).padStart(3, '0')}`;
}

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

export function getRankTier(rank: number): 'top' | 'mid' | 'buffer' {
  if (rank <= 5) return 'top';
  if (rank <= 10) return 'mid';
  return 'buffer';
}

export function getDueStatus(dueDate: string): 'normal' | 'today' | 'overdue' {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  if (due < today) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return 'normal';
}

export function getWeekStartDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function addWeeks(dateString: string, weeks: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString();
}
