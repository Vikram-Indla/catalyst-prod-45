/**
 * StoryDetailModal — Helper/utility functions
 * Extracted from StoryDetailModal.tsx for modularity
 */
import { STATUS_STYLES, STATUS_CATEGORIES } from './constants';
import type { LozengeAppearance } from '../../../utils/statusToLozenge';

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
// TODO: ads-unmapped — #00B8D9 context unclear
  const colors = ['var(--cp-primary-60, #0052CC)', 'var(--ds-background-discovery-bold, #6554C0)', 'var(--ds-background-success-bold, #1F845A)', 'var(--ds-background-danger-bold, #C9372C)', 'var(--ds-background-warning-bold, #E2B203)', '#00B8D9', 'var(--ds-text-success, #216E4E)', 'var(--ds-text-accent-orange, #9E4C00)'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * §20 / L41 — Returns an Atlaskit Lozenge `appearance` value for a legacy
 * 3-bucket status category. The old 'grey' | 'blue' | 'green' return type
 * mapped 1:1 to hand-rolled backgrounds; those are gone. Callers that want
 * pill colours should now pass `appearance` straight to `<Lozenge>`.
 */
export function getLozengeVariant(statusCategory: 'todo' | 'in_progress' | 'done'): LozengeAppearance {
  if (statusCategory === 'done') return 'success';
  if (statusCategory === 'in_progress') return 'inprogress';
  return 'default';
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
