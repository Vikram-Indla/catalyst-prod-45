/**
 * StoryDetailModal — Helper/utility functions
 * Extracted from StoryDetailModal.tsx for modularity
 */
import { STATUS_STYLES, STATUS_CATEGORIES } from './constants';

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function getStatusCategory(s: string): string {
  const lower = s.toLowerCase();
  if (['done', 'completed', 'approved', 'closed', 'released'].some(k => lower.includes(k))) return 'done';
  if (['progress', 'review', 'beta', 'active', 'development', 'requirements'].some(k => lower.includes(k))) return 'in_progress';
  return 'todo';
}

export function getStatusStyle(status: string, category: string) {
  const s = status.toLowerCase();
  if (s === 'blocked') return STATUS_STYLES.blocked;
  if (s === 'on hold') return STATUS_STYLES.on_hold;
  if (s === 'in uat') return STATUS_STYLES.in_uat;
  if (s === 'in beta') return STATUS_STYLES.in_beta;
  if (s === 'in production') return STATUS_STYLES.in_prod;
  if (s === 'in review') return STATUS_STYLES.in_review;
  return STATUS_STYLES[category] ?? STATUS_STYLES.todo;
}

export function getInitials(name?: string | null): string {
  if (!name?.trim()) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export function getAvatarColor(id: string): string {
  const colors = ['#0052CC', '#6554C0', '#36B37E', '#FF5630', '#FF991F', '#00B8D9', '#166534', '#9E4C00'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getLozengeVariant(statusCategory: 'todo' | 'in_progress' | 'done'): 'grey' | 'blue' | 'green' {
  if (statusCategory === 'done') return 'green';
  if (statusCategory === 'in_progress') return 'blue';
  return 'grey';
}

export function nextPos(items: { position: number }[]): number {
  if (!items.length) return 1024;
  return Math.max(...items.map(i => i.position)) + 1024;
}

export function resolveStatusCategory(status: string): string {
  for (const [cat, statuses] of Object.entries(STATUS_CATEGORIES)) {
    if (statuses.includes(status)) return cat;
  }
  return 'todo';
}
