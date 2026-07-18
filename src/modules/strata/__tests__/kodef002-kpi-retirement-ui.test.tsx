/**
 * KO-DEF-002 retirement UI — CAT-STRATA-KODEF-20260717-001.
 *
 * Drives the real StrataKpiDetailPage. The server gates are covered by
 * kodef002-kpi-retirement.guard.test.ts; here we prove the UI is reachable, shows the complete
 * impact, blocks confirmation until the state is governed, passes the right args, surfaces server
 * rejection verbatim, and never enables an action that would bypass the server.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const APPROVED_KPI = {
  id: 'kpi-v1', slug: 'revenue-assurance-rate', name: 'Revenue Assurance Rate',
  status: 'approved', direction: 'higher_better', unit: '%', frequency: 'quarterly',
  entry_method: 'manual', is_strategic: true, lineage_id: 'lin-1', version: 1,
  accountable_owner_id: 'u1', data_owner_id: 'u1', reporter_id: 'u1', validator_id: 'u2',
};
const REPLACEMENT = { id: 'kpi-r', name: 'Digital Revenue Share', status: 'approved', version: 2, lineage_id: 'lin-9' };

const IMPACT_ACTIVE = {
  kpi_id: 'kpi-v1', lineage_id: 'lin-1', versions_in_lineage: 1,
  current: { element_links: 3, model_measures: 2, scorecard_lines: 2, key_results: 0, initiative_links: 1 },
  historical: { element_links: 0, model_measures: 0, scorecard_lines_locked: 1, key_results_closed: 0 },
  active_total: 8,
};
const IMPACT_SAFE = { ...IMPACT_ACTIVE,
  current: { element_links: 0, model_measures: 0, scorecard_lines: 0, key_results: 0, initiative_links: 0 },
  active_total: 0 };

const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });
const { retireKpi } = vi.hoisted(() => ({ retireKpi: vi.fn() }));

vi.mock('@/modules/strata/domain', async (orig) => {
  const actual = await orig<typeof import('@/modules/strata/domain')>();
  return { ...actual, configApi: { ...actual.configApi, retireKpi } };
});

vi.mock('@/modules/strata/hooks/useStrata', async (orig) => ({
  ...(await orig<typeof import('@/modules/strata/hooks/useStrata')>()),
  useKpiBySlug: () => q(globalThis.__kpi ?? APPROVED_KPI),
  useKpiDependencyImpact: () => q(globalThis.__impact ?? IMPACT_ACTIVE),
  useKpis: () => q([APPROVED_KPI, REPLACEMENT]),
  useKpiSubmissionBlockers: () => q([]),
  useKpiDetail: () => q({ targets: [], actuals: [], formulaVersions: [] }),
  useKpiAchievement: () => q(null),
  useKpiEvidenceChain: () => q([]),
  useKpiTypes: () => q([]),
  useDataSources: () => q([]),
  useElementKpis: () => q([]),
  useStrategyElements: () => q([]),
  useThresholdSchemes: () => q([]),
  useUploadRuns: () => q([]),
  useProfileNames: () => q(new Map()),
  useStrataRoles: () => q(['strategy_office']),
  useInvalidateStrata: () => vi.fn(),
  useBandResolver: () => () => null,
  useStrataContext: () => ({ cycles: [], periods: [], activeCycle: null, activePeriod: null }),
}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ slug: 'revenue-assurance-rate' }),
  useNavigate: () => vi.fn(),
}));

import StrataKpiDetailPage from '@/modules/strata/pages/StrataKpiDetailPage';

declare global { // eslint-disable-next-line no-var
  var __kpi: Record<string, unknown> | undefined; // eslint-disable-next-line no-var
  var __impact: typeof IMPACT_ACTIVE | undefined;
}

vi.setConfig({ testTimeout: 30_000 });
const renderPage = () => render(<MemoryRouter><StrataKpiDetailPage /></MemoryRouter>);
const openRetire = async (u: ReturnType<typeof userEvent.setup>) => u.click(screen.getByTestId('strata-kpi-retire'));
const confirm = () => screen.getByTestId('strata-retire-confirm');
const future = () => { const d = new Date(2099, 11, 31); return '2099-12-31'; };

beforeEach(() => {
  retireKpi.mockReset(); retireKpi.mockResolvedValue({});
  globalThis.__kpi = undefined; globalThis.__impact = undefined;
});

describe('KO-DEF-002 retirement UI', () => {
  it('offers Retire KPI on an Approved KPI', () => {
    renderPage();
    expect(screen.getByTestId('strata-kpi-retire')).toBeTruthy();
  });

  it('does NOT offer Retire on a draft', () => {
    globalThis.__kpi = { ...APPROVED_KPI, status: 'draft' };
    renderPage();
    expect(screen.queryByTestId('strata-kpi-retire')).toBeNull();
  });

  it('shows the complete current + historical dependency counts', async () => {
    const u = userEvent.setup({ delay: null });
    renderPage();
    await openRetire(u);
    const panel = screen.getByTestId('strata-kpi-dependency-impact');
    expect(within(panel).getByText(/ACTIVE DEPENDENCIES \(8\)/)).toBeTruthy();
    expect(within(panel).getByText('Strategy / objective links')).toBeTruthy();
    expect(within(panel).getByText('Scorecard model measures')).toBeTruthy();
    expect(within(panel).getByText('Key Results')).toBeTruthy();
    expect(within(panel).getByText('Project / initiative links')).toBeTruthy();
    expect(within(panel).getByText(/HISTORICAL/)).toBeTruthy();
  });

  it('blocks confirmation while active deps exist with no replacement or exception', async () => {
    const u = userEvent.setup({ delay: null });
    renderPage();
    await openRetire(u);
    await u.type(screen.getByTestId('strata-retire-reason'), 'Superseded');
    // even with reason + date, active deps + no replacement/exception = still blocked
    await u.type(screen.getByTestId('strata-retire-effective'), future());
    expect(confirm()).toBeDisabled();
  });

  it('enables confirmation on a safe (zero-dependency) KPI', async () => {
    globalThis.__impact = IMPACT_SAFE;
    const u = userEvent.setup({ delay: null });
    renderPage();
    await openRetire(u);
    await u.type(screen.getByTestId('strata-retire-reason'), 'Decommissioned');
    await u.type(screen.getByTestId('strata-retire-effective'), future());
    await waitFor(() => expect(confirm()).not.toBeDisabled());
  });

  it('records an authorized exception path and passes it to the RPC', async () => {
    const u = userEvent.setup({ delay: null });
    renderPage();
    await openRetire(u);
    await u.type(screen.getByTestId('strata-retire-reason'), 'Waiver');
    await u.type(screen.getByTestId('strata-retire-effective'), future());
    await u.click(screen.getByTestId('strata-retire-exception-toggle'));
    await u.type(screen.getByTestId('strata-retire-exception'), 'CFO waiver REF-4471');
    await waitFor(() => expect(confirm()).not.toBeDisabled());
    await u.click(confirm());
    await waitFor(() => expect(retireKpi).toHaveBeenCalledTimes(1));
    expect(retireKpi.mock.calls[0][0]).toMatchObject({
      kpiId: 'kpi-v1', reason: 'Waiver', effectiveTo: future(), exception: 'CFO waiver REF-4471',
    });
  });

  it('surfaces a server rejection verbatim and does not close', async () => {
    retireKpi.mockRejectedValueOnce(new Error('retirement blocked — 8 active dependency(ies) still reference this KPI'));
    globalThis.__impact = IMPACT_SAFE; // let the button enable, force the server to be the gate
    const u = userEvent.setup({ delay: null });
    renderPage();
    await openRetire(u);
    await u.type(screen.getByTestId('strata-retire-reason'), 'Try');
    await u.type(screen.getByTestId('strata-retire-effective'), future());
    await waitFor(() => expect(confirm()).not.toBeDisabled());
    await u.click(confirm());
    await waitFor(() => expect(screen.getByText(/retirement blocked — 8 active dependency/)).toBeTruthy());
    expect(screen.getByTestId('strata-kpi-retire-modal')).toBeTruthy(); // still open
  });
});
