/**
 * Unit tests for the pure helpers in CatalystReadOnlyCustomFields.
 *
 * These pin down the runtime payload-shape contract so a future Jira
 * sync change cannot silently drop multi-checkbox values or mangle date
 * formatting on the read path. No React, no Supabase, no mocks.
 *
 * jira-compare overnight session (2026-04-29) — companion to the S4 /
 * S7 / S8 read-only customfield surfaces.
 */
import { describe, it, expect } from 'vitest';
import {
  formatJiraDate,
  readMultiCheckboxValues,
  approvalAppearance,
} from '../CatalystReadOnlyCustomFields';

describe('formatJiraDate', () => {
  it('returns null for null / undefined / empty', () => {
    expect(formatJiraDate(null)).toBeNull();
    expect(formatJiraDate(undefined)).toBeNull();
    expect(formatJiraDate('')).toBeNull();
  });

  it('returns null for an unparseable string', () => {
    expect(formatJiraDate('not-a-date')).toBeNull();
    expect(formatJiraDate('2025-13-45')).toBeNull();
  });

  it('formats a valid ISO date as DD MMM YYYY (en-GB)', () => {
    // Jira stores dates as YYYY-MM-DD (no time). Sample from BAU-3988.
    const out = formatJiraDate('2025-09-23');
    expect(out).toMatch(/^\d{2} [A-Za-z]{3} \d{4}$/);
    // Verify the day/year survive the parse — month name is locale-dependent
    // in CI runners but day and year are stable.
    expect(out).toContain('2025');
    expect(out?.startsWith('23 ')).toBe(true);
  });

  it('handles full-ISO-with-time strings', () => {
    const out = formatJiraDate('2025-09-23T00:00:00.000Z');
    expect(out).not.toBeNull();
    expect(out).toContain('2025');
  });
});

describe('readMultiCheckboxValues', () => {
  it('returns [] for null / undefined', () => {
    expect(readMultiCheckboxValues(null)).toEqual([]);
    expect(readMultiCheckboxValues(undefined)).toEqual([]);
  });

  it('extracts values from the canonical Jira shape (array of {value, id})', () => {
    // From getJiraIssueTypeMetaWithFields(BAU, 10173):
    //   customfield_10492 allowedValues: Yes (10877) / No (10878) / Conditional (10879)
    const raw = [
      { value: 'Yes', id: '10877', self: 'https://...' },
      { value: 'Conditional', id: '10879', self: 'https://...' },
    ];
    expect(readMultiCheckboxValues(raw)).toEqual(['Yes', 'Conditional']);
  });

  it('extracts a single value from a single-object payload', () => {
    expect(readMultiCheckboxValues({ value: 'Yes', id: '10877' })).toEqual(['Yes']);
  });

  it('passes through a raw string payload (legacy fallback)', () => {
    expect(readMultiCheckboxValues('Yes')).toEqual(['Yes']);
  });

  it('skips array entries that have no value field', () => {
    const raw = [
      { value: 'Yes', id: '10877' },
      { id: '10878' }, // malformed — no value
      { value: '', id: '10879' }, // empty value
      'No', // raw string in the array — should pass through
    ];
    expect(readMultiCheckboxValues(raw)).toEqual(['Yes', 'No']);
  });

  it('returns [] for an empty array', () => {
    expect(readMultiCheckboxValues([])).toEqual([]);
  });

  it('returns [] for an empty string', () => {
    expect(readMultiCheckboxValues('')).toEqual([]);
  });

  it('returns [] for a single-object payload with no value', () => {
    expect(readMultiCheckboxValues({ id: '10877' })).toEqual([]);
    expect(readMultiCheckboxValues({ value: '' })).toEqual([]);
  });

  it('returns [] for unexpected types (number, boolean)', () => {
    expect(readMultiCheckboxValues(0)).toEqual([]);
    expect(readMultiCheckboxValues(false)).toEqual([]);
  });
});

describe('approvalAppearance', () => {
  it('maps the three known approval values', () => {
    expect(approvalAppearance('Yes')).toBe('success');
    expect(approvalAppearance('No')).toBe('removed');
    expect(approvalAppearance('Conditional')).toBe('inprogress');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(approvalAppearance('yes')).toBe('success');
    expect(approvalAppearance('  YES  ')).toBe('success');
    expect(approvalAppearance('NO')).toBe('removed');
    expect(approvalAppearance('conditional')).toBe('inprogress');
  });

  it("falls back to 'default' for unknown values", () => {
    expect(approvalAppearance('Maybe')).toBe('default');
    expect(approvalAppearance('')).toBe('default');
    expect(approvalAppearance('TBD')).toBe('default');
  });
});
