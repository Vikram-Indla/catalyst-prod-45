/**
 * formatTestKey — canonical DISPLAY normaliser for TestHub entity keys.
 *
 * CAT-TESTHUB-REBUILD-20260704-001 D008/D039: stored keys carry inconsistent
 * zero-padding because two generators disagree and legacy imports add more
 * variance:
 *   - tm_next_entity_key RPC → 4-digit  (TC-0001)
 *   - generate_defect_key trigger → 3-digit (DEF-002)
 *   - legacy imported rows → 3-digit (RVTC-001, RVDF-001) and 5-digit (DEF-00001)
 *
 * We do NOT rewrite stored keys (that would churn history and break external
 * references). Instead we normalise the DISPLAY: strip the numeric suffix's
 * leading zeros, then re-pad to a consistent minimum width so every key in a
 * list reads the same. Numbers wider than the minimum keep their real width.
 *
 * Canonical display width = 4 (matches the current tm_next_entity_key RPC).
 */

const CANONICAL_NUM_WIDTH = 4;

/** Matches "<PREFIX>-<digits>" and captures prefix + numeric portion. */
const KEY_RE = /^([A-Za-z]+)-(\d+)$/;

/**
 * Normalises a single entity key for display. Keys that don't match the
 * "<letters>-<digits>" shape (or are null/empty) are returned unchanged — the
 * zero-assumption rule: never fabricate or mangle an unrecognised value.
 */
export function formatTestKey(key: string | null | undefined): string | null {
  if (!key) return null;
  const m = KEY_RE.exec(key.trim());
  if (!m) return key;
  const [, prefix, digits] = m;
  const n = digits.replace(/^0+/, '') || '0';
  return `${prefix}-${n.padStart(CANONICAL_NUM_WIDTH, '0')}`;
}
