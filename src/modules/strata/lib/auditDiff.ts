/**
 * CFG-001 — exact before/after values for the Configuration audit trail.
 *
 * strata_audit_events already stores full `before`/`after` row snapshots
 * (trigger-fed, INSERT-only ledger) plus an optional `note` (rationale).
 * The UI was dropping them. This helper turns the two snapshots into a
 * field-level change list the table can render verbatim — read-side only,
 * the ledger itself is never touched.
 */

export interface AuditFieldChange {
  field: string;
  from: string | null;
  to: string | null;
}

/** Bookkeeping columns that change on every write and carry no meaning for a reviewer. */
const NOISE_FIELDS = new Set(['updated_at']);

const MAX_VALUE_LEN = 80;

/** Render a snapshot value exactly — no domain defaults, no reinterpretation. */
export function fmtAuditValue(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.length > MAX_VALUE_LEN ? `${v.slice(0, MAX_VALUE_LEN)}…` : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > MAX_VALUE_LEN ? `${s.slice(0, MAX_VALUE_LEN)}…` : s;
  } catch {
    return null;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Field-level diff of two audit snapshots.
 * - UPDATE (both present): fields whose values differ.
 * - INSERT (only after): every non-null field, from = null.
 * - DELETE (only before): every non-null field, to = null.
 */
export function auditChangedFields(before: unknown, after: unknown, maxFields = 6): {
  changes: AuditFieldChange[];
  truncated: number;
} {
  const b = isRecord(before) ? before : null;
  const a = isRecord(after) ? after : null;
  if (!b && !a) return { changes: [], truncated: 0 };

  const keys = Array.from(new Set([...Object.keys(b ?? {}), ...Object.keys(a ?? {})]))
    .filter((k) => !NOISE_FIELDS.has(k));

  const all: AuditFieldChange[] = [];
  for (const k of keys.sort()) {
    const from = b ? fmtAuditValue(b[k]) : null;
    const to = a ? fmtAuditValue(a[k]) : null;
    if (b && a) {
      if (from !== to) all.push({ field: k, from, to });
    } else if (from !== null || to !== null) {
      all.push({ field: k, from, to });
    }
  }
  return {
    changes: all.slice(0, maxFields),
    truncated: Math.max(0, all.length - maxFields),
  };
}
