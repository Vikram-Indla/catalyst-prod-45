export const slugify = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
export const initials = (name: string) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
export const truncate = (s: string, len: number) => s.length > len ? s.slice(0, len) + '…' : s;

export function ageColor(days: number): 'green' | 'amber' | 'red' {
  return days <= 7 ? 'green' : days <= 14 ? 'amber' : 'red';
}

export function ageBarPercent(days: number): number {
  return Math.min(days / 21 * 100, 100);
}

export function ageBarColor(days: number): string {
  return days <= 7 ? '#16A34A' : days <= 14 ? '#D97706' : '#EF4444';
}

export function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1d ago';
  return `${diff}d ago`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
