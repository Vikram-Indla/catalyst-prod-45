/**
 * useR360Reporting — buildReportingOptions pure function tests.
 *
 * buildReportingOptions takes a list of admin profiles and the current user's
 * profileId, filters out the current user, and returns a sorted list of
 * { id, name } options for the manager picker dropdown.
 *
 * FAILS until buildReportingOptions is exported from useR360Reporting.ts.
 */
import { describe, it, expect } from 'vitest';
import { buildReportingOptions } from '@/hooks/useR360Reporting';

const PROFILES = [
  { id: 'p-charlie', full_name: 'Charlie Brown', email: 'charlie@co.com' },
  { id: 'p-alice',   full_name: 'Alice Tan',     email: 'alice@co.com'   },
  { id: 'p-vikram',  full_name: 'Vikram Indla',  email: 'vikram@co.com'  },
  { id: 'p-bob',     full_name: null,             email: 'bob@co.com'     },
];

describe('buildReportingOptions', () => {
  it('excludes the current user from the options list', () => {
    const opts = buildReportingOptions(PROFILES, 'p-vikram');
    expect(opts.map(o => o.id)).not.toContain('p-vikram');
  });

  it('returns remaining profiles sorted A→Z by display name', () => {
    const opts = buildReportingOptions(PROFILES, 'p-vikram');
    const names = opts.map(o => o.name);
    expect(names).toEqual(['Alice Tan', 'bob@co.com', 'Charlie Brown']);
  });

  it('falls back to email when full_name is null', () => {
    const opts = buildReportingOptions(PROFILES, 'p-vikram');
    const bob = opts.find(o => o.id === 'p-bob');
    expect(bob?.name).toBe('bob@co.com');
  });

  it('falls back to id when both full_name and email are null', () => {
    const profiles = [{ id: 'p-ghost', full_name: null, email: null }];
    const opts = buildReportingOptions(profiles, 'other-user');
    expect(opts[0].name).toBe('p-ghost');
  });

  it('returns empty array when only the current user is in the list', () => {
    const opts = buildReportingOptions(
      [{ id: 'p-vikram', full_name: 'Vikram', email: 'v@co.com' }],
      'p-vikram',
    );
    expect(opts).toHaveLength(0);
  });

  it('trims whitespace from full_name', () => {
    const profiles = [{ id: 'p-x', full_name: '  Alice  ', email: 'a@co.com' }];
    const opts = buildReportingOptions(profiles, 'other');
    expect(opts[0].name).toBe('Alice');
  });
});
