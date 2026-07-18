/**
 * CFG-005 (final pack) — one canonical effective-permission decision.
 * Loading/errored roles are UNKNOWN (null): the UI must claim nothing, never
 * "Read-only for your role". Derived strata_admin (already merged into
 * useStrataRoles' data) governs everywhere, including data sources.
 */
import { describe, expect, it } from 'vitest';
import { canGovernConfig, canGovernData } from '../lib/permissions';

const q = (data: string[] | undefined, opts: { loading?: boolean; error?: boolean } = {}) => ({
  data, isLoading: opts.loading ?? false, isError: opts.error ?? false,
});

describe('canGovernData (CFG-005)', () => {
  it('derived strata_admin governs data sources — the failed-retest identity', () => {
    expect(canGovernData(q(['strategy_office', 'strata_admin']))).toBe(true);
    expect(canGovernData(q(['strata_admin']))).toBe(true);
  });

  it('data_steward governs data sources but not config records', () => {
    expect(canGovernData(q(['data_steward']))).toBe(true);
    expect(canGovernConfig(q(['data_steward']))).toBe(false);
  });

  it('loading or errored roles are UNKNOWN — never asserted as read-only', () => {
    expect(canGovernData(q(undefined, { loading: true }))).toBeNull();
    expect(canGovernData(q(undefined, { error: true }))).toBeNull();
    expect(canGovernData(q(undefined))).toBeNull();
  });

  it('a genuinely unprivileged role is read-only (restriction preserved)', () => {
    expect(canGovernData(q(['executive_viewer']))).toBe(false);
    expect(canGovernData(q([]))).toBe(false);
  });
});
