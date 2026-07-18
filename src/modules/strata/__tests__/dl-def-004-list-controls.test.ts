// DL-DEF-004 (CAT-STRATA-DLDEF-20260718-001): source/run collections gain functional
// search + status filter + pagination. The predicate is real behavior, not cosmetic —
// these tests pin its matching rules and the honest no-result contract (empty array,
// never a fallback set).
import { describe, expect, it } from 'vitest';

import { filterRunRows } from '@/modules/strata/pages/StrataDataPipelinePage';
import type { StrataUploadRun } from '@/modules/strata/types';

const mk = (over: Partial<StrataUploadRun>): StrataUploadRun => ({
  id: 'id', run_key: 'RUN-1', data_source_id: null, template_id: null, template_version: null,
  channel: 'manual', initiated_by: null, storage_path: null, file_name: null, file_hash: null,
  row_count_raw: 0, row_count_valid: 0, row_count_rejected: 0, status: 'completed',
  error_summary: null, started_at: '2026-07-18T10:00:00Z', completed_at: null,
  run_type: 'import', reverses_run_id: null, reversed_by_run_id: null, reversal_reason: null,
  ...over,
} as StrataUploadRun);

const runs = [
  mk({ id: 'a', run_key: 'RUN-23', file_name: 'J Lineage schema-missing-value.csv', status: 'failed' }),
  mk({ id: 'b', run_key: 'RUN-24', run_type: 'reversal', status: 'completed' }),
  mk({ id: 'c', run_key: 'RUN-25', file_name: 'clean.csv', status: 'completed' }),
];

describe('filterRunRows — DL-DEF-004 search/filter behavior', () => {
  it('matches run key case-insensitively', () => {
    expect(filterRunRows(runs, 'run-23', '').map((r) => r.id)).toEqual(['a']);
  });

  it('matches file name and run type', () => {
    expect(filterRunRows(runs, 'lineage', '').map((r) => r.id)).toEqual(['a']);
    expect(filterRunRows(runs, 'reversal', '').map((r) => r.id)).toEqual(['b']);
  });

  it('applies an exact status filter, composable with search', () => {
    expect(filterRunRows(runs, '', 'completed').map((r) => r.id)).toEqual(['b', 'c']);
    expect(filterRunRows(runs, 'run-2', 'failed').map((r) => r.id)).toEqual(['a']);
  });

  it('returns an honest empty result — never a fallback set', () => {
    expect(filterRunRows(runs, 'no-such-run', '')).toEqual([]);
    expect(filterRunRows([], 'anything', '')).toEqual([]);
  });
});
