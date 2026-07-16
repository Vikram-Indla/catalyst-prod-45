/**
 * Phase-5 regression — the governed display logic behind anchors 25 and 05.
 *
 *  - bandRows (5D / anchor 25): a band's readable range. From ≥ its own
 *    min_score, To < the NEXT-HIGHER band's min_score, open at the top. The
 *    boundary is the design object, so an off-by-one here is a governance bug:
 *    it would misstate the policy that decides every rating.
 *  - ModelIntegrityBand (5C / anchor 05): tri-state, and Submit blocked with a
 *    VISIBLE reason — never a silent disable.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const H = vi.hoisted(() => {
  const mkModel = (id: string, status = 'approved') => ({
    id, name: `Model ${id}`, owner_scope_type: 'enterprise', rollup_method: 'weighted_average',
    period_granularity: 'quarter', version: 1, status, effective_from: '2026-07-05', effective_to: null,
    approved_by: null, approved_at: null, change_reason: null, supersedes_id: null,
    created_by: null, created_at: 'x', updated_at: 'x',
  });
  return {
    mkModel,
    models: [] as unknown[],
    modelPerspectives: [] as unknown[],
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useScorecardModels: () => H.ok(H.models),
  useAllModelPerspectives: () => H.ok(H.modelPerspectives),
  useAllModelMeasures: () => H.ok([]),
  useKpis: () => H.ok([]),
  useModelPerspectives: () => H.ok(H.modelPerspectives),
  usePerspectives: () => H.ok([{ id: 'p1', name: 'Financial' }, { id: 'p2', name: 'Customer' }]),
  useStrataRoles: () => H.ok(['strata_admin']),
  useInvalidateStrata: () => vi.fn(),
  useChangeRequests: () => H.ok([]),
  useGateModels: () => H.ok([]),
  useKpiTypes: () => H.ok([]),
  useProfileNames: () => H.ok(new Map()),
  useProjectCardFieldConfigs: () => H.ok([]),
  useProjectCardPicklists: () => H.ok([]),
  useProjectCardSectionConfigs: () => H.ok([]),
  useProjectCardTabConfigs: () => H.ok([]),
  useRoleAssignments: () => H.ok([]),
  useStrataAudit: () => H.ok([]),
  useStrataNotificationRules: () => H.ok([]),
  useThresholdSchemes: () => H.ok([]),
  useUploadTemplates: () => H.ok([]),
  useValueCategories: () => H.ok([]),
  useWorkflowConfigs: () => H.ok([]),
  useStrataNotifications: () => H.ok([]),
}));
vi.mock('@/modules/strata/domain', () => ({
  configApi: {
    setModelPerspectiveWeights: vi.fn(), submitRecord: vi.fn(), approveRecord: vi.fn(),
    approveScorecardModel: vi.fn(), retireRecord: vi.fn(),
  },
  scorecardApi: { setModelMeasures: vi.fn() },
  governanceApi: {},
}));

import { ScorecardModelsSection, bandRows } from '@/modules/strata/pages/StrataAdminConfigPage';

describe('bandRows — anchor 25 boundary derivation', () => {
  // Deliberately unsorted: the real scheme's JSON order must not be trusted.
  const BANDS = [
    { key: 'watch', label: 'WATCH', min_score: 60, appearance: 'moved' },
    { key: 'at_risk', label: 'AT RISK', min_score: 0, appearance: 'removed' },
    { key: 'on_track', label: 'ON TRACK', min_score: 85, appearance: 'success' },
  ];

  it('sorts bands high→low regardless of input order', () => {
    expect(bandRows(BANDS).map((b) => b.label)).toEqual(['ON TRACK', 'WATCH', 'AT RISK']);
  });

  it('derives From ≥ / To < so bands tile without gaps, open at the top', () => {
    // matches the live Salam Standard RAG scheme verified in the §20 pass
    expect(bandRows(BANDS).map((b) => [b.label, b.from, b.to])).toEqual([
      ['ON TRACK', 85, null], // null => rendered "—": nothing above it
      ['WATCH', 60, 85],
      ['AT RISK', 0, 60],
    ]);
  });

  it('each band starts exactly where the one below it ends (no gap, no overlap)', () => {
    const rows = bandRows(BANDS);
    for (let i = 0; i < rows.length - 1; i++) {
      expect(rows[i].from).toBe(rows[i + 1].to);
    }
  });

  it('a single band is open-topped', () => {
    expect(bandRows([{ key: 'all', label: 'ALL', min_score: 0 }]))
      .toEqual([{ key: 'all', label: 'ALL', appearance: undefined, from: 0, to: null }]);
  });

  it('handles an empty band list without throwing', () => {
    expect(bandRows([])).toEqual([]);
  });

  it('does not mutate the caller\'s array', () => {
    const input = [...BANDS];
    bandRows(input);
    expect(input.map((b) => b.label)).toEqual(['WATCH', 'AT RISK', 'ON TRACK']);
  });
});

describe('ModelIntegrityBand — anchor 05 tri-state + blocking', () => {
  const renderWith = (weights: number[], status = 'approved') => {
    H.models = [H.mkModel('m1', status)];
    H.modelPerspectives = weights.map((w, i) => ({
      id: `mp${i}`, model_id: 'm1', perspective_id: `p${i + 1}`, weight: w, order_index: i,
    }));
    return render(<ScorecardModelsSection onError={() => {}} />);
  };

  it('✓ when perspective weights total exactly 100', () => {
    renderWith([60, 40]);
    expect(screen.getByText(/✓ Perspective weights total 100/)).toBeInTheDocument();
    expect(screen.queryByText(/Cannot submit until integrity passes/)).not.toBeInTheDocument();
  });

  it('✕ under 100 tells you how much to ASSIGN', () => {
    renderWith([60, 30]); // 90
    expect(screen.getByText(/✕ Perspective weights total 90 — assign the remaining 10/)).toBeInTheDocument();
    expect(screen.getByText(/Cannot submit until integrity passes/)).toBeInTheDocument();
  });

  it('✕ over 100 tells you how much to REMOVE (not a negative "assign")', () => {
    renderWith([60, 50]); // 110
    expect(screen.getByText(/✕ Perspective weights total 110 — remove 10/)).toBeInTheDocument();
  });

  it('△ when no perspective weights are configured at all', () => {
    renderWith([]);
    expect(screen.getByText(/△ No perspective weights configured yet/)).toBeInTheDocument();
  });

  it('a DRAFT model with broken integrity blocks Submit with a VISIBLE reason (never a silent disable)', () => {
    renderWith([60, 30], 'draft'); // 90
    const submit = screen.getByRole('button', { name: /Submit for approval/i });
    expect(submit).toBeDisabled();
    expect(screen.getByText(/Weights total 90 — must total 100/)).toBeInTheDocument();
  });

  it('a DRAFT model at 100 can be submitted', () => {
    renderWith([60, 40], 'draft');
    expect(screen.getByRole('button', { name: /Submit for approval/i })).not.toBeDisabled();
  });
});
