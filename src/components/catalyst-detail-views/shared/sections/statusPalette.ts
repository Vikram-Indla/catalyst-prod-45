/**
 * statusPalette — CANONICAL source of truth for work-item status pill colors.
 *
 * Jira-probed medium-pastel backgrounds (BAU-5774 / BAU-5609 / Kanban probe).
 * Text is ALWAYS dark (#292A2E) — Jira never uses white on status pills.
 *
 * Every renderer that paints a work-item status pill (header pill, table cell,
 * For You row, card, hover) MUST import STATUS_BG / statusBg from here. Do NOT
 * hand-roll a local green — that is exactly the drift this module exists to kill
 * (2026-06-17: five renderers each had their own done-green; "Assigned" rows
 * rendered pale rgb(186,240,199) while "Recommended" rendered bright #94C748).
 *
 * THREE tiers exist for Jira status colors:
 *   BOLD    color.background.success.bold  #1F845A  dark, white text  ← WRONG
 *   SUBTLE  color.background.success        #DCFFF1  very light        ← washed out
 *   JIRA    (no ADS token)                  #94C748  medium pastel     ← canonical
 */

export type StatusAppearance =
  | 'default'
  | 'inprogress'
  | 'success'
  | 'removed'
  | 'moved'
  | 'new';

/** Always dark — Jira NIN DOM probe rgb(41,42,46). */
export const STATUS_TEXT = '#292A2E';

/** Canonical Jira-probed medium-pastel backgrounds per status category. */
export const STATUS_BG: Record<StatusAppearance, string> = {
  success:    '#94C748', // done — medium lime green (THE canonical green)
  inprogress: '#8FB8F6', // in progress — medium periwinkle blue
  moved:      '#F3D664', // moved/warning — medium warm yellow
  new:        '#B8ACF6', // new/discovery — medium lavender
  removed:    '#FD9891', // cancelled/rejected — medium coral red
  default:    '#DDDEE1', // todo/backlog — light grey
};

/** Resolve a status-pill background from an appearance string (canonical). */
export function statusBg(appearance: string): string {
  return STATUS_BG[appearance as StatusAppearance] ?? STATUS_BG.default;
}

/**
 * THE THREE LOCKED CATEGORY COLORS — keyed by ph_issues.status_category.
 * gray (To Do) · blue (In Progress) · green (Done). Admin status-badge config
 * and every category-keyed consumer MUST read from here. Hard-locked by
 * statusPalette.canonical.test.ts + the design-governance STATUS_COLOR_LOCK rule.
 */
export const STATUS_CATEGORY_BG: Record<'todo' | 'in_progress' | 'done', string> = {
  todo:        STATUS_BG.default,    // #DDDEE1 gray
  in_progress: STATUS_BG.inprogress, // #8FB8F6 blue
  done:        STATUS_BG.success,    // #94C748 green
};

/** Resolve a status-pill background from a status_category (canonical). */
export function categoryBg(category: string | null | undefined): string {
  return statusBg(categoryToAppearance(category));
}

/** Status text color (always dark). */
export function statusFg(_appearance?: string): string {
  return STATUS_TEXT;
}

/**
 * Map a ph_issues status_category (or workflow group category) to a canonical
 * appearance. Accepts both snake_case DB values and Jira's category labels.
 */
export function categoryToAppearance(
  cat: string | null | undefined,
): StatusAppearance {
  switch ((cat || '').toLowerCase()) {
    case 'done':          return 'success';
    case 'in_progress':
    case 'in progress':
    case 'indeterminate': return 'inprogress';
    case 'moved':         return 'moved';
    case 'removed':       return 'removed';
    case 'new':           return 'new';
    case 'todo':
    case 'to_do':
    case 'to do':
    default:              return 'default';
  }
}
