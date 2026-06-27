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

/**
 * ADS semantic status tokens — per references/ads-token-map.md.
 *
 * Each status uses an ADS *subtle background* token paired with its matching
 * *text* token. These are theme-aware: ADS resolves both correctly in light AND
 * dark mode (ads-token-map.md §"DARK MODE SURFACE VALUES" — wrap with the
 * light-mode token, ADS resolves dark automatically), so the bg/text pair keeps
 * WCAG-passing contrast in both themes. This replaces the prior Jira-probed
 * fixed hex (e.g. #8FB8F6 + dark text), which did NOT flip in dark mode and
 * rendered light-on-light (~1.3:1, invisible). 2026-06-27.
 *
 * Background ↔ text pairs are intentionally matched — do not mix a bg from one
 * status with text from another.
 */
export const STATUS_BG: Record<StatusAppearance, string> = {
  success:    'var(--ds-background-success, #DFFCF0)',     // done
  inprogress: 'var(--ds-background-information, #E9F2FF)',  // in progress
  moved:      'var(--ds-background-warning, #FFF7D6)',      // moved
  new:        'var(--ds-background-discovery, #F3F0FF)',    // new
  removed:    'var(--ds-background-danger, #FFECEB)',       // cancelled/rejected
  default:    'var(--ds-background-neutral, #F1F2F4)',      // todo/backlog
};

/** Matching ADS text token per status (paired with STATUS_BG above). */
export const STATUS_FG: Record<StatusAppearance, string> = {
  success:    'var(--ds-text-success, #216E4E)',
  inprogress: 'var(--ds-text-information, #0055CC)',
  moved:      'var(--ds-text-warning, #A54800)',
  new:        'var(--ds-text-discovery, #5E4DB2)',
  removed:    'var(--ds-text-danger, #AE2E24)',
  default:    'var(--ds-text, #172B4D)',
};

/** Default status text token (neutral). Prefer statusFg(appearance) for pills so
 *  the text matches its background. */
export const STATUS_TEXT = STATUS_FG.default;

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
  todo:        STATUS_BG.default,    // var(--ds-border, #DFE1E6) gray
  in_progress: STATUS_BG.inprogress, // #8FB8F6 periwinkle blue
  done:        STATUS_BG.success,    // #94C748 lime green
};

/** Resolve a status-pill background from a status_category (canonical). */
export function categoryBg(category: string | null | undefined): string {
  return statusBg(categoryToAppearance(category));
}

/** Resolve the matching ADS text token for a status appearance. Pass the same
 *  appearance used for statusBg() so bg/text stay a paired, WCAG-correct combo
 *  in both light and dark mode. Falls back to neutral text when unknown. */
export function statusFg(appearance?: string): string {
  return STATUS_FG[appearance as StatusAppearance] ?? STATUS_FG.default;
}

/** Resolve the matching ADS text token from a status_category. */
export function categoryFg(category: string | null | undefined): string {
  return statusFg(categoryToAppearance(category));
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
