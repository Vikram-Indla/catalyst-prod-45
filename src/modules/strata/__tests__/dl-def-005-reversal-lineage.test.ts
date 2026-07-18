// DL-DEF-005 residual (CAT-STRATA-DLDEF-20260718-001): a compensating reversal run
// must derive a TERMINAL lifecycle (never "Promote: in progress" / "Calculated: not
// started"), resolve its bidirectional relationships to human-readable run keys with
// navigable routes, and show the actor's governed display name — falling back to the
// raw identifier (honest evidence), never a guess.
import { describe, expect, it } from 'vitest';

import { Routes } from '@/lib/routes';
import { buildRunKeyMap, reversalDisplayMeta, runLifecycleSteps } from '@/modules/strata/pages/StrataDataPipelinePage';
import type { StrataUploadRun } from '@/modules/strata/types';

const baseRun: StrataUploadRun = {
  id: 'run-24-id',
  run_key: 'RUN-24',
  data_source_id: null,
  template_id: null,
  template_version: null,
  channel: 'manual',
  initiated_by: 'actor-uuid',
  storage_path: null,
  file_name: null,
  file_hash: null,
  row_count_raw: 0,
  row_count_valid: 0,
  row_count_rejected: 0,
  status: 'completed',
  error_summary: null,
  started_at: '2026-07-18T10:00:00Z',
  completed_at: '2026-07-18T10:00:05Z',
  run_type: 'reversal',
  reverses_run_id: 'run-23-id',
  reversed_by_run_id: null,
  reversal_reason: 'J Lineage 20260718-1410 reversal reason',
};

describe('runLifecycleSteps — reversal runs are terminal (DL-DEF-005)', () => {
  it('derives a terminal lifecycle with no Promote/Calculated steps', () => {
    const steps = runLifecycleSteps(baseRun);
    const ids = steps.map((s) => s.id);
    expect(ids).not.toContain('promote');
    expect(ids).not.toContain('calculated');
    expect(steps.every((s) => s.state !== 'current' && s.state !== 'todo')).toBe(true);
    expect(steps[steps.length - 1]).toMatchObject({ id: 'terminal', state: 'done' });
  });

  it('keeps the 7-step import journey for import runs', () => {
    const steps = runLifecycleSteps({ ...baseRun, run_type: 'import', reverses_run_id: null, reversal_reason: null });
    expect(steps.map((s) => s.id)).toEqual(['contract', 'upload', 'map', 'validate', 'resolve', 'promote', 'calculated']);
  });

  it('treats a null run_type as an import run (legacy rows)', () => {
    const steps = runLifecycleSteps({ ...baseRun, run_type: null });
    expect(steps.map((s) => s.id)).toContain('promote');
  });
});

describe('reversalDisplayMeta — run keys and governed actor name (DL-DEF-005)', () => {
  const runKeyById = new Map([['run-23-id', 'RUN-23'], ['run-24-id', 'RUN-24']]);
  const profiles = new Map([['actor-uuid', { name: 'Vikram Indla' }]]);

  it('resolves reverses/reversed-by ids to run keys and the actor to a display name', () => {
    const meta = reversalDisplayMeta(baseRun, runKeyById, profiles);
    expect(meta).toEqual({ reversesKey: 'RUN-23', reversedByKey: null, actorName: 'Vikram Indla' });
  });

  it('resolves the original run back to its reversal (bidirectional)', () => {
    const meta = reversalDisplayMeta(
      { reverses_run_id: null, reversed_by_run_id: 'run-24-id', initiated_by: 'actor-uuid' },
      runKeyById,
      profiles,
    );
    expect(meta.reversedByKey).toBe('RUN-24');
  });

  it('returns null (never a guess) when a run or profile is unknown', () => {
    const meta = reversalDisplayMeta(
      { reverses_run_id: 'unknown-run', reversed_by_run_id: null, initiated_by: 'unknown-actor' },
      runKeyById,
      profiles,
    );
    expect(meta).toEqual({ reversesKey: null, reversedByKey: null, actorName: null });
  });

  it('builds the navigable run-detail route from the resolved key', () => {
    expect(Routes.strata.run('RUN-23')).toBe('/strata/data/runs/RUN-23');
  });
});

describe('buildRunKeyMap — resolution with the real staging RUN-23/RUN-24 shapes', () => {
  // Exact ids/keys observed on staging for the failing retest record.
  const run23 = { id: '4470832a-d05d-4f9a-afe1-b5cda7a4f2dc', run_key: 'RUN-23' };
  const run24 = { id: 'ac5f085f-7ddb-401c-9cda-ec031185a6cc', run_key: 'RUN-24' };

  it('resolves reversal→original from the list query (RUN-24 page shows RUN-23)', () => {
    const map = buildRunKeyMap([run23, run24]);
    const meta = reversalDisplayMeta(
      { reverses_run_id: run23.id, reversed_by_run_id: null, initiated_by: null },
      map, undefined,
    );
    expect(meta.reversesKey).toBe('RUN-23');
    expect(Routes.strata.run(meta.reversesKey!)).toBe('/strata/data/runs/RUN-23');
  });

  it('resolves original→reversal (RUN-23 page shows RUN-24)', () => {
    const map = buildRunKeyMap([run23, run24]);
    const meta = reversalDisplayMeta(
      { reverses_run_id: null, reversed_by_run_id: run24.id, initiated_by: null },
      map, undefined,
    );
    expect(meta.reversedByKey).toBe('RUN-24');
    expect(Routes.strata.run(meta.reversedByKey!)).toBe('/strata/data/runs/RUN-24');
  });

  it('still resolves when the full-list query returns nothing — direct by-id fetches win', () => {
    // The Cycle 4 failure mode: list unavailable/scoped → raw UUID was shown.
    const map = buildRunKeyMap([], run23, run24);
    expect(map.get(run23.id)).toBe('RUN-23');
    expect(map.get(run24.id)).toBe('RUN-24');
  });

  it('falls back honestly (null → raw UUID render) only when NOTHING resolves', () => {
    const meta = reversalDisplayMeta(
      { reverses_run_id: run23.id, reversed_by_run_id: null, initiated_by: null },
      buildRunKeyMap([], null, undefined), undefined,
    );
    expect(meta.reversesKey).toBeNull();
  });
});
