/**
 * _shared/ai-cache.ts — shared content-hash + daily-reset primitives for the
 * ai-digest AI features (themes, ageing-triage, …).
 *
 * Extracted 2026-06-18 so every "click a button that generates data" surface
 * shares ONE no-delta guard: hash the semantic input fields, compare to the
 * stored signature, and skip the Gemini call when nothing changed. Before this,
 * themes had a bespoke signature inline in themes.ts and ageing-triage had no
 * cache at all (every click re-ran Gemini).
 *
 * Import-safe under vitest (no Deno-only deps at module scope; crypto.subtle
 * exists in both Deno and Node 18+).
 */

/**
 * Deterministic SHA-256 fingerprint over the chosen semantic fields of a row
 * set. Order-independent (rows are sorted), truncated to 16 hex chars — we
 * fingerprint for cache invalidation, not signing, so collisions are fine.
 *
 * Pass ONLY the fields the downstream computation actually consumes — never
 * timestamps / counters that churn on cosmetic re-syncs or the passage of time
 * (e.g. exclude jira_updated_at and days_open). See the themes 2026-06-02
 * lesson: hashing updated_at busted the cache on no-op webhooks.
 */
export async function computeSignature(
  rows: Array<Record<string, unknown>>,
  fields: string[],
): Promise<string> {
  const parts = rows
    .map(r => fields.map(f => String(r[f] ?? '')).join(':'))
    .sort()
    .join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts));
  return Array.from(new Uint8Array(buf).slice(0, 8))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Next 06:00 Asia/Riyadh (AST = UTC+3, no DST) expressed as a UTC Date.
 * 06:00 AST == 03:00 UTC. The shared daily-reset boundary used by the cache
 * TTL and the 06:00 pre-warm cron. If today's 03:00 UTC has passed, returns
 * tomorrow's.
 */
export function nextSixAmRiyadhUtc(now: Date): Date {
  const target = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0, 0,
  ));
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target;
}
