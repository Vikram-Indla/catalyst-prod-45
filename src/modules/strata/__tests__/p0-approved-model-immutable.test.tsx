/**
 * P0-A — D-1: the approved scorecard-model aggregate is immutable.
 *
 * The real boundary is the database (RLS on strata_scorecard_model_perspectives /
 * strata_scorecard_model_measures joins the parent and requires status='draft'; the
 * strata_set_model_measures RPC re-checks it because SECURITY DEFINER bypasses RLS). Those are
 * proven by DB probe — see 06_VALIDATION_EVIDENCE.md. **The UI is not the security boundary.**
 *
 * What this file pins is the UI's obligation NOT to offer an authoring control it knows the server
 * will refuse, and to say why. It also guards the specific regression that P0-A found: the AC-6
 * fixture was 'approved', so the keyboard test was passing over the defect. If someone re-opens
 * the authoring path on an approved model, this fails.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const H = vi.hoisted(() => {
  const base = {
    owner_scope_type: 'enterprise', rollup_method: 'weighted_average', period_granularity: 'quarter',
    version: 1, effective_to: null, approved_by: null, change_reason: null, supersedes_id: null,
    created_by: null, created_at: '2026-07-05', updated_at: '2026-07-05',
  };
  return {
    setModelPerspectiveWeights: vi.fn(async () => undefined),
    setModelMeasures: vi.fn(async () => undefined),
    createModelDraftVersion: vi.fn(async () => 'm3'),
    invalidate: vi.fn(),
    // Mirrors staging: CEO Enterprise Scorecard is approved with 5 perspectives.
    APPROVED: {
      ...base, id: 'm1', name: 'CEO Enterprise Scorecard', status: 'approved',
      effective_from: '2026-07-05', approved_at: '2026-07-04',
    },
    DRAFT: {
      ...base, id: 'm2', name: 'Draft Scorecard', status: 'draft',
      effective_from: null, approved_at: null,
    },
    PERSPECTIVES: [{ id: 'p1', name: 'Financial' }],
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});

const MP = [
  { id: 'mp1', model_id: 'm1', perspective_id: 'p1', weight: 100, order_index: 0 },
  { id: 'mp2', model_id: 'm2', perspective_id: 'p1', weight: 100, order_index: 0 },
];

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useScorecardModels: () => H.ok([H.APPROVED, H.DRAFT]),
  useAllModelPerspectives: () => H.ok(MP),
  useAllModelMeasures: () => H.ok([]),
  useKpis: () => H.ok([]),
  useModelPerspectives: (id: string) => H.ok(MP.filter((r) => r.model_id === id)),
  usePerspectives: () => H.ok(H.PERSPECTIVES),
  useStrataRoles: () => H.ok(['strategy_office', 'strata_admin']),
  useInvalidateStrata: () => H.invalidate,
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
    setModelPerspectiveWeights: H.setModelPerspectiveWeights,
    submitRecord: vi.fn(async () => undefined),
    approveRecord: vi.fn(async () => undefined),
    approveScorecardModel: vi.fn(async () => undefined),
    retireRecord: vi.fn(async () => undefined),
    createModelDraftVersion: H.createModelDraftVersion,
    createThresholdDraftVersion: vi.fn(async () => 't2'),
  },
  scorecardApi: { setModelMeasures: H.setModelMeasures },
  governanceApi: {},
}));

import { ScorecardModelsSection } from '@/modules/strata/pages/StrataAdminConfigPage';

const q = (testId: string) => document.querySelector(`[data-testid="${testId}"]`);

describe('P0-A — approved scorecard-model aggregate is immutable in the UI', () => {
  it('offers NO weight-authoring control on an approved model, even to strategy_office', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(q('strata-model-weights-edit-m1')).toBeNull();
  });

  it('still offers it on a DRAFT model — the gate is governance state, not the role', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    // Positive control: strategy_office is unchanged, so a null here would mean the gate is
    // simply broken rather than status-aware.
    expect(q('strata-model-weights-edit-m2')).not.toBeNull();
  });

  it('states WHY the approved model cannot be edited — never a silently missing control', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    const note = q('strata-model-immutable-note');
    expect(note).not.toBeNull();
    expect(note?.textContent).toMatch(/immutable/i);
  });

  it('shows no immutability note on the draft model', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(screen.getAllByTestId('strata-model-immutable-note')).toHaveLength(1);
  });
});

/**
 * A3a (D-2/D-3) — the approved model is not a dead end: immutability is paired with a governed
 * revision path. The clone itself (version+1, supersedes_id, children copied, predecessor
 * byte-identical) is a DB concern and is proven by probe in 06_VALIDATION_EVIDENCE.md.
 */
describe('A3a — governed revision replaces in-place edits of an approved model', () => {
  beforeEach(() => { H.createModelDraftVersion.mockClear(); });

  it('offers "Create new version" on the approved model', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(q('strata-model-new-version-m1')).not.toBeNull();
  });

  it('does NOT offer it on the draft model — a draft is edited directly, not revised', () => {
    render(<ScorecardModelsSection onError={() => {}} />);
    expect(q('strata-model-new-version-m2')).toBeNull();
  });

  it('will not create a version without a reason, and does not call the RPC', async () => {
    const user = userEvent.setup();
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(q('strata-model-new-version-m1') as HTMLElement);

    const commit = await screen.findByRole('button', { name: /Create draft version/i });
    expect(commit).toBeDisabled();
    await user.click(commit);
    expect(H.createModelDraftVersion).not.toHaveBeenCalled();
  });

  it('passes the typed reason to the RPC, trimmed', async () => {
    const user = userEvent.setup();
    render(<ScorecardModelsSection onError={() => {}} />);
    await user.click(q('strata-model-new-version-m1') as HTMLElement);

    await user.type(
      await screen.findByLabelText(/Reason for the new version/i),
      '  rebalance financial weights  ',
    );
    await user.click(screen.getByRole('button', { name: /Create draft version/i }));

    await waitFor(() => expect(H.createModelDraftVersion).toHaveBeenCalledTimes(1));
    expect(H.createModelDraftVersion).toHaveBeenCalledWith('m1', 'rebalance financial weights');
  });
});
