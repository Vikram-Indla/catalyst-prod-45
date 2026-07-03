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
 * moved uses warning-inverse (not plain inverse) — amber with white text fails
 * WCAG AA (contrast ~1.9:1). Warning-inverse stays dark in both themes.
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

/** Matching text token per status. Inverse for dark bgs, dark text for amber.
 *  moved MUST be warning-inverse, not --ds-text: --ds-text flips light in dark
 *  mode and washes out on the amber bold bg (probed 2026-07-03, ~1.6:1).
 *  --ds-text-warning-inverse stays dark in both themes. */
export const STATUS_FG: Record<StatusAppearance, string> = {
  success:    'var(--ds-text-inverse)',
  inprogress: 'var(--ds-text-inverse)',
  moved:      'var(--ds-text-warning-inverse)',
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

/* ═══════════════════════════════════════════════════════════════════════════
 * SUBTLE tier — pale ADS background + matching colored text.
 * Used by the detail-header CatalystStatusPill (Vikram locked 2026-06-29:
 * "bold read too loud" on the header). Kept separate from the bold STATUS_BG
 * above so the header stays subtle while list/table pills go Jira-bold.
 * ═══════════════════════════════════════════════════════════════════════════ */
export const STATUS_BG_SUBTLE: Record<StatusAppearance, string> = {
  success:    'var(--ds-background-success)',
  inprogress: 'var(--ds-background-information)',
  moved:      'var(--ds-background-warning)',
  new:        'var(--ds-background-discovery)',
  removed:    'var(--ds-background-danger)',
  default:    'var(--ds-background-neutral)',
};
export const STATUS_FG_SUBTLE: Record<StatusAppearance, string> = {
  success:    'var(--ds-text-success)',
  inprogress: 'var(--ds-text-information)',
  moved:      'var(--ds-text-warning)',
  new:        'var(--ds-text-discovery)',
  removed:    'var(--ds-text-danger)',
  default:    'var(--ds-text)',
};
/** Resolve a SUBTLE (pale) status-pill bg — for the detail header pill. */
export function statusBgSubtle(appearance: string): string {
  return STATUS_BG_SUBTLE[appearance as StatusAppearance] ?? STATUS_BG_SUBTLE.default;
}
/** Resolve the matching SUBTLE text colour. */
export function statusFgSubtle(appearance?: string): string {
  return STATUS_FG_SUBTLE[appearance as StatusAppearance] ?? STATUS_FG_SUBTLE.default;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BOLD tier — exact Jira-parity (DOM-probed from production Jira list 2026-06-29).
 *
 * Solid pastel fills + dark text, byte-for-byte what the Jira status lozenge
 * renders. These have NO ADS --ds-* token equivalent: the ADS *-bold tokens
 * resolve to a BRIGHTER lime (#94C748) / periwinkle and a transparent neutral,
 * which diverge from Jira's softer #B3DF72 / solid #DDDEE1. Hence the documented
 * Jira-parity hex bypass below. Text is pinned dark (#292A2E) in BOTH themes —
 * the pill supplies its own light fill, so it never flips white.
 *
 * Used by list / table / For-You status lozenges (WorkItemStatusLozenge,
 * JiraStatusLozenge, JiraTable status cell, ForYouRow, hierarchy StatusBadge).
 * ═══════════════════════════════════════════════════════════════════════════ */
export const STATUS_BG_BOLD: Record<StatusAppearance, string> = {
  /* ads-scanner:ignore-next-line — Jira-parity bypass, no ADS token (probed 2026-06-29, confirmed #94C748 vs #B3DF72 on ksa-catalyst.com) */
  success:    '#94C748',
  /* ads-scanner:ignore-next-line — Jira-parity bypass, no ADS token (probed 2026-06-29) */
  inprogress: '#8FB8F6',
  /* ads-scanner:ignore-next-line — Jira-parity bypass, no ADS token (probed 2026-06-29) */
  moved:      '#F9C84E',
  /* ads-scanner:ignore-next-line — Jira-parity bypass, no ADS token (probed 2026-06-29) */
  new:        '#D8A0F7',
  /* ads-scanner:ignore-next-line — Jira-parity bypass, no ADS token (probed 2026-06-29) */
  removed:    '#FD9891',
  /* ads-scanner:ignore-next-line — Jira-parity bypass, no ADS token (probed 2026-06-29) */
  default:    '#DDDEE1',
};
/** Jira bold lozenge text — pinned dark, same in light & dark (probed 2026-06-29). */
/* ads-scanner:ignore-next-line — Jira-parity bypass, no ADS token (probed 2026-06-29) */
export const STATUS_FG_BOLD = '#292A2E';
/** Resolve a Jira-parity BOLD status-pill bg from an appearance string. */
export function statusBgBold(appearance: string): string {
  return STATUS_BG_BOLD[appearance as StatusAppearance] ?? STATUS_BG_BOLD.default;
}
/** Jira-parity BOLD text colour (dark, both themes). */
export function statusFgBold(_appearance?: string): string {
  return STATUS_FG_BOLD;
}
/** Resolve a Jira-parity BOLD bg from a status_category. */
export function categoryBgBold(category: string | null | undefined): string {
  return statusBgBold(categoryToAppearance(category));
}

/**
 * THE THREE LOCKED CATEGORY COLORS — keyed by ph_issues.status_category.
 * gray (To Do) · blue (In Progress) · green (Done). Admin status-badge config
 * and every category-keyed consumer MUST read from here. Hard-locked by
 * statusPalette.canonical.test.ts + the design-governance STATUS_COLOR_LOCK rule.
 */
export const STATUS_CATEGORY_BG: Record<'todo' | 'in_progress' | 'done', string> = {
  todo:        STATUS_BG.default,    // neutral grey
  in_progress: STATUS_BG.inprogress, // subtle blue
  done:        STATUS_BG.success,    // subtle green
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
