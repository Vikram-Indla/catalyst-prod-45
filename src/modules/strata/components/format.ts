/**
 * STRATA display formatting — single source for every number/date the module renders.
 * Values come from the calc engine / snapshots verbatim; formatting is display-only
 * and never changes the underlying provenance (raw values stay in evidence payloads).
 */

/** Scores (0–100 scale): 1 decimal max, no trailing zero ("87.5", "100"). */
export function fmtScore(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

/** Percentages: value already in percent units → "86%", "77.5%". */
export function fmtPct(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

/** Ratio (0–1) → percent. */
export function fmtRatioPct(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return fmtPct(n * 100);
}

/** Money in SAR, compact for executive tiles: "SAR 2.7M", "SAR 120M", "SAR 950K". */
export function fmtSarCompact(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `SAR ${n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })}`;
}

/** Money in SAR, full: "SAR 10,000,000". */
export function fmtSar(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return `SAR ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/** Generic quantity with unit from governed KPI config ("%", "SAR", "index"). */
export function fmtUnit(v: number | string | null | undefined, unit?: string | null): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  const base = n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (!unit) return base;
  if (unit === '%') return `${base}%`;
  if (unit.toUpperCase() === 'SAR') return `SAR ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${base} ${unit}`;
}

/** Dates: "5 Jul 2026". */
export function fmtDate(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Timestamps: "5 Jul 2026, 01:56". */
export function fmtDateTime(v: string | Date | null | undefined): string {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '—';
  return `${fmtDate(d)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Governed enum/metric keys → readable label ("variance_explanation" → "Variance explanation"). */
export function labelize(key: string | null | undefined): string {
  if (!key) return '—';
  const s = String(key).replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Curated business labels for `strata_audit_events.action` values that don't
 * read well verbatim ("RPC:upsert_theme_charter" → "Charter updated").
 * Row-level INSERT/UPDATE/DELETE and unmapped RPC:<name> values fall back to
 * a humanized version of the raw action — never invented text, no silent drop.
 */
const AUDIT_ACTION_LABELS: Record<string, string> = {
  INSERT: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  'RPC:create_strategy_element': 'Created',
  'RPC:update_element': 'Details updated',
  'RPC:upsert_theme_charter': 'Charter updated',
  'RPC:promote_element': 'Promoted',
  'RPC:retire_element': 'Retired',
};

/** Business-readable audit action label — see AUDIT_ACTION_LABELS. */
export function formatAuditAction(action: string | null | undefined): string {
  if (!action) return '—';
  const known = AUDIT_ACTION_LABELS[action];
  if (known) return known;
  const rpcName = action.match(/^RPC:(.+)$/)?.[1];
  return rpcName ? labelize(rpcName) : action;
}
