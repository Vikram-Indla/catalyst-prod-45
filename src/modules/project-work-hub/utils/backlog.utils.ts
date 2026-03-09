import type { BacklogGroup } from '../types/backlog.types';

// ─── STATUS → LOZENGE MAPPING ───────────────────
export type LozengeColor = 'grey' | 'blue' | 'green';

export interface LozengeConfig {
  color: LozengeColor;
  label: string;
}

const LOZENGE_STYLES: Record<LozengeColor, { bg: string; text: string }> = {
  grey:  { bg: '#DFE1E6', text: '#253858' },
  blue:  { bg: '#DEEBFF', text: '#0747A6' },
  green: { bg: '#E3FCEF', text: '#006644' },
};

export function getLozengeStyle(color: LozengeColor) {
  return LOZENGE_STYLES[color];
}

export const EPIC_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  proposed:    { color: 'grey',  label: 'PROPOSED' },
  approved:    { color: 'blue',  label: 'APPROVED' },
  in_progress: { color: 'blue',  label: 'IN PROGRESS' },
  done:        { color: 'green', label: 'DONE' },
  cancelled:   { color: 'grey',  label: 'CANCELLED' },
};

export const FEATURE_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  active:      { color: 'blue',  label: 'ACTIVE' },
  in_progress: { color: 'blue',  label: 'IN PROGRESS' },
  done:        { color: 'green', label: 'DONE' },
  cancelled:   { color: 'grey',  label: 'CANCELLED' },
};

export const STORY_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  open:        { color: 'grey',  label: 'OPEN' },
  in_progress: { color: 'blue',  label: 'IN PROGRESS' },
  in_review:   { color: 'blue',  label: 'IN REVIEW' },
  done:        { color: 'green', label: 'DONE' },
  cancelled:   { color: 'grey',  label: 'CANCELLED' },
};

// ─── GROUP ORDER ──────────────────────────────────
export const EPIC_GROUP_ORDER = ['in_progress', 'approved', 'proposed', 'done', 'cancelled'];
export const FEATURE_GROUP_ORDER = ['in_progress', 'active', 'done', 'cancelled'];
export const STORY_GROUP_ORDER = ['in_progress', 'in_review', 'open', 'done', 'cancelled'];

// ─── PRIORITY ────────────────────────────────────
export function getPriorityLabel(priority: string | null): string {
  if (!priority) return '—';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'critical': return '#DC2626';
    case 'high':     return '#D97706';
    case 'medium':   return '#2563EB';
    case 'low':      return '#6B7280';
    default:         return '#9CA3AF';
  }
}

// ─── DUE DATE ────────────────────────────────────
export function isDueDateOverdue(dueDate: string | null, status?: string | null): boolean {
  if (!dueDate) return false;
  if (status === 'done' || status === 'cancelled') return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return '—';
  return new Date(dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ─── GROUPING ────────────────────────────────────
export function groupByStatus<T extends { status: string | null }>(
  items: T[],
  groupOrder: string[]
): BacklogGroup<T>[] {
  const grouped = new Map<string, T[]>();
  for (const status of groupOrder) {
    grouped.set(status, []);
  }
  for (const item of items) {
    const s = item.status || 'unknown';
    if (!grouped.has(s)) grouped.set(s, []);
    grouped.get(s)!.push(item);
  }
  return Array.from(grouped.entries())
    .filter(([, items]) => items.length > 0)
    .map(([status, items]) => ({
      status,
      label: status.replace(/_/g, ' ').toUpperCase(),
      items,
      isCollapsed: false,
    }));
}

// ─── PARENT EPIC CHIP COLOR (deterministic) ──────
const EPIC_CHIP_PALETTE = [
  { bg: '#FFF0B3', text: '#7A4F00', border: '#FFD700' },
  { bg: '#FFBDAD', text: '#BF2600', border: '#FF7452' },
  { bg: '#FFE2FE', text: '#6B0089', border: '#D084FF' },
  { bg: '#DEEBFF', text: '#0747A6', border: '#4C9AFF' },
  { bg: '#E3FCEF', text: '#006644', border: '#57D9A3' },
  { bg: '#E6FCFF', text: '#006884', border: '#00C7E6' },
  { bg: '#EAE6FF', text: '#403294', border: '#8777D9' },
  { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },
];

export function getEpicChipColor(epicId: string) {
  let hash = 0;
  for (let i = 0; i < epicId.length; i++) {
    hash = ((hash << 5) - hash) + epicId.charCodeAt(i);
    hash |= 0;
  }
  return EPIC_CHIP_PALETTE[Math.abs(hash) % EPIC_CHIP_PALETTE.length];
}

// ─── ASSIGNEE AVATAR ────────────────────────────
export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
