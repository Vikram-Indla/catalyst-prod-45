import type { BacklogGroup } from '../types/backlog.types';
import type { LozengeAppearance } from './statusToLozenge';

// ─── STATUS → LOZENGE MAPPING ───────────────────
//
// §20 / L41 — migrated from the legacy 3-colour union ('grey' | 'blue' |
// 'green') to Atlaskit's 6-appearance palette. `LozengeColor` is now an
// alias for `LozengeAppearance` so callers that previously passed
// `cfg.color` straight into an Atlaskit <Lozenge appearance={...}> get
// type-correct values, and "In UAT" maps to `inprogress` rather than
// inventing a cyan (#00B8D9) that isn't in Atlassian's palette.
//
// NOTE: `getLozengeStyle()` is retained as a back-compat inline-style
// shim for the handful of consumers (FeatureBacklogPage, EpicDetailDrawer)
// that still render their own <span> instead of <Lozenge>. Those sites
// should migrate to Atlaskit Lozenge in a follow-on pass, but the shim
// means they keep rendering correctly in the interim.
export type LozengeColor = LozengeAppearance;

export interface LozengeConfig {
  color: LozengeColor;
  label: string;
}

const LOZENGE_STYLES_LIGHT: Record<LozengeColor, { bg: string; text: string }> = {
  default:    { bg: 'var(--ds-border, #DFE1E6)', text: 'var(--ds-text, #253858)' },
  inprogress: { bg: '#DEEBFF', text: '#0747A6' },
  success:    { bg: '#E3FCEF', text: '#006644' },
  removed:    { bg: '#FFEBE6', text: '#BF2600' },
  moved:      { bg: '#FFF0B3', text: '#974F0C' },
  new:        { bg: '#EAE6FF', text: '#403294' },
};

const LOZENGE_STYLES_DARK: Record<LozengeColor, { bg: string; text: string }> = {
  default:    { bg: 'var(--ds-border, #2E2E2E)',            text: 'var(--ds-text-subtlest, #A1A1A1)' },
  inprogress: { bg: 'rgba(59,130,246,0.10)',  text: '#7DB8FC' },
  success:    { bg: 'rgba(74,222,128,0.10)',  text: '#4ADE80' },
  removed:    { bg: 'rgba(248,113,113,0.10)', text: '#F87171' },
  moved:      { bg: 'rgba(234,179,8,0.10)',   text: '#FACC15' },
  new:        { bg: 'rgba(167,139,250,0.10)', text: '#C4B5FD' },
};

export function getLozengeStyle(color: LozengeColor) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return isDark ? LOZENGE_STYLES_DARK[color] : LOZENGE_STYLES_LIGHT[color];
}

// ─── EPIC STATUS (Jira values) ───────────────────
export const EPIC_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  'Backlog':       { color: 'default',    label: 'BACKLOG' },
  'To Do':         { color: 'default',    label: 'TO DO' },
  'In Progress':   { color: 'inprogress', label: 'IN PROGRESS' },
  'Done':          { color: 'success',    label: 'DONE' },
  'Cancelled':     { color: 'removed',    label: 'CANCELLED' },
  // Legacy native statuses (fallback)
  'proposed':      { color: 'default',    label: 'PROPOSED' },
  'approved':      { color: 'success',    label: 'APPROVED' },
  'in_progress':   { color: 'inprogress', label: 'IN PROGRESS' },
  'done':          { color: 'success',    label: 'DONE' },
  'cancelled':     { color: 'removed',    label: 'CANCELLED' },
};

// ─── FEATURE STATUS ──────────────────────────────
export const FEATURE_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  'active':        { color: 'inprogress', label: 'ACTIVE' },
  'in_progress':   { color: 'inprogress', label: 'IN PROGRESS' },
  'done':          { color: 'success',    label: 'DONE' },
  'cancelled':     { color: 'removed',    label: 'CANCELLED' },
};

// ─── STORY STATUS (Jira values) ──────────────────
export const STORY_STATUS_LOZENGE: Record<string, LozengeConfig> = {
  'In Requirements':        { color: 'inprogress', label: 'IN REQUIREMENTS' },
  'In Design':              { color: 'inprogress', label: 'IN DESIGN' },
  'Ready for Development':  { color: 'default',    label: 'READY FOR DEV' },
  'In Development':         { color: 'inprogress', label: 'IN DEVELOPMENT' },
  // Jira parity (BAU project workflow): Ready for QA / In QA / Ready for UAT /
  // In UAT / BETA READY / In BETA all live in the "Done" status category in
  // Jira (dev work complete, awaiting verification) and render GREEN. Catalyst
  // was mapping these to 'inprogress' (BLUE), causing every QA/UAT row to look
  // wrong vs Jira's list view. Source of truth:
  //   https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list
  'Ready for QA':           { color: 'success',    label: 'READY FOR QA' },
  'In QA':                  { color: 'success',    label: 'IN QA' },
  'Ready for UAT':          { color: 'success',    label: 'READY FOR UAT' },
  'In UAT':                 { color: 'success',    label: 'IN UAT' },
  'BETA READY':             { color: 'success',    label: 'BETA READY' },
  'In BETA':                { color: 'success',    label: 'IN BETA' },
  'In Production':          { color: 'success',    label: 'IN PRODUCTION' },
  'Backlog':                { color: 'default',    label: 'BACKLOG' },
  'To Do':                  { color: 'default',    label: 'TO DO' },
  // Apr 28, 2026 (jira-compare cycle 4): added camelCase + UPPERCASE
  // aliases. Catalyst's detail panel renders "ToDo" without a space and
  // some surfaces store statuses uppercase (TODO). Without these aliases
  // those rows fall through to 'default' BUT also miss the canonical
  // label normalization, which is fine — the appearance is right.
  'ToDo':                   { color: 'default',    label: 'TO DO' },
  'TODO':                   { color: 'default',    label: 'TO DO' },
  'todo':                   { color: 'default',    label: 'TO DO' },
  'In Progress':            { color: 'inprogress', label: 'IN PROGRESS' },
  'IN PROGRESS':            { color: 'inprogress', label: 'IN PROGRESS' },
  'Done':                   { color: 'success',    label: 'DONE' },
  'DONE':                   { color: 'success',    label: 'DONE' },
  'Blocked':                { color: 'removed',    label: 'BLOCKED' },
  'On Hold':                { color: 'moved',      label: 'ON HOLD' },
  // Legacy native statuses (fallback)
  'open':          { color: 'default',    label: 'OPEN' },
  'in_progress':   { color: 'inprogress', label: 'IN PROGRESS' },
  'in_review':     { color: 'inprogress', label: 'IN REVIEW' },
  'done':          { color: 'success',    label: 'DONE' },
  'cancelled':     { color: 'removed',    label: 'CANCELLED' },
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
    case 'highest': return 'var(--ds-text-danger, #DC2626)';
    case 'high':    return 'var(--ds-text-warning, #D97706)';
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
  { bg: '#0C66E4', text: 'var(--ds-text-inverse, #FFFFFF)', border: '#4C9AFF' },
  { bg: '#1B7F37', text: 'var(--ds-text-inverse, #FFFFFF)', border: '#57D9A3' },
  { bg: '#E6FCFF', text: '#006884', border: '#00C7E6' },
  { bg: '#EAE6FF', text: '#403294', border: '#8777D9' },
  { bg: 'var(--ds-surface-sunken, #F1F5F9)', text: 'var(--ds-text-subtle, #334155)', border: 'var(--ds-text-disabled, #CBD5E1)' },
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
