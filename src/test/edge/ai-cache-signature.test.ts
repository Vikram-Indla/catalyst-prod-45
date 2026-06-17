import { describe, it, expect } from 'vitest';
import { computeSignature, nextSixAmRiyadhUtc } from '../../../supabase/functions/_shared/ai-cache.ts';

/**
 * Shared cache signature contract (2026-06-18). Generalised from the themes
 * signature so themes AND ageing-triage share one no-delta guard. The signature
 * must depend ONLY on the fields passed in — fields not listed (e.g. a churning
 * days_open or updated_at) must never change the result.
 */
describe('computeSignature — shared semantic cache key', () => {
  const rows = [
    { key: 'BAU-1', status: 'To Do', commentCount: 0, assigneeIsInactive: true, daysOpen: 120 },
    { key: 'BAU-2', status: 'In Progress', commentCount: 3, assigneeIsInactive: false, daysOpen: 40 },
  ];
  const FIELDS = ['key', 'status', 'commentCount', 'assigneeIsInactive'];

  it('ignores fields not in the field list (days_open churn)', async () => {
    const aged = rows.map(r => ({ ...r, daysOpen: r.daysOpen + 7 }));
    expect(await computeSignature(aged, FIELDS)).toBe(await computeSignature(rows, FIELDS));
  });

  it('changes when a listed field changes (status)', async () => {
    const changed = rows.map((r, i) => (i === 0 ? { ...r, status: 'Done' } : r));
    expect(await computeSignature(changed, FIELDS)).not.toBe(await computeSignature(rows, FIELDS));
  });

  it('changes when the row set changes (item leaves top-10)', async () => {
    expect(await computeSignature(rows.slice(0, 1), FIELDS)).not.toBe(await computeSignature(rows, FIELDS));
  });

  it('is order-independent for the same row set', async () => {
    expect(await computeSignature([...rows].reverse(), FIELDS)).toBe(await computeSignature(rows, FIELDS));
  });

  it('treats null/undefined and empty string identically', async () => {
    const a = [{ key: 'X', status: null }];
    const b = [{ key: 'X', status: '' }];
    expect(await computeSignature(a, ['key', 'status'])).toBe(await computeSignature(b, ['key', 'status']));
  });
});

describe('nextSixAmRiyadhUtc — daily reset boundary', () => {
  it('returns 03:00 UTC (06:00 AST)', () => {
    const r = nextSixAmRiyadhUtc(new Date('2026-06-18T01:00:00Z'));
    expect(r.getUTCHours()).toBe(3);
    expect(r.toISOString()).toBe('2026-06-18T03:00:00.000Z');
  });

  it('rolls to tomorrow when past 03:00 UTC', () => {
    const r = nextSixAmRiyadhUtc(new Date('2026-06-18T05:00:00Z'));
    expect(r.toISOString()).toBe('2026-06-19T03:00:00.000Z');
  });
});
