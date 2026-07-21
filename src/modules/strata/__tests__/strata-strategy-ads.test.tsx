/**
 * STRATA Strategy Room — ADS compliance remediation (CAT-STRATA-STRATEGY-ADS-20260720-001).
 *
 * Page-local guards for the five in-scope Design Intelligence findings. Renders the REAL
 * StrataStrategyRoomPage against mocked data hooks so assertions run through the actual
 * markup, not a stand-in:
 *   DI-01  readiness labels + badges are authored sentence case (WP-A)
 *   DI-07  TypeChip gap is an ADS token, never 5px (WP-B)
 *   DI-06  inspector no-selection is a compact ADS EmptyState with no invented CTA (WP-C)
 *   DI-08  page-local containment reduced (readiness band not raised; rail border removed) (WP-D)
 *   DI-03  view switcher is @atlaskit/tabs; Map is a sibling button, not a tab (WP-E)
 *
 * NOT covered here (by design): DI-02 (lozenge casing — blocked on decision D1) and the
 * DEFERRED shared-component findings DI-04 / DI-05.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes } from '@/lib/routes';

const H = vi.hoisted(() => ({ navigate: vi.fn() }));

const THEME = {
  id: 'theme-1', slug: 'growth-theme', name: 'Growth Theme',
  element_type: 'theme', context: 'theme', status: 'active',
  parent_id: null, perspective_id: null, order_index: 0, owner_id: null, description: null,
};
const OBJECTIVE = {
  id: 'obj-1', slug: 'increase-arr', name: 'Increase ARR',
  element_type: 'objective', context: 'theme', status: 'draft',
  parent_id: 'theme-1', perspective_id: null, order_index: 0, owner_id: null, description: null,
};

const q = <T,>(data: T) => ({ data, isLoading: false, isError: false, error: null, refetch: vi.fn() });

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => H.navigate,
}));

// Partial mock — non-hook exports keep their real implementations; only the data hooks
// the page reads are stubbed. Empty element-KPI links keeps the achievement useQueries
// array empty (no network), so the QueryClientProvider below is enough.
vi.mock('@/modules/strata/hooks/useStrata', async (orig) => ({
  ...(await orig<typeof import('@/modules/strata/hooks/useStrata')>()),
  useStrataContext: () => ({
    cycles: [{ id: 'cyc-1', name: 'FY26 C1', status: 'active' }],
    periods: [],
    activeCycle: { id: 'cyc-1', name: 'FY26 C1' },
    activePeriod: null,
    isLoading: false,
    setActiveCycleId: vi.fn(),
    setActivePeriodId: vi.fn(),
  }),
  useStrategyElements: () => q([THEME, OBJECTIVE]),
  useThemeCharters: () => q([]),
  useElementKpis: () => q([]),
  useKpis: () => q([]),
  usePerspectives: () => q([]),
  useProfileNames: () => q(new Map()),
  useGateModels: () => q([]),
  useStrataRoles: () => q(['strategy_office']),
  useProjectCards: () => q([]),
  useBenefitProjectCards: () => q([]),
  useBenefits: () => q([]),
  useInvalidateStrata: () => vi.fn(),
  useBandResolver: () => () => null,
  useEffectiveFrameworkMemberIds: () => [],
}));

// eslint-disable-next-line import/first
import StrataStrategyRoomPage from '@/modules/strata/pages/StrataStrategyRoomPage';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/strata/strategy']}>
        <StrataStrategyRoomPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // ≥1280 so the inspector renders as the sticky rail (not the <1280 overlay drawer).
  (window as unknown as { innerWidth: number }).innerWidth = 1440;
});

describe('DI-01 — readiness labels and badges are sentence case (WP-A)', () => {
  it('renders sentence-case tile labels, never the authored ALL CAPS', () => {
    renderPage();
    expect(screen.getByText('Objectives with measures')).toBeTruthy();
    expect(screen.getByText('Objectives with owners')).toBeTruthy();
    expect(screen.getByText('Execution coverage')).toBeTruthy();
    expect(screen.getByText('Draft elements')).toBeTruthy();
    expect(screen.queryByText('OBJECTIVES WITH MEASURES')).toBeNull();
    expect(screen.queryByText('EXECUTION COVERAGE')).toBeNull();
    expect(screen.queryByText('DRAFT ELEMENTS')).toBeNull();
  });

  it('renders sentence-case gap and draft badges', () => {
    renderPage();
    // one objective, no measure/owner/execution → each coverage tile shows "1 gap"
    expect(screen.getAllByText('1 gap').length).toBeGreaterThan(0);
    expect(screen.queryByText(/\bGAP(S)?\b/)).toBeNull();
    // draft tile badge is the sentence-case word
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
    expect(screen.queryByText('DRAFT')).toBeNull();
  });
});

describe('DI-07 — TypeChip spacing is an ADS token, not 5px (WP-B)', () => {
  it('uses var(--ds-space-050) and no element carries gap:5px', () => {
    const { container } = renderPage();
    expect(container.querySelector('[style*="var(--ds-space-050)"]')).toBeTruthy();
    expect(container.querySelector('[style*="gap: 5px"]')).toBeNull();
  });
});

describe('DI-06 — inspector no-selection is a compact ADS EmptyState, no CTA (WP-C)', () => {
  it('shows the EmptyState in the desktop rail with no action button', () => {
    const { container } = renderPage();
    expect(screen.getByText('No element selected')).toBeTruthy();
    const rail = container.querySelector('[data-testid="strata-inspector-rail"]') as HTMLElement;
    expect(rail).toBeTruthy();
    // no invented primary action — D3
    expect(within(rail).queryByRole('button')).toBeNull();
  });
});

describe('DI-08 — page-local containment reduced (WP-D)', () => {
  it('readiness band is no longer a raised card but keeps its border', () => {
    const { container } = renderPage();
    const band = container.querySelector('[data-testid="strata-direction-readiness"]') as HTMLElement;
    const style = band.getAttribute('style') ?? '';
    // WP-D: no longer a raised card (background removed); framing structure retained.
    // (border shorthand with a var() is not reliably serialized by jsdom, so assert
    //  the retained border-radius rather than the border color string.)
    expect(style).not.toContain('var(--ds-surface-raised)');
    expect(style).toContain('border-radius');
  });

  it('inspector rail keeps its raised shadow but drops the redundant border', () => {
    const { container } = renderPage();
    const rail = container.querySelector('[data-testid="strata-inspector-rail"]') as HTMLElement;
    const style = rail.getAttribute('style') ?? '';
    expect(style).toContain('var(--ds-shadow-raised)');
    expect(style).not.toContain('1px solid var(--ds-border)');
  });
});

describe('DI-03 — canonical @atlaskit/tabs switcher; Map is not a tab (WP-E)', () => {
  it('renders exactly two tabs (Structure, Narrative) inside a named group', () => {
    const { container } = renderPage();
    const group = container.querySelector('[role="group"][aria-label="Strategy Room view"]') as HTMLElement;
    expect(group).toBeTruthy();
    const tablist = within(group).getByRole('tablist');
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Structure', 'Narrative']);
    // Map is a sibling button, NOT part of the tab set
    expect(within(group).queryByRole('tab', { name: 'Map' })).toBeNull();
    const mapText = within(group).getByText('Map');
    expect(mapText.closest('button')).toBeTruthy();
    expect(mapText.closest('[role="tablist"]')).toBeNull();
  });

  it('switching to the Narrative tab renders the narrative view', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('tab', { name: 'Narrative' }));
    await waitFor(() => expect(screen.getByText(/spans 1 objective/)).toBeTruthy());
  });

  it('the Map action navigates to the protected map route', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    const group = container.querySelector('[role="group"][aria-label="Strategy Room view"]') as HTMLElement;
    await user.click(within(group).getByText('Map'));
    expect(H.navigate).toHaveBeenCalledWith(Routes.strata.strategyMap());
  });
});
