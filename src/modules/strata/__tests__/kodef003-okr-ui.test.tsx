/**
 * KO-DEF-003 UI — CAT-STRATA-KODEF-20260717-001.
 *
 * Drives the real OkrRow / KrReportabilityBadge / OkrOfficialProgress against mocked server
 * hooks (the SQL is covered by kodef003-okr-lifecycle.guard.test.ts). Proves the reproduction is
 * visibly Non-reportable, standalone KRs are labelled, official progress excludes non-reportable
 * KRs and says why, lifecycle actions are reachable, and closed OKRs render frozen.
 *
 * The client never recomputes eligibility — it renders exactly what the hooks return.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });
const { activateOkr, closeOkr, updateOkr, linkOkrReview, krReportability, okrProgress, keyResults } = vi.hoisted(() => ({
  activateOkr: vi.fn(), closeOkr: vi.fn(), updateOkr: vi.fn(), linkOkrReview: vi.fn(),
  krReportability: vi.fn(), okrProgress: vi.fn(), keyResults: vi.fn(),
}));

vi.mock('@/modules/strata/domain', async (orig) => {
  const actual = await orig<typeof import('@/modules/strata/domain')>();
  return { ...actual, kpiApi: { ...actual.kpiApi, activateOkr, closeOkr, updateOkr, linkOkrReview,
    keyResults: (okrId: string) => keyResults(okrId) } };
});
vi.mock('@/modules/strata/hooks/useStrata', async (orig) => ({
  ...(await orig<typeof import('@/modules/strata/hooks/useStrata')>()),
  useKrReportability: (id: string) => q(krReportability(id)),
  useOkrOfficialProgress: () => q(okrProgress()),
  useInvalidateStrata: () => vi.fn(),
  useStrataContext: () => ({ cycles: [], periods: [], activeCycle: null, activePeriod: null }),
  useStrategyElements: () => q([]),
  useProfileNames: () => q(new Map()),
  useReviews: () => q([]),
}));

import { OkrRow } from '@/modules/strata/components/shared';

const OKR = (over: Record<string, unknown> = {}) => ({
  id: 'okr-1', name: 'J OKR Full Pass 20260717-1707', status: 'active', confidence: null,
  objective_element_id: null, final_status: null, closure_reason: null, ...over,
});
const PENDING_KR = { id: 'kr-pending', name: 'J OKR Pending KPI KR 20260717-1707', kpi_id: 'kpi-1', unit: '%', baseline: 0, target: 100, current_value: 80, direction: 'higher_better', status: 'on_track' };
const STANDALONE_KR = { id: 'kr-std', name: 'Standalone KR', kpi_id: null, unit: '%', baseline: 0, target: 100, current_value: 50, direction: 'higher_better', status: 'on_track' };

const REP_NON = { reportable: false, kind: 'kpi_backed', label: 'Non-reportable', qualified: false, kpi_id: 'kpi-1', kpi_name: 'J KPI Full Pass 20260717-1707', kpi_state: 'pending_approval', reason: 'linked KPI is pending_approval, not approved — authoring only' };
const REP_STD = { reportable: true, kind: 'standalone', label: 'Standalone measurement', qualified: false };

vi.setConfig({ testTimeout: 20_000 });
const renderRow = (okr: ReturnType<typeof OKR>) =>
  render(<OkrRow okr={okr as never} objectiveName={null} isOpen onToggle={() => {}} onLifecycle />);

beforeEach(() => {
  activateOkr.mockReset().mockResolvedValue(undefined);
  closeOkr.mockReset().mockResolvedValue(undefined);
  keyResults.mockReset().mockReturnValue([PENDING_KR, STANDALONE_KR]);
  krReportability.mockReset().mockImplementation((id: string) => (id === 'kr-std' ? REP_STD : REP_NON));
  okrProgress.mockReset().mockReturnValue({ okr_id: 'okr-1', reportable_krs: 1, excluded_krs: 1, official_progress: 0.5 });
});

describe('KO-DEF-003 UI — reproduction visibly Non-reportable', () => {
  it('shows Non-reportable + the pending KPI name and state on the Pending-KPI KR', async () => {
    renderRow(OKR());
    const badge = await screen.findByTestId('strata-kr-reportability-kr-pending');
    expect(within(badge).getByText('Non-reportable')).toBeTruthy();
    expect(within(badge).getByText(/J KPI Full Pass 20260717-1707/)).toBeTruthy();
    expect(within(badge).getByText(/Pending approval/i)).toBeTruthy();
  });

  it('labels the standalone KR Standalone measurement', async () => {
    renderRow(OKR());
    const badge = await screen.findByTestId('strata-kr-reportability-kr-std');
    expect(within(badge).getByText('Standalone measurement')).toBeTruthy();
  });

  it('official progress excludes the non-reportable KR and says why', () => {
    renderRow(OKR());
    const p = screen.getByTestId('strata-okr-official-progress-okr-1');
    expect(within(p).getByText(/50%/)).toBeTruthy();
    expect(within(p).getByText(/1 reportable KR/)).toBeTruthy();
    expect(within(p).getByText(/1 non-reportable KR.*excluded/)).toBeTruthy();
  });
});

describe('KO-DEF-003 UI — lifecycle actions', () => {
  it('a Draft OKR offers Activate', () => {
    renderRow(OKR({ status: 'draft' }));
    expect(screen.getByTestId('strata-okr-activate-okr-1')).toBeTruthy();
  });

  it('an Active OKR offers Close and requires a reason', async () => {
    const u = userEvent.setup({ delay: null });
    renderRow(OKR({ status: 'active' }));
    await u.click(screen.getByTestId('strata-okr-close-okr-1'));
    // confirm disabled until a reason is entered
    expect(screen.getByTestId('strata-okr-close-confirm-okr-1')).toBeDisabled();
    await u.type(screen.getByTestId('strata-okr-close-reason-okr-1'), 'quarter ended');
    await waitFor(() => expect(screen.getByTestId('strata-okr-close-confirm-okr-1')).not.toBeDisabled());
    await u.click(screen.getByTestId('strata-okr-close-confirm-okr-1'));
    await waitFor(() => expect(closeOkr).toHaveBeenCalledWith('okr-1', 'achieved', 'quarter ended'));
  });

  it('surfaces a server rejection verbatim on activate', async () => {
    activateOkr.mockRejectedValueOnce(new Error('cannot activate — missing: accountable owner'));
    const u = userEvent.setup({ delay: null });
    renderRow(OKR({ status: 'draft' }));
    await u.click(screen.getByTestId('strata-okr-activate-okr-1'));
    await waitFor(() => expect(screen.getByText(/cannot activate — missing: accountable owner/)).toBeTruthy());
  });

  it('a Closed OKR renders frozen final status and no lifecycle buttons', () => {
    renderRow(OKR({ status: 'closed', final_status: 'partially_achieved', closure_reason: 'quarter ended' }));
    const frozen = screen.getByTestId('strata-okr-closed-okr-1');
    expect(within(frozen).getByText(/Partially achieved/i)).toBeTruthy();
    expect(screen.queryByTestId('strata-okr-activate-okr-1')).toBeNull();
    expect(screen.queryByTestId('strata-okr-close-okr-1')).toBeNull();
    expect(screen.queryByTestId('strata-okr-edit-okr-1')).toBeNull();
    expect(screen.queryByTestId('strata-okr-review-okr-1')).toBeNull();
  });
});

describe('KO-DEF-003 UI — Edit Draft + Review link', () => {
  it('a Draft OKR exposes Edit; Active and Closed do not', () => {
    renderRow(OKR({ status: 'draft' }));
    expect(screen.getByTestId('strata-okr-edit-okr-1')).toBeTruthy();
  });

  it('Active/Closed OKRs cannot be edited', () => {
    renderRow(OKR({ status: 'active' }));
    expect(screen.queryByTestId('strata-okr-edit-okr-1')).toBeNull();
  });

  it('Edit persists owner, objective and start/end periods via updateOkr', async () => {
    updateOkr.mockResolvedValue(undefined);
    const u = userEvent.setup({ delay: null });
    renderRow(OKR({ status: 'draft' }));
    await u.click(screen.getByTestId('strata-okr-edit-okr-1'));
    expect(screen.getByTestId('strata-okr-edit-form-okr-1')).toBeTruthy();
    await u.click(screen.getByTestId('strata-okr-edit-save-okr-1'));
    await waitFor(() => expect(updateOkr).toHaveBeenCalledWith('okr-1', expect.any(Object)));
  });

  it('an Active OKR exposes the Review-link action', () => {
    renderRow(OKR({ status: 'active' }));
    expect(screen.getByTestId('strata-okr-review-okr-1')).toBeTruthy();
  });

  it('surfaces a server rejection verbatim on edit save', async () => {
    updateOkr.mockRejectedValueOnce(new Error('end period cannot precede start period'));
    const u = userEvent.setup({ delay: null });
    renderRow(OKR({ status: 'draft' }));
    await u.click(screen.getByTestId('strata-okr-edit-okr-1'));
    await u.click(screen.getByTestId('strata-okr-edit-save-okr-1'));
    await waitFor(() => expect(screen.getByText(/end period cannot precede start period/)).toBeTruthy());
  });
});
