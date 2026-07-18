// DL-DEF-009 (CAT-STRATA-DLDEF-20260718-001): scorecard dependents must never
// render indistinguishable duplicate labels. One label per governed model
// identity; same-name versions distinguished by version; multi-measure links
// carry an explicit count; residual collisions fall back to the model id.
import { describe, expect, it } from 'vitest';

import { formatScorecardDependents } from '@/modules/strata/pages/StrataDataPipelinePage';

describe('formatScorecardDependents — DL-DEF-009', () => {
  it('one scorecard, one measure → plain single label', () => {
    expect(formatScorecardDependents([{ id: 'm1', name: 'B2B Sector Scorecard', version: 1, measureCount: 1 }]))
      .toEqual(['B2B Sector Scorecard (v1)']);
  });

  it('one scorecard, multiple measures → explicit measure count, single row', () => {
    expect(formatScorecardDependents([{ id: 'm1', name: 'B2B Sector Scorecard', version: 2, measureCount: 3 }]))
      .toEqual(['B2B Sector Scorecard (v2) · 3 measures']);
  });

  it('multiple scorecards → each rendered once, distinguishable', () => {
    const labels = formatScorecardDependents([
      { id: 'm1', name: 'B2B Sector Scorecard', version: 1, measureCount: 1 },
      { id: 'm2', name: 'B2B Sector Scorecard', version: 2, measureCount: 1 },
      { id: 'm3', name: 'Enterprise Scorecard', version: 1, measureCount: 1 },
    ]);
    expect(labels).toEqual(['B2B Sector Scorecard (v1)', 'B2B Sector Scorecard (v2)', 'Enterprise Scorecard (v1)']);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('same name AND version (worst case) → id suffix keeps labels distinguishable', () => {
    const labels = formatScorecardDependents([
      { id: 'aaaa1111-0000-0000-0000-000000000000', name: 'X', version: 1, measureCount: 1 },
      { id: 'bbbb2222-0000-0000-0000-000000000000', name: 'X', version: 1, measureCount: 1 },
    ]);
    expect(new Set(labels).size).toBe(2);
    expect(labels[0]).toContain('aaaa1111');
    expect(labels[1]).toContain('bbbb2222');
  });

  it('no dependents → empty list (caller renders the honest empty state)', () => {
    expect(formatScorecardDependents([])).toEqual([]);
  });
});
