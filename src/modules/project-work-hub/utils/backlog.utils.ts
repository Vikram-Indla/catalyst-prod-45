import type { BacklogGroup } from '../types/backlog.types';

// ─── STATUS → LOZENGE MAPPING ───────────────────
export type LozengeColor = 'grey' | 'blue' | 'green';

export interface LozengeConfig {
  color: LozengeColor;
  label: string;
}

const LOZENGE_STYLES_LIGHT: Record<LozengeColor, { bg: string; text: string }> = {
  grey:  { bg: '#DFE1E6', text: '#253858' },
  blue:  { bg: '#DEEBFF', text: '#0747A6' },
  green: { bg: '#E3FCEF', text: '#006644' },
};

const LOZENGE_STYLES_DARK: Record<LozengeColor, { bg: string; text: string }> = {
  grey:  { bg: '#2E2E2E', text: '#A1A1A1' },
  blue:  { bg: 'rgba(59,130,246,0.10)', text: '#7DB8FC' },
  green: { bg: 'rgba(74,222,128,0.10)', text: '#4ADE80' },
};

export function getLozengeStyle(color: LozengeColor) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return isDark ? LOZENGE_STYLES_DARK[color] : LOZENGE_STYLES_LIGHT[color];
}

// ─── EPIC STATUS (Jira values) ───────────────────
export const EPIC_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  'Backlog':       { color: 'grey',  label: 'BACKLOG' },
  'To Do':         { color: 'grey',  label: 'TO DO' },
  'In Progress':   { color: 'blue',  label: 'IN PROGRESS' },
  'Done':          { color: 'green', label: 'DONE' },
  'Cancelled':     { color: 'grey',  label: 'CANCELLED' },
  // Legacy native statuses (fallback)
  'proposed':      { color: 'grey',  label: 'PROPOSED' },
  'approved':      { color: 'blue',  label: 'APPROVED' },
  'in_progress':   { color: 'blue',  label: 'IN PROGRESS' },
  'done':          { color: 'green', label: 'DONE' },
  'cancelled':     { color: 'grey',  label: 'CANCELLED' },
};

// ─── FEATURE STATUS ──────────────────────────────
export const FEATURE_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  'active':        { color: 'blue',  label: 'ACTIVE' },
  'in_progress':   { color: 'blue',  label: 'IN PROGRESS' },
  'done':          { color: 'green', label: 'DONE' },
  'cancelled':     { color: 'grey',  label: 'CANCELLED' },
};

// ─── STORY STATUS (Jira values) ──────────────────
export const STORY_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  'In Requirements':        { color: 'grey',  label: 'IN REQUIREMENTS' },
  'In Design':              { color: 'grey',  label: 'IN DESIGN' },
  'Ready for Development':  { color: 'grey',  label: 'READY FOR DEV' },
  'In Development':         { color: 'blue',  label: 'IN DEVELOPMENT' },
  'In QA':                  { color: 'blue',  label: 'IN QA' },
  'In UAT':                 { color: 'blue',  label: 'IN UAT' },
  'BETA READY':             { color: 'blue',  label: 'BETA READY' },
  'In BETA':                { color: 'blue',  label: 'IN BETA' },
  'In Production':          { color: 'green', label: 'IN PRODUCTION' },
  'Backlog':                { color: 'grey',  label: 'BACKLOG' },
  'To Do':                  { color: 'grey',  label: 'TO DO' },
  'In Progress':            { color: 'blue',  label: 'IN PROGRESS' },
  'Done':                   { color: 'green', label: 'DONE' },
  // Legacy native statuses (fallback)
  'open':          { color: 'grey',  label: 'OPEN' },
  'in_progress':   { color: 'blue',  label: 'IN PROGRESS' },
  'in_review':     { color: 'blue',  label: 'IN REVIEW' },
  'done':          { color: 'green', label: 'DONE' },
  'cancelled':     { color: 'grey',  label: 'CANCELLED' },
};

// ─── GROUP ORDER ──────────────────────────────────
export const EPIC_GROUP_ORDER = ['In Progress', 'Backlog', 'To Do', 'Done', 'Cancelled', 'in_progress', 'approved', 'proposed', 'done', 'cancelled'];
export const FEATURE_GROUP_ORDER = ['in_progress', 'active', 'done', 'cancelled'];
export const STORY_GROUP_ORDER = [
  'In Requirements', 'In Design', 'Ready for Development', 'In Development',
  'In QA', 'In UAT', 'BETA READY', 'In BETA', 'In Production',
  'Backlog', 'To Do', 'In Progress', 'Done',
  'in_progress', 'in_review', 'open', 'done', 'cancelled',
];

// ─── PRIORITY ────────────────────────────────────
export function getPriorityLabel(priority: string | null): string {
  if (!priority) return '—';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export function getPriorityColor(priority: string | null): string {
  switch (priority?.toLowerCase()) {
    case 'critical':
    case 'highest': return '#DC2626';
    case 'high':    return '#D97706';
    case 'medium':  return '#CF7B00';
    case 'low':
    case 'lowest':  return '#6B7280';
    default:        return '#9CA3AF';
  }
}

// ─── DUE DATE ────────────────────────────────────
export function isDueDateOverdue(dueDate: string | null, status?: string | null): boolean {
  if (!dueDate) return false;
  const doneStatuses = ['done', 'cancelled', 'Done', 'Cancelled', 'In Production'];
  if (status && doneStatuses.includes(status)) return false;
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
  { bg: '#0C66E4', text: '#FFFFFF', border: '#4C9AFF' },
  { bg: '#1B7F37', text: '#FFFFFF', border: '#57D9A3' },
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
