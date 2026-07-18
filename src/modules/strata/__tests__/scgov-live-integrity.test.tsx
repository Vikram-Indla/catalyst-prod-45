/**
 * SC-GOVAPPROVAL session 002 — live model-integrity validation + incomplete-draft save.
 *
 * Screenshot defect: both perspectives held measures totalling 50, yet MODEL
 * INTEGRITY claimed "has no measures assigned" — the band validated stale
 * persisted rows while the measures editor held the current (unsaved) rows,
 * and Save was hard-blocked until every group totalled 100, so the honest
 * state could never even be persisted.
 *
 * This suite proves:
 *   - the four coverage states render distinctly from PERSISTED rows;
 *   - while the editor is open the band validates the LIVE draft (labeled as
 *     unsaved) — an underweight edit never reads as "no measures assigned";
 *   - an incomplete draft SAVES (button enabled, RPC called with the partial
 *     totals) while submission stays blocked with a stated reason.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const H = vi.hoisted(() => {
  const state = {
    userId: 'author-1',
    roles: ['strategy_office'] as string[],
    models: [] as unknown[],
    modelPerspectives: [] as unknown[],
    measures: [] as unknown[],
  };
  const mkModel = (over: Record<string, unknown> = {}) => ({
    id: 'm1', name: 'wholesate 2026 score card', owner_scope_type: 'sector',
    rollup_method: 'custom', period_granularity: 'month',
    version: 1, status: 'draft', effective_from: null, effective_to: null,
    approved_by: null, approved_at: null, change_reason: 'initial',
    supersedes_id: null, created_by: 'author-1', created_at: 'x', updated_at: 'x',
    submission_attempt: 0, submitted_by: null, submitted_at: null,
    assigned_approver_id: null, assignment_source: null,
    review_comment: null, rejected_by: null, rejected_at: null,
    ...over,
  });
  const names = new Map([
    ['author-1', { name: 'Vikram Indla', email: 'v@x', avatarUrl: null }],
  ]);
  return {
    state, mkModel, names,
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useScorecardModels: () => H.ok(H.state.models),
  useAllModelPerspectives: () => H.ok(H.state.modelPerspectives),
  useAllModelMeasures: () => H.ok(H.state.measures),
  useKpis: () => H.ok([]),
  useModelPerspectives: (id: string) =>
    H.ok((H.state.modelPerspectives as Array<{ model_id: string }>).filter((r) => r.model_id === id)),
  usePerspectives: () => H.ok([
    { id: 'p1', name: 'Financial' }, { id: 'p2', name: 'Network & Infrastructure' },
  ]),
  useStrataRoles: () => H.ok(H.state.roles),
  useStrataUserId: () => H.ok(H.state.userId),
  useProfileNames: () => H.ok(H.names),
  useInvalidateStrata: () => vi.fn(),
  useChangeRequests: () => H.ok([]),
  useGateModels: () => H.ok([]),
  useKpiTypes: () => H.ok([]),
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

const rpc = vi.hoisted(() => ({
  submitScorecardModel: vi.fn(async () => undefined),
  withdrawScorecardModel: vi.fn(async () => undefined),
  requestScorecardChanges: vi.fn(async () => undefined),
  rejectScorecardModel: vi.fn(async () => undefined),
  approveScorecardModel: vi.fn(async () => undefined),
  assignScorecardApprover: vi.fn(async () => undefined),
  validateScorecardModel: vi.fn(async () => ({ blockers: [], warnings: [], passed: [] })),
  scorecardApproverCandidates: vi.fn(async () => []),
  setModelMeasures: vi.fn(async () => undefined),
}));

vi.mock('@/modules/strata/domain', () => ({
  configApi: {
    ...rpc,
    setModelPerspectiveWeights: vi.fn(async () => undefined),
    submitRecord: vi.fn(async () => undefined),
    approveRecord: vi.fn(async () => undefined),
    retireRecord: vi.fn(async () => undefined),
    createModelDraftVersion: vi.fn(async () => 'new-id'),
    createThresholdDraftVersion: vi.fn(async () => 't2'),
    scorecardApprovalTasks: vi.fn(async () => []),
  },
  scorecardApi: { setModelMeasures: rpc.setModelMeasures },
  governanceApi: {},
  valueApi: { entityAudit: vi.fn(async () => []) },
}));

import { ScorecardModelsSection } from '@/modules/strata/pages/StrataAdminConfigPage';

const measure = (id: string, pid: string, kpi: string, weight: number) => ({
  id, model_id: 'm1', perspective_id: pid, kpi_id: kpi, weight, order_index: 0,
  required: false, aggregation_method: 'weighted_average', target_policy: 'default',
});

beforeEach(() => {
  vi.clearAllMocks();
  H.state.userId = 'author-1';
  H.state.roles = ['strategy_office'];
  H.state.models = [H.mkModel()];
  H.state.modelPerspectives = [
    { id: 'mp1', model_id: 'm1', perspective_id: 'p1', weight: 50, order_index: 0 },
    { id: 'mp2', model_id: 'm1', perspective_id: 'p2', weight: 50, order_index: 1 },
  ];
  H.state.measures = [];
});

describe('persisted coverage states are distinct', () => {
  it('underweight (screenshot repro): 50/50 totals report the remaining 50 — never "no measures"', () => {
    H.state.measures = [
      measure('ms1', 'p1', 'k1', 20), measure('ms2', 'p1', 'k2', 20),
      measure('ms3', 'p1', 'k3', 5), measure('ms4', 'p1', 'k4', 5),
      measure('ms5', 'p2', 'k5', 10), measure('ms6', 'p2', 'k6', 10),
      measure('ms7', 'p2', 'k7', 30),
    ];
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByText(/✕ Financial measure weights total 50 — assign the remaining 50/)).toBeInTheDocument();
    expect(screen.getByText(/✕ Network & Infrastructure measure weights total 50 — assign the remaining 50/)).toBeInTheDocument();
    expect(screen.queryByText(/has no measures assigned/)).not.toBeInTheDocument();
    // Submission stays blocked while underweight.
    expect(screen.getByText(/Each perspective needs measure weights totalling 100 before submit/)).toBeInTheDocument();
  });

  it('overweight reports the excess to remove', () => {
    H.state.measures = [
      measure('ms1', 'p1', 'k1', 80), measure('ms2', 'p1', 'k2', 45),
      measure('ms3', 'p2', 'k3', 100),
    ];
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByText(/✕ Financial measure weights total 125 — remove 25/)).toBeInTheDocument();
    expect(screen.queryByText(/has no measures assigned/)).not.toBeInTheDocument();
  });

  it('zero measures stays its own state', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByText(/✕ Financial has no measures assigned/)).toBeInTheDocument();
    expect(screen.getByText(/✕ Network & Infrastructure has no measures assigned/)).toBeInTheDocument();
  });

  it('valid totals pass with no measure issues', () => {
    H.state.measures = [measure('ms1', 'p1', 'k1', 100), measure('ms2', 'p2', 'k2', 100)];
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.queryByText(/measure weights total \d+ —/)).not.toBeInTheDocument();
    expect(screen.queryByText(/has no measures assigned/)).not.toBeInTheDocument();
  });
});

describe('live validation while the measures editor is open', () => {
  it('an edited weight revalidates the band from the CURRENT rows, labeled as unsaved', async () => {
    const user = userEvent.setup();
    H.state.measures = [measure('ms1', 'p1', 'k1', 100), measure('ms2', 'p2', 'k2', 100)];
    render(<ScorecardModelsSection onError={() => {}} />);
    // Healthy at rest — no live label.
    expect(screen.queryByText(/Live — includes unsaved measure edits/)).not.toBeInTheDocument();

    await user.click(screen.getByTestId('strata-model-measures-edit-m1'));
    const field = screen.getByTestId('strata-measure-weight-k1');
    await user.clear(field);
    await user.type(field, '50');

    // The band now validates the live draft: underweight — NOT "no measures".
    expect(await screen.findByText(/✕ Financial measure weights total 50 — assign the remaining 50/)).toBeInTheDocument();
    expect(screen.queryByText(/has no measures assigned/)).not.toBeInTheDocument();
    expect(screen.getByText(/Live — includes unsaved measure edits/)).toBeInTheDocument();
    // Unsaved changes block submission with a stated reason.
    expect(screen.getByText(/Unsaved measure edits — save or cancel the measures editor before submitting/)).toBeInTheDocument();
  });

  it('cancel restores the persisted (authoritative) validation', async () => {
    const user = userEvent.setup();
    H.state.measures = [measure('ms1', 'p1', 'k1', 100), measure('ms2', 'p2', 'k2', 100)];
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(screen.getByTestId('strata-model-measures-edit-m1'));
    const field = screen.getByTestId('strata-measure-weight-k1');
    await user.clear(field);
    await user.type(field, '50');
    expect(await screen.findByText(/Live — includes unsaved measure edits/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByText(/Live — includes unsaved measure edits/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/measure weights total 50/)).not.toBeInTheDocument();
  });
});

describe('incomplete drafts save; only submission is gated', () => {
  it('Save stays enabled at 50/100 totals, persists the partial set, and states the submit gate', async () => {
    const user = userEvent.setup();
    H.state.measures = [measure('ms1', 'p1', 'k1', 100), measure('ms2', 'p2', 'k2', 100)];
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(screen.getByTestId('strata-model-measures-edit-m1'));
    const field = screen.getByTestId('strata-measure-weight-k1');
    await user.clear(field);
    await user.type(field, '50');

    const save = screen.getByTestId('strata-model-measures-save-m1');
    expect(save).not.toBeDisabled();
    // The informational note replaces the old hard block.
    expect(screen.getByText(/Financial incomplete — the draft can be saved, but submission stays blocked until every perspective totals 100/)).toBeInTheDocument();
    expect(screen.queryByText(/must total 100 before saving/)).not.toBeInTheDocument();

    await user.click(save);
    await waitFor(() => expect(rpc.setModelMeasures).toHaveBeenCalledTimes(1));
    const [, rows] = rpc.setModelMeasures.mock.calls[0] as [string, Array<{ kpiId: string; weight: number }>];
    expect(rows.find((r) => r.kpiId === 'k1')?.weight).toBe(50);
    // Editor closed → live label gone; persisted validation is authoritative again.
    await waitFor(() => {
      expect(screen.queryByText(/Live — includes unsaved measure edits/)).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('strata-model-measures-edit-m1')).toBeInTheDocument();
  });
});

/** Evidence-gap closure (20-min pass): gaps 4 + 5. */
describe('gap 4 — incomplete CHANGES_REQUESTED saves and stays editable; resubmit stays blocked', () => {
  it('Save is enabled at 50/100 in changes_requested, RPC fires, and the resubmit gate states the totals reason', async () => {
    const user = userEvent.setup();
    H.state.models = [H.mkModel({ status: 'changes_requested', review_comment: 'fix totals', assigned_approver_id: null })];
    H.state.measures = [measure('ms1', 'p1', 'k1', 50), measure('ms2', 'p2', 'k2', 100)];
    render(<ScorecardModelsSection onError={() => {}} />);
    // Editable in changes_requested: the editor opens.
    await user.click(screen.getByTestId('strata-model-measures-edit-m1'));
    const save = screen.getByTestId('strata-model-measures-save-m1');
    expect(save).not.toBeDisabled();
    await user.click(save);
    await waitFor(() => expect(rpc.setModelMeasures).toHaveBeenCalledTimes(1));
    // Resubmission stays blocked on the persisted underweight total.
    expect(screen.getByText(/Each perspective needs measure weights totalling 100 before submit/)).toBeInTheDocument();
  });
});

describe('gap 5 — a failed save preserves dirty values and never presents them as persisted', () => {
  it('rejection keeps the editor open with the typed value, the verbatim error, and the unsaved label', async () => {
    const user = userEvent.setup();
    rpc.setModelMeasures.mockRejectedValueOnce(new Error('deliberate refusal — network down'));
    H.state.measures = [measure('ms1', 'p1', 'k1', 100), measure('ms2', 'p2', 'k2', 100)];
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(screen.getByTestId('strata-model-measures-edit-m1'));
    const field = screen.getByTestId('strata-measure-weight-k1');
    await user.clear(field);
    await user.type(field, '50');
    await user.click(screen.getByTestId('strata-model-measures-save-m1'));
    // Error surfaced verbatim; editor still open; typed value retained; still marked unsaved.
    expect(await screen.findByText(/deliberate refusal — network down/)).toBeInTheDocument();
    expect((screen.getByTestId('strata-measure-weight-k1') as HTMLInputElement).value).toBe('50');
    expect(screen.getByText(/Live — includes unsaved measure edits/)).toBeInTheDocument();
    expect(screen.getByText(/Unsaved measure edits — save or cancel the measures editor before submitting/)).toBeInTheDocument();
  });
});
