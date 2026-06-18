/**
 * formatWorkItemKey — display formatter for work-item keys.
 *
 * Locally-created work items (inline create, not yet synced to Jira) carry a
 * synthetic placeholder key of the form `PROJECT-LOCAL-<timestamp>`
 * (e.g. "BAU-LOCAL-1781480726427"). That raw key is internal cruft and must
 * never surface in the UI — it reads as a broken Jira key. For those, show a
 * neutral "Draft" label. Real synced keys (`PROJECT-<number>`) pass through
 * unchanged.
 *
 * Single source of truth: every surface that renders a work-item key for
 * display MUST route through this helper instead of printing the raw value.
 */

/** Matches a synthetic local-draft key: `<PROJECT>-LOCAL-<digits>`. */
export const LOCAL_KEY_PATTERN = /-LOCAL-\d/;

/** True when the key is a synthetic local-draft placeholder, not a real Jira key. */
export function isLocalWorkItemKey(key: string | null | undefined): boolean {
  return !!key && LOCAL_KEY_PATTERN.test(key);
}

/**
 * Returns a display-safe label for a work-item key.
 * Local-draft keys → "Draft". Everything else → the key unchanged (or '' if nullish).
 */
export function formatWorkItemKey(key: string | null | undefined): string {
  if (!key) return '';
  return isLocalWorkItemKey(key) ? 'Draft' : key;
}
