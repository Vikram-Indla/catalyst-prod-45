import { describe, it, expect } from 'vitest';
import { jqlClause } from '../jqlClause';

describe('jqlClause', () => {
  it('returns null for empty/undefined values', () => {
    expect(jqlClause('status', [])).toBeNull();
    expect(jqlClause('status', undefined)).toBeNull();
  });
  it('single value → field = "x"', () => {
    expect(jqlClause('status', ['Open'])).toBe('status = "Open"');
  });
  it('multiple values → field in ("x", "y")', () => {
    expect(jqlClause('status', ['A', 'B'])).toBe('status in ("A", "B")');
  });
  it('honours a custom quote fn (escaping)', () => {
    const esc = (v: string) => `"${v.replace(/"/g, '\\"')}"`;
    expect(jqlClause('status', ['a"b'], esc)).toBe('status = "a\\"b"');
  });
});
