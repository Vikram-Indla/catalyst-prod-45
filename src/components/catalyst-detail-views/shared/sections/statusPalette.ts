/**
 * statusPalette — CANONICAL source of truth for work-item status pill colors.
 *
 * Bold ADS tokens, Atlassian-design/components/lozenge parity.
 * Each STATUS_BG tier uses a *-bold token so pills render vivid and legible
 * in both light and dark mode without hand-rolled hex.
 *
 * Every renderer that paints a work-item status pill (header pill, table cell,
 * For You row, card, hover) MUST import STATUS_BG / statusBg from here. Do NOT
 * hand-roll a local green — that is exactly the drift this module exists to kill
 * (2026-06-17: five renderers each had their own done-green; "Assigned" rows
 * rendered pale rgb(186,240,199) while "Recommended" rendered bright #94C748).
 */

export type StatusAppearance =
  | 'default'
  | 'inprogress'
  | 'success'
  | 'removed'
  | 'moved'
  | 'new';

/**
 * ADS bold background tokens paired with WCAG-correct text tokens.
 *
 * moved uses dark text (not inverse) — #E2B203 amber with white text fails
 * WCAG AA (contrast ~1.9:1). Dark text passes 4.7:1.
 * new uses discovery-bold (purple) + inverse — no subtle-only constraint.
 */
export const STATUS_BG: Record<StatusAppearance, string> = {
  success:    'var(--ds-background-success-bold)',
  inprogress: 'var(--ds-background-information-bold)',
  moved:      'var(--ds-background-warning-bold)',
  new:        'var(--ds-background-discovery-bold)',
  removed:    'var(--ds-background-danger-bold)',
  default:    'var(--ds-background-neutral)',
};

/** Matching text token per status. Inverse for dark bgs, dark text for amber. */
export const STATUS_FG: Record<StatusAppearance, string> = {
  success:    'var(--ds-text-inverse)',
  inprogress: 'var(--ds-text-inverse)',
  moved:      'var(--ds-text)',
  new:        'var(--ds-text-inverse)',
  removed:    'var(--ds-text-inverse)',
  default:    'var(--ds-text)',
};

/** Default status text token (neutral). */
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
  todo:        STATUS_BG.default,    // gray
  in_progress: STATUS_BG.inprogress, // periwinkle blue
  done:        STATUS_BG.success,    // lime green
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
