/**
 * Theme measurement-method mutual exclusivity — CAT-STRATA-THEMEMETHOD-20260720-001.
 *
 * A Strategic Theme uses EITHER Objectives & KPIs OR Theme-owned OKRs, never both.
 * These render the REAL create/edit modals and the REAL detail page against mocked
 * hooks/domain, so the assertions run through the actual gating (which is also
 * re-enforced server-side — see the SQL negative-path proofs in 06_VALIDATION_EVIDENCE).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });
const { createElement } = vi.hoisted(() => ({ createElement: vi.fn() }));

vi.mock('@/modules/strata/domain', async (orig) => {
  const actual = await orig<typeof import('@/modules/strata/domain')>();
  return { ...actual, strategyApi: { ...actual.strategyApi, createElement } };
});

// ── Modal tests (NewElementModal / EditElementModal) ─────────────────────────
import { NewElementModal, EditElementModal } from '@/modules/strata/components/authoring';

const themeEl = {
  id: 'theme-1', slug: 'th', name: 'Theme A', element_type: 'theme', context: 'theme',
  status: 'active', stage: 'active', cycle_id: 'cyc-1', parent_id: null, perspective_id: null,
  order_index: 0, description: null, owner_id: null, map_position: null, measurement_method: 'okrs',
} as const;
const objectiveEl = { ...themeEl, id: 'obj-1', element_type: 'objective', parent_id: 'theme-1', measurement_method: null } as const;

beforeEach(() => { createElement.mockReset().mockResolvedValue('new-id'); });

describe('NewElementModal — Theme creation requires a measurement method', () => {
  const renderNew = () => render(
    <NewElementModal cycleId="cyc-1" cycleName="FY26" themeOptions={[]} perspectiveOptions={[]}
      onClose={() => {}} onCreated={() => {}} lockElementType="theme" />,
  );

  it('exposes a Measurement method field for a Theme', () => {
    renderNew();
    expect(screen.getByLabelText('Measurement method')).toBeTruthy();
  });

  it('blocks submit and does NOT call createElement when no method is chosen', () => {
    renderNew();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'My Theme' } });
    fireEvent.click(screen.getByRole('button', { name: /Create element/ }));
    expect(screen.getByText(/Required: Measurement method/)).toBeTruthy();
    expect(createElement).not.toHaveBeenCalled();
  });

  it('does NOT show a measurement-method field when creating an Objective', () => {
    render(
      <NewElementModal cycleId="cyc-1" cycleName="FY26" themeOptions={[{ value: 'theme-1', label: 'Theme A' }]}
        perspectiveOptions={[]} onClose={() => {}} onCreated={() => {}} lockElementType="objective" lockParentId="theme-1" />,
    );
    expect(screen.queryByLabelText('Measurement method')).toBeNull();
  });
});

describe('EditElementModal — Theme Edit exposes the method; Objective does not', () => {
  it('shows the Measurement method field for a Theme', () => {
    render(<EditElementModal element={themeEl as never} perspectiveOptions={[]} parentOptions={[]} onClose={() => {}} onSaved={() => {}} />);
    expect(screen.getByText('Measurement method')).toBeTruthy();
  });
  it('omits the Measurement method field for an Objective', () => {
    render(<EditElementModal element={objectiveEl as never} perspectiveOptions={[]} parentOptions={[]} onClose={() => {}} onSaved={() => {}} />);
    expect(screen.queryByText('Measurement method')).toBeNull();
  });
});

// ── Detail-page gating (Add Objective vs Add OKR) ────────────────────────────
let detailEl: Record<string, unknown> = {};
vi.mock('@/modules/strata/hooks/useStrata', async (orig) => ({
  ...(await orig<typeof import('@/modules/strata/hooks/useStrata')>()),
  useStrategyElementBySlug: () => q(detailEl),
  useStrategyElements: () => q([detailEl]),
  useMapEdges: () => q([]), useThemeCharters: () => q([]), useElementKpis: () => q([]),
  useKpis: () => q([]), usePerspectives: () => q([]), useGateModels: () => q([]),
  useOkrs: () => q([]), useProjectCards: () => q([]), useDecisions: () => q([]), useActions: () => q([]),
  useStrataRoles: () => q(['strategy_office']), useStrataAudit: () => q([]),
  useBenefitProjectCards: () => q([]), useBenefits: () => q([]), useProfileNames: () => q(new Map()),
  useInvalidateStrata: () => vi.fn(), useBandResolver: () => () => null,
  useStrataContext: () => ({ cycles: [{ id: 'cyc-1', name: 'FY26', status: 'active' }], periods: [], activeCycle: { id: 'cyc-1', name: 'FY26' }, activePeriod: null }),
  useKeyResults: () => q([]), useCalcValues: () => q([]),
}));
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ slug: 'th' }), useNavigate: () => vi.fn(),
}));

import StrataStrategyElementDetailPage from '@/modules/strata/pages/StrataStrategyElementDetailPage';
const THEME = (method: string | null) => ({
  id: 'theme-1', slug: 'th', name: 'Theme A', element_type: 'theme', context: 'theme',
  status: 'active', stage: 'active', cycle_id: 'cyc-1', parent_id: null, perspective_id: null,
  order_index: 0, description: null, owner_id: null, map_position: null, measurement_method: method,
});
const renderDetail = () => render(<MemoryRouter><StrataStrategyElementDetailPage /></MemoryRouter>);

describe('Detail page — creation actions gated by measurement method', () => {
  it('OKRs Theme shows Add OKR and HIDES Add Objective', () => {
    detailEl = THEME('okrs');
    renderDetail();
    expect(screen.getByTestId('strata-add-okr')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add Objective/ })).toBeNull();
  });

  it('Objectives & KPIs Theme shows Add Objective and HIDES Add OKR', () => {
    detailEl = THEME('objectives_kpis');
    renderDetail();
    expect(screen.getAllByRole('button', { name: /Add Objective/ }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('strata-add-okr')).toBeNull();
  });

  it('Unclassified (both-conflict, null method) Theme hides BOTH creation actions + shows the resolution banner', () => {
    detailEl = THEME(null);
    renderDetail();
    expect(screen.queryByTestId('strata-add-okr')).toBeNull();
    expect(screen.queryByRole('button', { name: /Add Objective/ })).toBeNull();
    expect(screen.getByTestId('strata-method-conflict-banner')).toBeTruthy();
    expect(screen.getByText('Measurement method requires resolution')).toBeTruthy();
    expect(screen.getByTestId('strata-resolve-method')).toBeTruthy();
  });

  it('shows the measurement-method indicator with the method label', () => {
    detailEl = THEME('okrs');
    renderDetail();
    const badge = screen.getByTestId('strata-theme-measurement-method');
    expect(badge.textContent).toContain('OKRs');
  });
});
