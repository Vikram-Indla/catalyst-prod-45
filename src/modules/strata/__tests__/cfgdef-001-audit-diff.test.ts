/**
 * CFG-001 — the Configuration audit trail must surface exact before/after
 * values and rationale. The ledger (strata_audit_events) always captured
 * before/after/note; auditChangedFields turns the snapshots into the
 * field-level lines the table renders.
 */
import { describe, expect, it } from 'vitest';
import { auditChangedFields, fmtAuditValue } from '../lib/auditDiff';

describe('auditChangedFields (CFG-001)', () => {
  it('UPDATE: reports exactly the fields whose values differ, with exact old → new', () => {
    const before = { id: 'x', name: 'Financial', weight: 30, status: 'approved', updated_at: '2026-07-01' };
    const after = { id: 'x', name: 'Financial', weight: 40, status: 'approved', updated_at: '2026-07-18' };
    const { changes, truncated } = auditChangedFields(before, after);
    expect(changes).toEqual([{ field: 'weight', from: '30', to: '40' }]);
    expect(truncated).toBe(0);
  });

  it('UPDATE: updated_at churn alone is not a change', () => {
    const { changes } = auditChangedFields(
      { id: 'x', updated_at: 'a' },
      { id: 'x', updated_at: 'b' },
    );
    expect(changes).toEqual([]);
  });

  it('INSERT: lists created values with no before side', () => {
    const { changes } = auditChangedFields(null, { name: 'ESG', weight: 10 });
    expect(changes).toEqual([
      { field: 'name', from: null, to: 'ESG' },
      { field: 'weight', from: null, to: '10' },
    ]);
  });

  it('DELETE: lists removed values with no after side', () => {
    const { changes } = auditChangedFields({ name: 'ESG' }, null);
    expect(changes).toEqual([{ field: 'name', from: 'ESG', to: null }]);
  });

  it('null → value and value → null are both visible transitions', () => {
    const { changes } = auditChangedFields(
      { id: 'x', approved_by: null, note: 'old' },
      { id: 'x', approved_by: 'u1', note: null },
    );
    expect(changes).toEqual([
      { field: 'approved_by', from: null, to: 'u1' },
      { field: 'note', from: 'old', to: null },
    ]);
  });

  it('caps rendered fields and reports the truncated count', () => {
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (let i = 0; i < 10; i++) { before[`f${i}`] = i; after[`f${i}`] = i + 1; }
    const { changes, truncated } = auditChangedFields(before, after, 6);
    expect(changes).toHaveLength(6);
    expect(truncated).toBe(4);
  });

  it('non-object snapshots are handled without throwing', () => {
    expect(auditChangedFields('junk', 42).changes).toEqual([]);
    expect(auditChangedFields(null, null).changes).toEqual([]);
  });
});

describe('fmtAuditValue', () => {
  it('renders scalars exactly and truncates long values', () => {
    expect(fmtAuditValue(10)).toBe('10');
    expect(fmtAuditValue(false)).toBe('false');
    expect(fmtAuditValue('x'.repeat(100))).toBe(`${'x'.repeat(80)}…`);
    expect(fmtAuditValue({ a: 1 })).toBe('{"a":1}');
    expect(fmtAuditValue(null)).toBeNull();
  });
});
