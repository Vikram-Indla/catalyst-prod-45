/**
 * WorkHub Time Range Utilities — Phase 6
 */

export interface TimeRange {
  label: string;
  start: string;
  end: string;
}

export function getTimeRanges(): TimeRange[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const daysAgo = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d;
  };

  return [
    { label: 'All Time', start: '', end: '' },
    { label: 'Current Month', start: fmt(startOfMonth), end: fmt(endOfMonth) },
    { label: 'Last 2 Weeks', start: fmt(daysAgo(14)), end: fmt(now) },
    { label: 'Last Week', start: fmt(daysAgo(7)), end: fmt(now) },
    { label: 'Last Month', start: fmt(prevMonthStart), end: fmt(prevMonthEnd) },
  ];
}

export function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate) return false;
  if (status === 'Done' || status === 'Cancelled') return false;
  return new Date(dueDate) < new Date();
}

export function daysDifference(date: string): number {
  const diff = new Date().getTime() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
