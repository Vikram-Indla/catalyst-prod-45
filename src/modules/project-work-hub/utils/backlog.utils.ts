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
  default:    { bg: 'var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))', text: 'var(--ds-text, #253858)' },
  inprogress: { bg: 'var(--ds-background-information, #E9F2FF)', text: 'var(--ds-link-pressed, #0747A6)' },
  success:    { bg: 'var(--ds-background-success, #DFFCF0)', text: 'var(--ds-text-success, #006644)' },
  removed:    { bg: 'var(--ds-background-danger, #FFECEB)', text: 'var(--ds-text-danger, #AE2A19)' },
  moved:      { bg: 'var(--ds-background-warning, #FFF7D6)', text: 'var(--ds-text-warning, #974F0C)' },
  new:        { bg: 'var(--ds-background-discovery, #F3F0FF)', text: 'var(--ds-background-discovery-bold, #6E5DC6)' },
};

const LOZENGE_STYLES_DARK: Record<LozengeColor, { bg: string; text: string }> = {
  default:    { bg: 'var(--ds-border, var(--cp-ink-1, #2E2E2E))',            text: 'var(--ds-text-subtlest, #A1A1A1)' },
  inprogress: { bg: 'var(--ds-background-information-bold, rgba(59,130,246,0.10))',  text: 'var(--ds-background-information-bold, var(--ds-link, #0C66E4))' },
  success:    { bg: 'var(--ds-background-success-bold, rgba(74,222,128,0.10))',  text: 'var(--ds-background-success, #DFFCF0)' },
  removed:    { bg: 'rgba(248,113,113,0.10)', text: 'var(--ds-background-danger, var(--ds-background-danger, #FFECEB))' },
  moved:      { bg: 'rgba(234,179,8,0.10)',   text: '#FACC15' },
  new:        { bg: 'var(--ds-background-discovery-bold, rgba(167,139,250,0.10))', text: 'var(--ds-background-discovery, #F3F0FF)' },
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
  // 2026-05-08 DOM probe: In Requirements and In Design are "To Do" category
  // in the BAU Jira project (grey, rgb(221,222,225)) — NOT In Progress (blue).
  // They appear as plain text (barely-visible grey bg) in Jira group headers.
  'In Requirements':        { color: 'default',    label: 'IN REQUIREMENTS' },
  'IN REQUIREMENTS':        { color: 'default',    label: 'IN REQUIREMENTS' },
  'In Design':              { color: 'default',    label: 'IN DESIGN' },
  'IN DESIGN':              { color: 'default',    label: 'IN DESIGN' },
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
  // 2026-05-08 jira-compare DOM probe: Blocked = grey rgb(221,222,225) in Jira.
  // Prior mapping 'removed' (red) was wrong — Blocked is a "To Do" category
  // status in BAU, not a cancelled/removed workflow state.
  'Blocked':                { color: 'default',    label: 'BLOCKED' },
  'BLOCKED':                { color: 'default',    label: 'BLOCKED' },
  'blocked':                { color: 'default',    label: 'BLOCKED' },
  // 2026-05-08: On Hold = grey in Jira (To Do category). Prior 'moved' (yellow) was wrong.
  'On Hold':                { color: 'default',    label: 'ON HOLD' },
  'ON HOLD':                { color: 'default',    label: 'ON HOLD' },
  // BAU project statuses measured from Jira list DOM 2026-05-07/08
  // grey (To Do category): rgb(221,222,225)
  'Prioritized Backlog':    { color: 'default',    label: 'PRIORITIZED BACKLOG' },
  'PRIORITIZED BACKLOG':    { color: 'default',    label: 'PRIORITIZED BACKLOG' },
  'Deferred for INT':       { color: 'default',    label: 'DEFERRED FOR INT' },
  'DEFERRED FOR INT':       { color: 'default',    label: 'DEFERRED FOR INT' },
  'Hold':                   { color: 'default',    label: 'HOLD' },
  'HOLD':                   { color: 'default',    label: 'HOLD' },
  'hold':                   { color: 'default',    label: 'HOLD' },
  'Demand Validation':      { color: 'default',    label: 'DEMAND VALIDATION' },
  'DEMAND VALIDATION':      { color: 'default',    label: 'DEMAND VALIDATION' },
  'Demand Intake':          { color: 'default',    label: 'DEMAND INTAKE' },
  'DEMAND INTAKE':          { color: 'default',    label: 'DEMAND INTAKE' },
  // blue (In Progress category): rgb(143,184,246)
  'In Entity Integration':  { color: 'inprogress', label: 'IN ENTITY INTEGRATION' },
  'IN ENTITY INTEGRATION':  { color: 'inprogress', label: 'IN ENTITY INTEGRATION' },
  'Internal QA':            { color: 'inprogress', label: 'INTERNAL QA' },
  'INTERNAL QA':            { color: 'inprogress', label: 'INTERNAL QA' },
  'In Integration':         { color: 'inprogress', label: 'IN INTEGRATION' },
  'IN INTEGRATION':         { color: 'inprogress', label: 'IN INTEGRATION' },
  'Ready for Entity':       { color: 'inprogress', label: 'READY FOR ENTITY' },
  'READY FOR ENTITY':       { color: 'inprogress', label: 'READY FOR ENTITY' },
  // 2026-05-08 Jira DOM probe: "Ready to Implement" = To Do category (grey), not In Progress.
  // STATUS_OPTIONS also maps it to 'default'. Align the lozenge to match.
  'Ready to Implement':     { color: 'default',    label: 'READY TO IMPLEMENT' },
  'READY TO IMPLEMENT':     { color: 'default',    label: 'READY TO IMPLEMENT' },
  'Entity Input':           { color: 'inprogress', label: 'ENTITY INPUT' },
  'ENTITY INPUT':           { color: 'inprogress', label: 'ENTITY INPUT' },
  'Closed':                 { color: 'success',    label: 'CLOSED' },
  'CLOSED':                 { color: 'success',    label: 'CLOSED' },
  'closed':                 { color: 'success',    label: 'CLOSED' },
  // green (Done category): rgb(179,223,114)
  'Awaiting Info':          { color: 'success',    label: 'AWAITING INFO' },
  'AWAITING INFO':          { color: 'success',    label: 'AWAITING INFO' },
  'Awaiting info':          { color: 'success',    label: 'AWAITING INFO' },
  'Monitor':                { color: 'success',    label: 'MONITOR' },
  'MONITOR':                { color: 'success',    label: 'MONITOR' },
  'UAT Ready':              { color: 'success',    label: 'UAT READY' },
  'UAT READY':              { color: 'success',    label: 'UAT READY' },
  'Re-open':                { color: 'success',    label: 'RE-OPEN' },
  'RE-OPEN':                { color: 'success',    label: 'RE-OPEN' },
  'Staging/QA':             { color: 'success',    label: 'STAGING/QA' },
  'STAGING/QA':             { color: 'success',    label: 'STAGING/QA' },
  'Beta Ready':             { color: 'success',    label: 'BETA READY' },
  'Implementation':         { color: 'inprogress', label: 'IMPLEMENTATION' },
  'IMPLEMENTATION':         { color: 'inprogress', label: 'IMPLEMENTATION' },
  'In Implementation':      { color: 'inprogress', label: 'IN IMPLEMENTATION' },
  'Retest':                 { color: 'inprogress', label: 'RETEST' },
  'RETEST':                 { color: 'inprogress', label: 'RETEST' },
  'READY FOR DEV':          { color: 'default',    label: 'READY FOR DEV' },
  'Ready for Production':   { color: 'success',    label: 'READY FOR PRODUCTION' },
  'READY FOR PRODUCTION':   { color: 'success',    label: 'READY FOR PRODUCTION' },
  'In Review':              { color: 'inprogress', label: 'IN REVIEW' },
  'IN REVIEW':              { color: 'inprogress', label: 'IN REVIEW' },
  // Jira DOM probe 2026-05-16: Cancelled → grey (todo/default), Rejected → green (done category).
  'Cancelled':              { color: 'default',    label: 'CANCELLED' },
  'CANCELLED':              { color: 'default',    label: 'CANCELLED' },
  'Rejected':               { color: 'success',    label: 'REJECTED' },
  'REJECTED':               { color: 'success',    label: 'REJECTED' },
  // Legacy native statuses (fallback)
  'open':          { color: 'default',    label: 'OPEN' },
  'in_progress':   { color: 'inprogress', label: 'IN PROGRESS' },
  'in_review':     { color: 'inprogress', label: 'IN REVIEW' },
  'done':          { color: 'success',    label: 'DONE' },
  'cancelled':     { color: 'default',    label: 'CANCELLED' },
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

/**
 * Whether a parent resolved from a story's `feature.epic` should be
 * synthesized as a top-level Epic row.
 *
 * RCA 2026-06-11: useStoryBacklog fetches Sub-task / Frontend / Backend issue
 * types whose parents are Stories/Features (not Epics). Those parents leak
 * into `epicMap`, and the synth-epic loop used to convert ANY parent into a
 * `type:'epic'` row — producing a phantom Epic twin of a Story. The twin
 * collided by id with the real leaf Story and flipped Story↔Epic depending on
 * the ancestor's expand/collapse state. Only genuine Epics may be synthesized.
 */
export function shouldSynthesizeEpicRow(
  ep: { issue_type?: string | null } | null | undefined,
): boolean {
  return !!ep && ep.issue_type === 'Epic';
}

/** BacklogType → canonical icon-registry name, used only when a row carries
 *  no raw issue_type (synthetic rows). Covers every non-initiative type. */
const BACKLOG_TYPE_ICON_FALLBACK: Record<string, string> = {
  epic: 'Epic',
  feature: 'Feature',
  story: 'Story',
  bug: 'QA Bug',
  incident: 'Production Incident',
  task: 'Task',
};

/**
 * Resolve the Key-cell type-icon string for a backlog row. Prefers the row's
 * TRUE Jira `issue_type` (so Sub-task/Backend/Frontend/Feature render their own
 * glyph instead of collapsing to the Story bookmark). Falls back to the coarse
 * BacklogType only for synthetic rows that carry no issue_type — never a
 * fabricated 'Story' default (CLAUDE.md zero-assumption 2026-06-11).
 */
export function keyCellIconType(
  it: { issue_type?: string | null; type: string },
): string {
  return it.issue_type || BACKLOG_TYPE_ICON_FALLBACK[it.type] || it.type;
}

/**
 * Depth-first flatten of a tree into a visible-row list.
 *
 * Walks each root, emits a node when `matches(node)`, then recurses into its
 * children only when `isExpanded(node.id)`. Handles ARBITRARY depth, dedups by
 * id, and is cycle-safe. Replaces the two-level flatten whose missing recursion
 * leaked grandchildren to the top level (RCA 2026-06-11).
 */
export function flattenTree<T extends { id: string }>(
  roots: T[],
  childrenOf: Map<string, T[]>,
  isExpanded: (id: string) => boolean,
  matches: (node: T) => boolean,
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  const walk = (node: T) => {
    if (seen.has(node.id)) return; // cycle / duplicate guard
    seen.add(node.id);
    if (matches(node)) out.push(node);
    if (isExpanded(node.id)) {
      for (const child of childrenOf.get(node.id) ?? []) walk(child);
    }
  };
  roots.forEach(walk);
  return out;
}

export function getPriorityColor(priority: string | null): string {
  switch (priority?.toLowerCase()) {
    case 'critical':
    case 'highest': return 'var(--ds-text-danger, var(--cp-danger, #DC2626))';
    case 'high':    return 'var(--ds-text-warning, var(--cp-warning, #D97706))';
    case 'medium':  return '#CF7B00';
    case 'low':
    case 'lowest':  return 'var(--ds-text-subtlest, #626F86)';
    default:        return 'var(--ds-text-disabled, #8590A2)';
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
  { bg: 'var(--ds-background-warning, #FFF7D6)', text: '#7A4F00', border: 'var(--ds-background-warning-bold, #E2B203)' },
  { bg: '#FFBDAD', text: 'var(--ds-text-danger, #AE2A19)', border: 'var(--ds-background-danger-bold, #FF7452)' },
  { bg: '#FFE2FE', text: '#6B0089', border: '#D084FF' },
  { bg: 'var(--ds-link, #0C66E4)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: 'var(--ds-background-information-bold, #0C66E4)' },
  { bg: 'var(--cp-lozenge-green-bg, #1B7F37)', text: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))', border: 'var(--ds-background-success-bold, #57D9A3)' },
  { bg: '#E6FCFF', text: '#006884', border: '#00C7E6' },
  { bg: 'var(--ds-background-discovery, #F3F0FF)', text: 'var(--ds-background-discovery-bold, #6E5DC6)', border: '#8777D9' },
  { bg: 'var(--ds-surface-sunken, var(--cp-bg-sunken, var(--cp-bg-sunken, #F1F5F9)))', text: 'var(--cp-ink-2, var(--cp-ink-2, var(--cp-ink-2, #334155)))', border: 'var(--ds-text-disabled, #CBD5E1)' },
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
