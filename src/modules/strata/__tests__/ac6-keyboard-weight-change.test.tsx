/**
 * §20 ACCEPTANCE — AC-6: "keyboard-only completion of … weight-change".
 *
 * This test exists because the criterion could NOT be verified through the
 * browser tooling: that harness could not deliver a single keystroke to the
 * page (a real `type` on a focused input left it unchanged; Tab never moved
 * focus off BODY). That was a tooling limit, so AC-6 was honestly recorded as
 * NOT VERIFIED rather than passed — see 06_VALIDATION_EVIDENCE.md.
 *
 * `userEvent.tab()` implements real sequential focus navigation, so the verb
 * can be driven end-to-end with NO mouse events at all: reach the control by
 * Tab, activate with Enter/Space, type the value, reach Save, commit — and
 * assert the write actually fired with the typed value.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

// vi.mock factories are hoisted above module scope, so everything they touch
// must be created inside vi.hoisted().
const H = vi.hoisted(() => {
  // status is 'draft' DELIBERATELY. This fixture was 'approved' until P0-A, which means the test
  // asserted that an APPROVED model's weights are keyboard-editable — i.e. it was passing because
  // of the P0 defect (D-1: the approved aggregate is immutable), and it made §20 AC-6 read 7/7
  // over that defect. AC-6's criterion is "keyboard-only completion of the weight-change verb",
  // and that verb is legitimate on a draft. The verb is unchanged; only the fixture's governance
  // state is corrected. The immutability rule itself is pinned by p0-approved-model-immutable.test.tsx.
  const MODEL = {
    id: 'm1', name: 'CEO Enterprise Scorecard',
    owner_scope_type: 'enterprise', rollup_method: 'weighted_average', period_granularity: 'quarter',
    version: 1, status: 'draft', effective_from: null, effective_to: null,
    approved_by: null, approved_at: null, change_reason: null, supersedes_id: null,
    created_by: null, created_at: '2026-07-05', updated_at: '2026-07-05',
  };
  return {
    setModelPerspectiveWeights: vi.fn(async () => undefined),
    setModelMeasures: vi.fn(async () => undefined),
    invalidate: vi.fn(),
    MODEL,
    PERSPECTIVES: [
      { id: 'p1', name: 'Financial' },
      { id: 'p2', name: 'Customer & Market' },
      { id: 'p3', name: 'Digital & Innovation' },
    ],
    MODEL_PERSPECTIVES: [
      { id: 'mp1', model_id: 'm1', perspective_id: 'p1', weight: 40, order_index: 0 },
      { id: 'mp2', model_id: 'm1', perspective_id: 'p2', weight: 35, order_index: 1 },
      { id: 'mp3', model_id: 'm1', perspective_id: 'p3', weight: 25, order_index: 2 },
    ],
    ok: (data: unknown) => ({ data, isLoading: false, isError: false, error: null }),
  };
});
const { setModelPerspectiveWeights, invalidate } = H;

vi.mock('@/modules/strata/hooks/useStrata', () => ({
  useScorecardModels: () => H.ok([H.MODEL]),
  useAllModelPerspectives: () => H.ok(H.MODEL_PERSPECTIVES),
  useAllModelMeasures: () => H.ok([]),
  useKpis: () => H.ok([]),
  useModelPerspectives: () => H.ok(H.MODEL_PERSPECTIVES),
  usePerspectives: () => H.ok(H.PERSPECTIVES),
  // strategy_office is the role the weights editor gates on (matches RLS).
  useStrataRoles: () => H.ok(['strategy_office', 'strata_admin']),
  // SC-GOVAPPROVAL: identity hook used by ScorecardLifecycleActions (submit/decide affordances).
  useStrataUserId: () => H.ok('test-user-id'),
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
  },
  // The measures builder writes through scorecardApi, not configApi.
  scorecardApi: { setModelMeasures: H.setModelMeasures },
  governanceApi: {},
}));

import { ScorecardModelsSection } from '@/modules/strata/pages/StrataAdminConfigPage';

/** Press Tab until `testId` is focused. Proves the control is keyboard-REACHABLE. */
async function tabUntilFocused(
  user: ReturnType<typeof userEvent.setup>,
  testId: string,
  max = 40,
): Promise<number> {
  for (let i = 1; i <= max; i++) {
    await user.tab();
    const el = document.querySelector(`[data-testid="${testId}"]`);
    if (el && document.activeElement === el) return i;
  }
  const active = document.activeElement as HTMLElement | null;
  const t = document.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null;
  throw new Error(
    `[${testId}] never received focus after ${max} Tab presses — NOT keyboard-reachable.\n`
    + `  target exists=${!!t} tag=${t?.tagName} disabled=${t?.disabled} tabIndex=${t?.tabIndex}\n`
    + `  focus rested on <${active?.tagName}> "${(active?.getAttribute('aria-label') || active?.textContent || '').trim().slice(0, 40)}"\n`
    + `  inputs=${[...document.querySelectorAll('input[type=number]')].map((i) => (i as HTMLInputElement).value).join(',')}\n`
    + `  component's own running total => "${(document.body.textContent || '').match(/Total\s*\d+%/)?.[0]}"`,
  );
}

const EDIT = 'strata-model-weights-edit-m1';
const SAVE = 'strata-model-weights-save-m1';
const INPUT_FINANCIAL = 'strata-model-weight-input-p1';
const INPUT_CUSTOMER = 'strata-model-weight-input-p2';
const el = (testId: string) => document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;

describe('§20 AC-6 — keyboard-only weight-change', () => {
  beforeEach(() => {
    setModelPerspectiveWeights.mockClear();
    invalidate.mockClear();
  });

  it('completes the whole verb with NO mouse: Tab to Edit weights → Enter → type → Tab to Save → Enter → write fires', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ScorecardModelsSection onError={() => {}} /></MemoryRouter>);

    // 1. reach "Edit weights" by Tab alone
    expect(await tabUntilFocused(user, EDIT)).toBeGreaterThan(0);

    // 2. activate with the keyboard (Enter), not a click
    await user.keyboard('{Enter}');
    await waitFor(() => expect(el(INPUT_FINANCIAL)).toBeInTheDocument());

    // 3. both weight inputs are reachable by Tab and typable. Seed is
    //    40/35/25; rebalance to 30/45/25 so the model still totals exactly 100
    //    (the integrity rule blocks Save otherwise — proven by the next test).
    await tabUntilFocused(user, INPUT_FINANCIAL);
    await user.keyboard('{Control>}a{/Control}30');
    expect((el(INPUT_FINANCIAL) as HTMLInputElement).value).toBe('30');

    await tabUntilFocused(user, INPUT_CUSTOMER);
    await user.keyboard('{Control>}a{/Control}45');
    expect((el(INPUT_CUSTOMER) as HTMLInputElement).value).toBe('45');

    // integrity now satisfied (30 + 45 + 25 = 100) → Save becomes committable
    expect(el(SAVE)).not.toBeDisabled();

    // 4. reach Save weights by Tab and commit with Enter
    await tabUntilFocused(user, SAVE);
    await user.keyboard('{Enter}');

    // 5. the governed write actually fired, with the KEYBOARD-typed values
    await waitFor(() => expect(setModelPerspectiveWeights).toHaveBeenCalledTimes(1));
    expect(setModelPerspectiveWeights).toHaveBeenCalledWith('m1', [
      { perspectiveId: 'p1', weight: 30 },
      { perspectiveId: 'p2', weight: 45 },
      { perspectiveId: 'p3', weight: 25 },
    ]);
  });

  it('honours the blocking integrity rule from the keyboard too — Save is not committable at != 100', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ScorecardModelsSection onError={() => {}} /></MemoryRouter>);

    await tabUntilFocused(user, EDIT);
    await user.keyboard('{Enter}');
    await waitFor(() => expect(el(INPUT_FINANCIAL)).toBeInTheDocument());

    await tabUntilFocused(user, INPUT_FINANCIAL);
    await user.keyboard('{Control>}a{/Control}10'); // 10 + 35 + 25 = 70 → invalid

    expect(el(SAVE)).toBeDisabled();
    // the reason is VISIBLE, never a silent disable (anchor 05 states rule).
    // getAllBy — StatusLozenge renders its label more than once.
    expect(screen.getAllByText(/Weights must total 100/i).length).toBeGreaterThan(0);

    // Enter on a disabled control cannot commit.
    await user.keyboard('{Enter}');
    expect(setModelPerspectiveWeights).not.toHaveBeenCalled();
  });
});
