/**
 * SR-DEF-004 (OKR count) + SR-DEF-003 (objective authoring) — CAT-STRATA-SRDEF-20260717-001.
 *
 * SR-DEF-004: the objective detail page showed "OKR Performance 2" while rendering ONE
 * OKR. The header summed `themeOkrs.length + linkedKpis.length` — two different entities.
 * Staging reproduced it exactly: the reported objective has okrs=1 and linked_kpis=1.
 *
 * SR-DEF-003: charter / governance / project-card panels were gated behind `isTheme`,
 * so an objective could not maintain a charter, record a decision, or link a card —
 * even though the schema and RPCs impose no element_type restriction.
 *
 * These render the REAL detail page against mocked data hooks, so the assertions run
 * through the actual gating and the actual count expression.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const OBJECTIVE = {
  id: 'obj-1', slug: 'revenue-assurance-objective', name: 'J Cycle 1 Revenue Assurance Objective',
  element_type: 'objective', context: 'theme', status: 'active', stage: 'active',
  cycle_id: 'cyc-1', parent_id: 'theme-1', perspective_id: null, order_index: 0,
};
const THEME = {
  id: 'theme-1', slug: 'strategy-theme', name: 'J Cycle 1 Strategy Theme',
  element_type: 'theme', context: 'theme', status: 'active', stage: 'active',
  cycle_id: 'cyc-1', parent_id: null, perspective_id: null, order_index: 0,
};
/** One OKR on the objective — matches the single record the defect says is rendered. */
const OKR = { id: 'okr-1', name: 'J Cycle 1 Revenue Assurance OKR', objective_element_id: 'obj-1', cycle_id: 'cyc-1', period_id: null, owner_id: null, status: 'active' };
/** One KPI linked to the SAME objective — the phantom "+1" behind the count of 2. */
const KPI = { id: 'kpi-1', name: 'Revenue Assurance Rate', slug: 'revenue-assurance-rate', status: 'approved', direction: 'higher_better', unit: '%' };
const ELEMENT_KPI_LINK = { element_id: 'obj-1', kpi_id: 'kpi-1', weight: 50 };
/** A non-archived card in the objective's parent Theme — eligible to link (rules 5–6). */
const CARD = {
  id: 'card-1', slug: 'delivery-card', name: 'Revenue Assurance Delivery', theme_id: 'theme-1',
  objective_element_id: null, stage: 'in_flight', calculated_health: 'on_track',
  lead_business_unit: 'Ops', pm_id: null, baseline_end: null, final_forecast_end: null, actual_progress: 40,
};

const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });

// Partial mock: the module also exports non-hook helpers the page uses (e.g. ctxToken),
// which must keep their real implementations.
vi.mock('@/modules/strata/hooks/useStrata', async (orig) => ({
  ...(await orig<typeof import('@/modules/strata/hooks/useStrata')>()),
  useStrategyElementBySlug: () => q(OBJECTIVE),
  useStrategyElements: () => q([THEME, OBJECTIVE]),
  useMapEdges: () => q([]),
  useThemeCharters: () => q([]),
  useElementKpis: () => q([ELEMENT_KPI_LINK]),
  useKpis: () => q([KPI]),
  usePerspectives: () => q([]),
  useGateModels: () => q([]),
  useOkrs: () => q([OKR]),
  useProjectCards: () => q([CARD]),
  useDecisions: () => q([]),
  useActions: () => q([]),
  useStrataRoles: () => q(['strategy_office']),
  useStrataAudit: () => q([]),
  useBenefitProjectCards: () => q([]),
  useBenefits: () => q([]),
  useProfileNames: () => q(new Map()),
  useInvalidateStrata: () => vi.fn(),
  useBandResolver: () => () => null,
  useStrataContext: () => ({ cycles: [{ id: 'cyc-1', name: 'FY26 C1', status: 'active' }], periods: [], activeCycle: { id: 'cyc-1', name: 'FY26 C1' }, activePeriod: null }),
  useKeyResults: () => q([]),
  useCalcValues: () => q([]),
}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ slug: 'revenue-assurance-objective' }),
  useNavigate: () => vi.fn(),
}));

import StrataStrategyElementDetailPage from '@/modules/strata/pages/StrataStrategyElementDetailPage';

const renderPage = () =>
  render(<MemoryRouter><StrataStrategyElementDetailPage /></MemoryRouter>);

/** The count badge sits in the panel header, immediately after the title span. */
const panelCount = (title: string) => {
  const header = screen.getByText(title).parentElement!;
  return within(header).getByText(/^\d+$/).textContent;
};

beforeEach(() => vi.clearAllMocks());

describe('SR-DEF-004 — OKR Performance count agrees with rendered records', () => {
  it('counts OKRs only, not OKRs + linked KPIs', () => {
    renderPage();
    // The exact defect: 1 OKR + 1 linked KPI previously rendered "2".
    expect(panelCount('OKR Performance')).toBe('1');
  });

  it('renders exactly the OKR records the counter claims', () => {
    renderPage();
    expect(screen.getByText('J Cycle 1 Revenue Assurance OKR')).toBeTruthy();
    // The linked KPI is still shown — under its own sub-heading, not as an OKR.
    expect(screen.getByText('Linked KPIs')).toBeTruthy();
    expect(screen.getAllByText('Revenue Assurance Rate').length).toBeGreaterThan(0);
  });
});

describe('SR-DEF-003 — objective can transact the governed chain', () => {
  it('exposes Charter authoring on an objective', () => {
    renderPage();
    // Both the header action and the Charter panel appear (hence getAllByText) — before
    // the fix neither existed for element_type 'objective'.
    expect(screen.getByRole('button', { name: 'Charter' })).toBeTruthy();
    expect(screen.getAllByText('Charter').length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: 'Author charter' })).toBeTruthy();
  });

  it('exposes Governance so a decision can be recorded against the objective', () => {
    renderPage();
    expect(screen.getByText('Governance')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Record Decision/ }).length).toBeGreaterThan(0);
  });

  it('exposes Project Card linking scoped to the objective’s Theme', () => {
    renderPage();
    expect(screen.getByText('Linked Project Cards')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Link Project Card/ }).length).toBeGreaterThan(0);
  });

  it('shows no linked cards until one is linked, and counts the edge not the Theme roll-up', () => {
    // CARD sits in the parent Theme but has objective_element_id = null, so it is
    // linkable but NOT yet linked. A Theme roll-up would wrongly show it as linked.
    renderPage();
    expect(panelCount('Linked Project Cards')).toBe('0');
  });

  it('History remains visible on an objective', () => {
    renderPage();
    expect(screen.getByText('History')).toBeTruthy();
  });
});
