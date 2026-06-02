/**
 * Canonical priority scale for ALL of Catalyst.
 *
 * Matches Jira's 5-level priority scheme exactly. Every surface that renders,
 * edits, filters, or sorts by priority MUST import from this file.
 *
 * DO NOT define priority options/types/colors anywhere else.
 * DO NOT use the old 4-level scale (Critical/High/Medium/Low).
 * DO NOT use URGENCY_OPTIONS from business-request.ts (deprecated — re-exports from here).
 */
import { token } from '@atlaskit/tokens';

// ─── Values ──────────────────────────────────────────────────────────────────

/** The 5 canonical priority values, highest-to-lowest. */
export const CATALYST_PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;

/** Union type for priority values. */
export type CatalystPriority = (typeof CATALYST_PRIORITIES)[number];

// ─── Select options ──────────────────────────────────────────────────────────

/** For @atlaskit/select dropdowns, filter chips, and create modals. */
export const CATALYST_PRIORITY_OPTIONS = CATALYST_PRIORITIES.map((p) => ({
  value: p,
  label: p,
}));

// ─── Colors (ADS tokens with Jira-parity fallbacks) ──────────────────────────

/**
 * Priority → color map. Used by PriorityIcon, table cells, badges, and cards.
 * All values are ADS tokens.
 */
export const PRIORITY_COLORS: Record<CatalystPriority, string> = {
  Highest: token('color.icon.danger', '#E5484D'),
  High:    token('color.icon.warning', '#F59E0B'),
  Medium:  token('color.icon.information', '#3B82F6'),
  Low:     token('color.icon.success', '#22C55E'),
  Lowest:  token('color.icon.subtle', '#8C8F96'),
};

// ─── Sort order ──────────────────────────────────────────────────────────────

/** Lowercase sort order for PRIORITY_ORDER comparisons. Index 0 = highest priority. */
export const PRIORITY_SORT_ORDER = CATALYST_PRIORITIES.map((p) => p.toLowerCase());

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise any priority string to a canonical CatalystPriority, or null. */
export function normalizePriority(raw: string | null | undefined): CatalystPriority | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  // Map old 4-level values
  if (lower === 'critical') return 'Highest';
  if (lower === 'normal') return 'Medium';
  const match = CATALYST_PRIORITIES.find((p) => p.toLowerCase() === lower);
  return match ?? null;
}
