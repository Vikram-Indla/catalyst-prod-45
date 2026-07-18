/**
 * SC-GOVAPPROVAL — lifecycle UI: the right verbs for the right identity per state
 * (CAT-STRATA-SC-GOVAPPROVAL-20260718-001).
 *
 * The DB is the authority (see scgov-approval-migration.guard.test.ts); this
 * suite proves the UI exposes the correct actions per role/state and always
 * identifies the assignee:
 *   - the SUBMITTER sees Withdraw and NEVER a usable Approve;
 *   - the ASSIGNED APPROVER sees Approve / Request changes / Reject;
 *   - everyone else gets explanatory read-only messaging;
 *   - CHANGES_REQUESTED shows the reviewer comment, keeps the SAME version
 *     number, and re-enables editing + Resubmit;
 *   - REJECTED is terminal messaging with no submit affordance;
 *   - a legacy pending version without an assignee is flagged and offers
 *     Assign approver to a strata_admin only.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    id: 'm1', name: 'B2B Sector Scorecard', owner_scope_type: 'sector',
    rollup_method: 'weighted_average', period_granularity: 'quarter',
    version: 2, status: 'draft', effective_from: null, effective_to: null,
    approved_by: null, approved_at: null, change_reason: 'governed revision',
    supersedes_id: null, created_by: 'author-1', created_at: 'x', updated_at: 'x',
    submission_attempt: 0, submitted_by: null, submitted_at: null,
    assigned_approver_id: null, assignment_source: null,
    review_comment: null, rejected_by: null, rejected_at: null,
    ...over,
  });
  const names = new Map([
    ['author-1', { name: 'Vikram Indla', email: 'v@x', avatarUrl: null }],
    ['approver-1', { name: 'Jahanara Khan', email: 'j@x', avatarUrl: null }],
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
    { id: 'p1', name: 'Financial' }, { id: 'p2', name: 'Customer' },
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
  validateScorecardModel: vi.fn(async () => ({ blockers: [], warnings: [], passed: ['Perspective weights total 100'] })),
  scorecardApproverCandidates: vi.fn(async () => ([
    { user_id: 'approver-1', display_name: 'Jahanara Khan', email: 'j@x', roles: ['strategy_office'] },
  ])),
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
  scorecardApi: { setModelMeasures: vi.fn(async () => undefined) },
  governanceApi: {},
  valueApi: { entityAudit: vi.fn(async () => []) },
}));

import { ScorecardModelsSection } from '@/modules/strata/pages/StrataAdminConfigPage';

/** Weights pass (60/40) and both perspectives have full measure coverage. */
const healthyAggregate = () => {
  H.state.modelPerspectives = [
    { id: 'mp1', model_id: 'm1', perspective_id: 'p1', weight: 60, order_index: 0 },
    { id: 'mp2', model_id: 'm1', perspective_id: 'p2', weight: 40, order_index: 1 },
  ];
  H.state.measures = [
    { id: 'ms1', model_id: 'm1', perspective_id: 'p1', kpi_id: 'k1', weight: 100, order_index: 0, required: false, aggregation_method: 'weighted_average', target_policy: 'default' },
    { id: 'ms2', model_id: 'm1', perspective_id: 'p2', kpi_id: 'k2', weight: 100, order_index: 0, required: false, aggregation_method: 'weighted_average', target_policy: 'default' },
  ];
};

const pendingModel = (over: Record<string, unknown> = {}) => H.mkModel({
  status: 'pending_approval', submission_attempt: 1,
  submitted_by: 'author-1', submitted_at: '2026-07-18T10:00:00Z',
  assigned_approver_id: 'approver-1', assignment_source: 'selected',
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  H.state.userId = 'author-1';
  H.state.roles = ['strategy_office'];
  H.state.models = [];
  healthyAggregate();
});

describe('PENDING — the submitter', () => {
  beforeEach(() => { H.state.models = [pendingModel()]; });

  it('sees Withdraw but NO approval/decision controls at all', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByTestId('strata-sc-withdraw-m1')).toBeInTheDocument();
    expect(screen.queryByTestId('strata-approve-m1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('strata-sc-request-changes-m1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('strata-sc-reject-m1')).not.toBeInTheDocument();
  });

  it('sees the honest pending copy: assignee named, version locked, recovery paths stated', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    const banner = screen.getByTestId('strata-sc-pending-banner-m1');
    expect(banner.textContent).toMatch(/Awaiting Jahanara Khan/);
    expect(banner.textContent).toMatch(/Version 2 is pending approval and cannot be edited/);
    expect(banner.textContent).toMatch(/Withdraw the submission or request changes to edit version 2/);
    expect(banner.textContent).toMatch(/submission attempt 1/);
  });

  it('names the active predecessor that keeps producing results', () => {
    H.state.models = [
      H.mkModel({ id: 'm0', version: 1, status: 'approved' }),
      pendingModel({ supersedes_id: 'm0' }),
    ];
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByTestId('strata-sc-pending-banner-m1').textContent)
      .toMatch(/Version 1 remains active and continues producing results/);
  });

  it('cannot edit weights or measures while pending', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.queryByTestId('strata-model-weights-edit-m1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('strata-model-measures-edit-m1')).not.toBeInTheDocument();
  });

  it('withdraw flows through the dedicated RPC with the typed reason', async () => {
    const user = userEvent.setup();
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(screen.getByTestId('strata-sc-withdraw-m1'));
    await user.type(screen.getByLabelText('Withdrawal reason'), 'need more time');
    await user.click(screen.getByTestId('strata-sc-withdraw-confirm-m1'));
    expect(rpc.withdrawScorecardModel).toHaveBeenCalledWith('m1', 'need more time');
  });
});

describe('PENDING — the assigned approver', () => {
  beforeEach(() => {
    H.state.userId = 'approver-1';
    H.state.models = [pendingModel()];
  });

  it('sees all three decision verbs and no Withdraw', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByTestId('strata-approve-m1')).toBeInTheDocument();
    expect(screen.getByTestId('strata-sc-request-changes-m1')).toBeInTheDocument();
    expect(screen.getByTestId('strata-sc-reject-m1')).toBeInTheDocument();
    expect(screen.queryByTestId('strata-sc-withdraw-m1')).not.toBeInTheDocument();
  });

  it('request changes requires a non-empty comment before confirm enables', async () => {
    const user = userEvent.setup();
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(screen.getByTestId('strata-sc-request-changes-m1'));
    expect(screen.getByTestId('strata-sc-request-changes-confirm-m1')).toBeDisabled();
    await user.type(screen.getByLabelText('What needs to change (required)'), 'add measures');
    expect(screen.getByTestId('strata-sc-request-changes-confirm-m1')).not.toBeDisabled();
    await user.click(screen.getByTestId('strata-sc-request-changes-confirm-m1'));
    expect(rpc.requestScorecardChanges).toHaveBeenCalledWith('m1', 'add measures');
  });

  it('reject requires a non-empty reason and states terminality', async () => {
    const user = userEvent.setup();
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(screen.getByTestId('strata-sc-reject-m1'));
    expect(screen.getByTestId('strata-sc-reject-confirm-m1')).toBeDisabled();
    expect(screen.getByText(/Rejection is final for this version/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Rejection reason (required)'), 'wrong scope');
    await user.click(screen.getByTestId('strata-sc-reject-confirm-m1'));
    expect(rpc.rejectScorecardModel).toHaveBeenCalledWith('m1', 'wrong scope');
  });

  it('approve confirmation summarizes activation, reruns server validation, and passes the concurrency token', async () => {
    const user = userEvent.setup();
    H.state.models = [
      H.mkModel({ id: 'm0', version: 1, status: 'approved' }),
      pendingModel({ supersedes_id: 'm0', updated_at: 'TS-1' }),
    ];
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(screen.getByTestId('strata-approve-m1'));
    expect(rpc.validateScorecardModel).toHaveBeenCalledWith('m1');
    expect(await screen.findByText(/supersedes the currently active version in the same transaction/)).toBeInTheDocument();
    await user.click(await screen.findByTestId('strata-sc-approve-confirm-m1'));
    expect(rpc.approveScorecardModel).toHaveBeenCalledWith('m1', undefined, 'TS-1');
  });
});

describe('PENDING — everyone else', () => {
  it('an unrelated strategy_office user gets read-only messaging and zero verbs', () => {
    H.state.userId = 'someone-else';
    H.state.models = [pendingModel()];
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByTestId('strata-sc-readonly-m1').textContent)
      .toMatch(/only the assigned approver can decide/);
    expect(screen.queryByTestId('strata-approve-m1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('strata-sc-withdraw-m1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('strata-sc-assign-m1')).not.toBeInTheDocument();
  });

  it('a legacy pending version with NO assignee is flagged; strata_admin gets Assign approver', () => {
    H.state.userId = 'admin-1';
    H.state.roles = ['strata_admin'];
    H.state.models = [pendingModel({ assigned_approver_id: null, assignment_source: null, submitted_by: null, submission_attempt: 0 })];
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByTestId('strata-sc-pending-banner-m1').textContent)
      .toMatch(/A STRATA admin must assign an approver/);
    expect(screen.getByTestId('strata-sc-assign-m1')).toBeInTheDocument();
    expect(screen.queryByTestId('strata-approve-m1')).not.toBeInTheDocument();
  });
});

describe('CHANGES_REQUESTED — same version, editable, comment shown', () => {
  beforeEach(() => {
    H.state.models = [H.mkModel({
      status: 'changes_requested', submission_attempt: 1,
      submitted_by: 'author-1', submitted_at: '2026-07-18T10:00:00Z',
      assigned_approver_id: 'approver-1',
      review_comment: 'Assign measures to Customer before resubmitting.',
    })];
  });

  it('shows the reviewer comment prominently with the reviewer named', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    const banner = screen.getByTestId('strata-sc-changes-banner-m1');
    expect(banner.textContent).toMatch(/Changes requested by Jahanara Khan/);
    expect(banner.textContent).toMatch(/Assign measures to Customer before resubmitting\./);
    expect(banner.textContent).toMatch(/Resubmission keeps the same version number/);
  });

  it('re-enables editing and offers Resubmit (not Submit)', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByTestId('strata-model-weights-edit-m1')).toBeInTheDocument();
    expect(screen.getByTestId('strata-model-measures-edit-m1')).toBeInTheDocument();
    expect(screen.getByTestId('strata-model-submit-m1').textContent).toMatch(/Resubmit for approval/);
  });

  it('resubmit dialog resolves the approver chooser, shows the checklist, and submits with the token', async () => {
    const user = userEvent.setup();
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(screen.getByTestId('strata-model-submit-m1'));
    expect(rpc.scorecardApproverCandidates).toHaveBeenCalledWith('m1');
    expect(rpc.validateScorecardModel).toHaveBeenCalledWith('m1');
    // Confirm stays disabled until an approver is resolved.
    expect(await screen.findByTestId('strata-sc-submit-confirm-m1')).toBeDisabled();
    expect(await screen.findByTestId('strata-sc-validation-m1')).toBeInTheDocument();
  });
});

describe('REJECTED — terminal', () => {
  it('shows the rejection reason and offers no submit/edit affordances', () => {
    H.state.models = [H.mkModel({
      status: 'rejected', submission_attempt: 1,
      submitted_by: 'author-1', rejected_by: 'approver-1', rejected_at: '2026-07-18T11:00:00Z',
      review_comment: 'Wrong scope for the enterprise scorecard.',
    })];
    render(<ScorecardModelsSection onError={() => {}} />);
    const banner = screen.getByTestId('strata-sc-rejected-banner-m1');
    expect(banner.textContent).toMatch(/Rejected by Jahanara Khan/);
    expect(banner.textContent).toMatch(/Wrong scope for the enterprise scorecard\./);
    expect(banner.textContent).toMatch(/final/);
    expect(screen.queryByTestId('strata-model-submit-m1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('strata-model-weights-edit-m1')).not.toBeInTheDocument();
  });
});

describe('DRAFT — submit gate', () => {
  it('a draft failing integrity blocks Submit with the visible reason (client mirror of the server gate)', () => {
    H.state.models = [H.mkModel()];
    H.state.measures = []; // both perspectives empty → integrity fails
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getByTestId('strata-model-submit-m1')).toBeDisabled();
    expect(screen.getByText(/Each perspective needs measure weights totalling 100 before submit/)).toBeInTheDocument();
  });

  it('a healthy draft submits through the dialog: approver required, then the RPC gets approver + note + token', async () => {
    const user = userEvent.setup();
    H.state.models = [H.mkModel({ updated_at: 'TS-9' })];
    render(<ScorecardModelsSection onError={() => {}} />);
    const submit = screen.getByTestId('strata-model-submit-m1');
    expect(submit).not.toBeDisabled();
    await user.click(submit);
    const confirm = await screen.findByTestId('strata-sc-submit-confirm-m1');
    expect(confirm).toBeDisabled(); // no approver resolved yet
    // choose the approver via the accessible combobox
    const combo = await screen.findByLabelText('Approver');
    await user.click(combo);
    await user.click(await screen.findByRole('option', { name: /Jahanara Khan/ }));
    expect(screen.getByTestId('strata-sc-resolved-approver-m1').textContent)
      .toMatch(/Approval will be assigned to Jahanara Khan/);
    expect(confirm).not.toBeDisabled();
    await user.click(confirm);
    expect(rpc.submitScorecardModel).toHaveBeenCalledWith('m1', 'approver-1', undefined, 'TS-9');
  });
});
